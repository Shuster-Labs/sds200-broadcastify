'use strict';

const http = require('http');
const fs   = require('fs');
const log  = require('./logger');
const HTML = require('./web-html');

class WebServer {
  constructor({ cfg, scanner, stream, metadata, configPath, port }) {
    this.cfg        = cfg;
    this.scanner    = scanner;
    this.stream     = stream;
    this.metadata   = metadata;
    this.configPath = configPath;
    this.port       = port || cfg.web?.port || 3000;
    this.server     = null;
    this.startedAt  = Date.now();
  }

  start() {
    this.server = http.createServer((req, res) => {
      try { this._handle(req, res); } catch (e) {
        log.error(`Web handler error: ${e.message}`);
        if (!res.headersSent) { res.writeHead(500); res.end('Internal error'); }
      }
    });
    this.server.listen(this.port, '0.0.0.0', () => {
      log.info(`Web UI listening on http://0.0.0.0:${this.port}`);
    });
    this.server.on('error', (err) => log.error(`Web server: ${err.message}`));
  }

  stop() {
    if (this.server) { this.server.close(); this.server = null; }
  }

  _handle(req, res) {
    const url = req.url.split('?')[0];
    if (url === '/' || url === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(HTML);
    }
    if (url === '/api/status' && req.method === 'GET')        return this._status(res);
    if (url === '/api/config' && req.method === 'GET')        return this._configGet(res);
    if (url === '/api/config' && req.method === 'POST')       return this._configPost(req, res);
    if (url === '/api/stream/stop'  && req.method === 'POST') return this._streamStop(res);
    if (url === '/api/stream/start' && req.method === 'POST') return this._streamStart(res);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }

  _json(res, data, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  _streamStop(res) {
    this.stream.stop();
    this._streamEnabled = false;
    log.info('Stream stopped via web UI');
    this._json(res, { ok: true });
  }

  _streamStart(res) {
    this._streamEnabled = true;
    this.stream.resetReconnectDelay();
    this.stream.start();
    log.info('Stream started via web UI');
    this._json(res, { ok: true });
  }

  _status(res) {
    const sec = Math.floor((Date.now() - this.startedAt) / 1000);
    const h   = Math.floor(sec / 3600);
    const m   = Math.floor((sec % 3600) / 60);
    const s   = sec % 60;
    const uptime = h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
    this._json(res, {
      ffmpegRunning:    this.stream.process !== null,
      streamEnabled:    this._streamEnabled !== false,
      scannerConnected: this.scanner.connected,
      currentTitle:     this.metadata.lastTitle || null,
      uptime,
    });
  }

  _configGet(res) {
    const { scanner: sc, icecast: ic } = this.cfg;
    this._json(res, {
      scannerIp:       sc.ip,
      icecastServer:   ic.server,
      icecastPort:     ic.port,
      icecastMount:    ic.mount,
      icecastPassword: ic.password,
      feedName:        ic.name        || '',
      feedDescription: ic.description || '',
    });
  }

  _configPost(req, res) {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      let data;
      try { data = JSON.parse(body); } catch (_) {
        return this._json(res, { ok: false, error: 'Invalid JSON' }, 400);
      }

      let current;
      try { current = JSON.parse(fs.readFileSync(this.configPath, 'utf8')); } catch (e) {
        return this._json(res, { ok: false, error: `Cannot read config: ${e.message}` }, 500);
      }

      const ifSet = (val, fb) => (val !== undefined && val !== '') ? val : fb;
      current.scanner.ip       = ifSet(data.scannerIp,       current.scanner.ip);
      current.icecast.server   = ifSet(data.icecastServer,   current.icecast.server);
      current.icecast.mount    = ifSet(data.icecastMount,    current.icecast.mount);
      current.icecast.password = ifSet(data.icecastPassword, current.icecast.password);
      if (data.icecastPort)                  current.icecast.port        = data.icecastPort;
      if (data.feedName        !== undefined) current.icecast.name        = data.feedName;
      if (data.feedDescription !== undefined) current.icecast.description = data.feedDescription;

      try {
        fs.writeFileSync(this.configPath, JSON.stringify(current, null, 2) + '\n', 'utf8');
      } catch (e) {
        return this._json(res, { ok: false, error: `Cannot write config: ${e.message}` }, 500);
      }

      // Apply changes to in-memory config so stream.js picks them up immediately
      Object.assign(this.cfg.scanner, { ip: current.scanner.ip });
      Object.assign(this.cfg.icecast, current.icecast);

      log.info('Config updated via web UI');
      this._json(res, { ok: true });

      if (data.restart) {
        log.info('Graceful stream restart requested via web UI — 15s cooldown before reconnect');
        this.stream.stop();
        setTimeout(() => {
          this.stream.resetReconnectDelay();
          this.stream.start();
        }, 15000);
      }
    });
  }
}

module.exports = WebServer;
