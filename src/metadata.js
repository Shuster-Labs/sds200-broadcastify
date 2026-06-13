'use strict';

const http = require('http');
const https = require('https');
const log = require('./logger');

// Format stream title from GSI status object.
// Tokens: {talkgroup}, {talkgroupName}, {system}, {department}, {frequency}, {p25status}, {viewText}, {mode}
// {talkgroupName} = TGID Name attribute from scanner programming; falls back to numeric ID
function formatTitle(template, status) {
  if (!status) return null;
  if (!status.talkgroup) return null; // no active talkgroup → caller uses idleTitle

  // talkgroupName comes from the <TGID Name="..."> attribute (programmed name)
  // Fall back to numeric ID if name is absent
  const talkgroupName = status.talkgroupName || status.talkgroup;

  let title = template
    .replace('{talkgroupName}', talkgroupName)
    .replace('{talkgroup}',     status.talkgroup     || '')
    .replace('{system}',        status.system        || '')
    .replace('{department}',    status.department    || '')
    .replace('{frequency}',     status.frequency     || '')
    .replace('{p25status}',     status.p25status     || '')
    .replace('{viewText}',      status.viewText      || '')
    .replace('{mode}',          status.mode          || '');

  // Collapse empty segments separated by " | "
  title = title
    .split(' | ')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' | ');

  return title || null;
}

// Update stream title on Icecast via HTTP admin API.
// Standard Icecast endpoint: GET /admin/metadata?mount=<mount>&mode=updinfo&song=<title>
// Auth: Basic source:<password>
function updateIcecastTitle(cfg, title) {
  return new Promise((resolve, reject) => {
    const mount = cfg.icecast.mount.startsWith('/') ? cfg.icecast.mount : '/' + cfg.icecast.mount;
    const query = `mount=${encodeURIComponent(mount)}&mode=updinfo&song=${encodeURIComponent(title)}`;
    const path  = `/admin/metadata?${query}`;
    const auth  = Buffer.from(`source:${cfg.icecast.password}`).toString('base64');

    const options = {
      hostname: cfg.icecast.server,
      port:     cfg.icecast.port,
      path,
      method:   'GET',
      headers:  { Authorization: `Basic ${auth}` },
      timeout:  5000,
    };

    const lib = cfg.icecast.port === 443 ? https : http;
    const req = lib.request(options, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`Icecast metadata HTTP ${res.statusCode}: ${body.trim()}`));
        }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Icecast metadata request timed out')); });
    req.on('error', reject);
    req.end();
  });
}

class MetadataPoller {
  constructor(cfg, scanner) {
    this.cfg          = cfg;
    this.scanner      = scanner;
    this.pollInterval = cfg.metadata.pollIntervalMs;
    this.titleFormat  = cfg.metadata.titleFormat;
    this.idleTitle    = cfg.metadata.idleTitle;
    this.timer        = null;
    this.lastTitle    = null;
    this.running      = false;
    this.failures     = 0;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._poll();
  }

  stop() {
    this.running = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  }

  _poll() {
    if (!this.running) return;

    if (!this.scanner.connected) {
      this.timer = setTimeout(() => this._poll(), this.pollInterval);
      return;
    }

    this.scanner.getStatusCb((err, status) => {
      if (!this.running) return;

      let title = this.idleTitle;
      if (!err && status) {
        const formatted = formatTitle(this.titleFormat, status);
        if (formatted) title = formatted;
      }

      if (title !== this.lastTitle) {
        log.info(`Metadata: ${title}`);
        updateIcecastTitle(this.cfg, title)
          .then(() => { this.lastTitle = title; this.failures = 0; })
          .catch((e) => {
            this.failures++;
            if (this.failures <= 3 || this.failures % 20 === 0) {
              log.warn(`Metadata update failed (${this.failures}x): ${e.message}`);
            }
          });
      }

      this.timer = setTimeout(() => this._poll(), this.pollInterval);
    });
  }
}

module.exports = { MetadataPoller, formatTitle, updateIcecastTitle };
