'use strict';

// Standalone web dashboard — runs as a separate process/service.
// Checks stream health via pgrep + direct scanner UDP; never touches the stream.

const http  = require('http');
const dgram = require('dgram');
const cp    = require('child_process');
const fs    = require('fs');
const path  = require('path');

const CONFIG_PATH = process.env.CONFIG_PATH || path.join(process.cwd(), 'config.json');
const PORT        = parseInt(process.env.WEB_PORT || '3000', 10);
const startedAt   = Date.now();

// ── Helpers ──────────────────────────────────────────────────────────────────

function readCfg() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function ffmpegRunning() {
  try { cp.execSync('pgrep -x ffmpeg', { stdio: 'ignore' }); return true; }
  catch (_) { return false; }
}

function xmlAttr(xml, tag, attr) {
  const tm = xml.match(new RegExp('<' + tag + '[^>]+>|<' + tag + '[^/]*/>'));
  if (!tm) return '';
  const am = tm[0].match(new RegExp(attr + '="([^"]*)"'));
  return am ? am[1].trim() : '';
}

function queryScannerGSI(ip, port) {
  return new Promise((resolve) => {
    const sock = dgram.createSocket('udp4');
    let buf = '', done = false;

    const fin = (result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { sock.close(); } catch (_) {}
      resolve(result);
    };

    const timer = setTimeout(() => fin(null), 2500);
    sock.on('error', () => fin(null));

    sock.on('message', (data) => {
      buf += data.toString('ascii');
      if (!buf.includes('</ScannerInfo>')) return;
      const xi = buf.indexOf('<?xml');
      if (xi === -1) return fin(null);
      const xml      = buf.substring(xi);
      const rawTgid  = xmlAttr(xml, 'TGID', 'TGID').replace(/^TGID:\s*/i, '').trim();
      const talkgroup = (rawTgid === '---' || rawTgid === '') ? '' : rawTgid;
      const name      = xmlAttr(xml, 'TGID', 'Name');
      fin({ connected: true, title: name || talkgroup || null });
    });

    sock.bind(0, () => {
      const cmd = Buffer.from('GSI\r\n', 'ascii');
      sock.send(cmd, 0, cmd.length, port, ip, (err) => { if (err) fin(null); });
    });
  });
}

function fmtUptime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0 ? `${h}h ${m}m ${r}s` : m > 0 ? `${m}m ${r}s` : `${r}s`;
}

// ── HTTP server ──────────────────────────────────────────────────────────────

const HTML = require('./web-html');

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  try {
    if ((url === '/' || url === '/index.html') && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(HTML);
    }

    if (url === '/api/status' && req.method === 'GET') {
      let cfg;
      try { cfg = readCfg(); } catch (_) { cfg = { scanner: { ip: '127.0.0.1', commandPort: 50536 } }; }
      const gsi = await queryScannerGSI(cfg.scanner.ip, cfg.scanner.commandPort || 50536);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        ffmpegRunning:    ffmpegRunning(),
        scannerConnected: !!(gsi && gsi.connected),
        currentTitle:     gsi ? gsi.title : null,
        uptime:           fmtUptime(Date.now() - startedAt),
      }));
    }

    if (url === '/api/config' && req.method === 'GET') {
      const cfg = readCfg();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        scannerIp:       cfg.scanner?.ip           || '',
        icecastServer:   cfg.icecast?.server       || '',
        icecastPort:     cfg.icecast?.port         || 80,
        icecastMount:    cfg.icecast?.mount        || '',
        icecastPassword: cfg.icecast?.password     || '',
        feedName:        cfg.icecast?.name         || '',
        feedDescription: cfg.icecast?.description  || '',
      }));
    }

    if (url === '/api/config' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        let data;
        try { data = JSON.parse(body); } catch (_) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }));
        }

        let current;
        try { current = readCfg(); } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: 'Cannot read config: ' + e.message }));
        }

        const ifSet = (v, fb) => (v !== undefined && v !== '') ? v : fb;
        current.scanner.ip       = ifSet(data.scannerIp,       current.scanner.ip);
        current.icecast.server   = ifSet(data.icecastServer,   current.icecast.server);
        current.icecast.mount    = ifSet(data.icecastMount,    current.icecast.mount);
        current.icecast.password = ifSet(data.icecastPassword, current.icecast.password);
        if (data.icecastPort)                  current.icecast.port        = data.icecastPort;
        if (data.feedName        !== undefined) current.icecast.name        = data.feedName;
        if (data.feedDescription !== undefined) current.icecast.description = data.feedDescription;

        try {
          fs.writeFileSync(CONFIG_PATH, JSON.stringify(current, null, 2) + '\n', 'utf8');
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: 'Cannot write config: ' + e.message }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));

        if (data.restart) {
          setTimeout(() => {
            try { cp.execSync('systemctl restart sds200-stream', { stdio: 'ignore' }); } catch (_) {}
          }, 500);
        }
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');

  } catch (e) {
    if (!res.headersSent) { res.writeHead(500); res.end('Server error'); }
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[sds200-web] Dashboard at http://0.0.0.0:${PORT}`);
});
server.on('error', (e) => console.error(`[sds200-web] ${e.message}`));
