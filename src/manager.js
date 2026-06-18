'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');
const HTML = require('./manager-html');

const SCANNERS_PATH = process.env.SCANNERS_PATH || path.join(process.cwd(), 'config', 'scanners.json');
const PORT = parseInt(process.env.MANAGER_PORT || '3000', 10);

function loadScanners() {
  const raw = fs.readFileSync(SCANNERS_PATH, 'utf8');
  return JSON.parse(raw).scanners || [];
}

function fetchJson(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 3000 }, (res) => {
      let body = '';
      res.on('data', d => { body += d; });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve(null); } });
    });
    req.on('error',   () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

function proxyPost(url, data) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(data);
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port:     parseInt(u.port || '80', 10),
      path:     u.pathname + (u.search || ''),
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      timeout:  8000,
    };
    const req = http.request(opts, (res) => {
      let b = '';
      res.on('data', d => { b += d; });
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch { resolve(null); } });
    });
    req.on('error',   () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.write(payload);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];

  function json(data, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  // Dashboard
  if ((url === '/' || url === '/index.html') && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(HTML);
  }

  // GET /api/scanners — aggregate status from all scanner services
  if (url === '/api/scanners' && req.method === 'GET') {
    let scanners;
    try { scanners = loadScanners(); } catch { return json([]); }
    const results = await Promise.all(scanners.map(async (s) => {
      const status = await fetchJson(s.apiUrl + '/api/status');
      return Object.assign({ id: s.id, name: s.name, apiUrl: s.apiUrl },
        status || { ffmpegRunning: false, scannerConnected: false, currentTitle: null, uptime: null, offline: true });
    }));
    return json(results);
  }

  // /api/scanner/:id/config  GET or POST
  const cfgMatch  = url.match(/^\/api\/scanner\/([^/]+)\/config$/);
  if (cfgMatch) {
    let scanners;
    try { scanners = loadScanners(); } catch { return json({ error: 'Cannot read scanners config' }, 500); }
    const s = scanners.find(x => x.id === cfgMatch[1]);
    if (!s) return json({ error: 'Scanner not found' }, 404);

    if (req.method === 'GET') {
      const cfg = await fetchJson(s.apiUrl + '/api/config');
      return json(cfg || { error: 'Scanner service offline' });
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', c => { body += c; });
      req.on('end', async () => {
        let data;
        try { data = JSON.parse(body); } catch { return json({ error: 'Invalid JSON' }, 400); }
        const result = await proxyPost(s.apiUrl + '/api/config', data);
        json(result || { error: 'Scanner service offline' });
      });
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.on('error', (err) => console.error('[Manager] Server error:', err.message));

server.listen(PORT, '0.0.0.0', () => {
  console.log('[Manager] Dashboard listening on http://0.0.0.0:' + PORT);
  try {
    const scanners = loadScanners();
    console.log('[Manager] Configured scanners:', scanners.map(s => s.name).join(', ') || '(none)');
  } catch (e) {
    console.warn('[Manager] Could not load scanners.json:', e.message);
  }
});
