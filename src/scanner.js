'use strict';

// SDS200 Remote Command Protocol
// Transport: UDP, port 50536
// Commands: plain ASCII + \r\n
// GSI response: two UDP packets —
//   Packet 1: "GSI,<XML>,\r\n"
//   Packet 2: <?xml ...><ScannerInfo ...>...</ScannerInfo>
// GLG response: single UDP packet (empty fields when scanner is between transmissions)
// MDL/VER: single UDP packet

const dgram = require('dgram');
const EventEmitter = require('events');
const log = require('./logger');

// Parse XML attribute: <Tag Attr="value" ...>
function xmlAttr(xml, tag, attr) {
  const tagRe = new RegExp(`<${tag}[^>]+>|<${tag}[^/]*/>`);
  const m = xml.match(tagRe);
  if (!m) return '';
  const attrRe = new RegExp(`${attr}="([^"]*)"`);
  const am = m[0].match(attrRe);
  return am ? am[1].trim() : '';
}

function parseGSI(xml) {
  // Extract fields from ScannerInfo XML
  const mode      = xmlAttr(xml, 'ScannerInfo', 'Mode');
  const system    = xmlAttr(xml, 'System', 'Name');
  const dept      = xmlAttr(xml, 'Department', 'Name'); // absent when scanning
  const rawTgid   = xmlAttr(xml, 'TGID', 'TGID');       // "TGID: ---" or "TGID: 1234" or "Dispatch"
  const freqRaw   = xmlAttr(xml, 'SiteFrequency', 'Freq'); // " 769.268750MHz"
  const p25status = xmlAttr(xml, 'Property', 'P25Status'); // "Data" | "Voice"
  const viewText  = xmlAttr(xml, 'OverWrite', 'Text');     // "ID Scanning..." or talkgroup desc

  // Normalize talkgroup: strip "TGID: " or "TGID:" prefix, treat "---" as empty
  let talkgroup = rawTgid.replace(/^TGID:\s*/i, '').trim();
  if (talkgroup === '---' || talkgroup === '') talkgroup = '';

  // Talkgroup name: the Name attribute on the TGID element (e.g. "WOREMS 5 S")
  const talkgroupName = xmlAttr(xml, 'TGID', 'Name');

  // Normalize frequency: strip trailing "MHz", leading space
  const frequency = freqRaw.replace(/MHz$/i, '').trim();

  return { mode, system, department: dept, talkgroup, talkgroupName, frequency, p25status, viewText };
}

class Scanner extends EventEmitter {
  constructor(config) {
    super();
    this.ip       = config.scanner.ip;
    this.port     = config.scanner.commandPort;
    this.socket   = null;
    this.connected = false;
    this.destroyed = false;

    // Pending command: { buffer, timer, resolve, reject, complete }
    this._pending = null;
    this._connectTimer = null;
  }

  connect() {
    if (this.destroyed) return;
    this._openSocket();
  }

  _openSocket() {
    if (this.socket) {
      this.socket.removeAllListeners();
      try { this.socket.close(); } catch (_) {}
    }

    const sock = dgram.createSocket('udp4');
    this.socket = sock;

    sock.on('error', (err) => {
      log.error(`Scanner UDP error: ${err.message}`);
      this._scheduleReopen();
    });

    sock.on('close', () => {
      if (!this.destroyed) {
        this.connected = false;
        this.emit('disconnected');
        this._scheduleReopen();
      }
    });

    sock.on('message', (data) => {
      this._handlePacket(data.toString('ascii'));
    });

    sock.bind(0, () => {
      this.connected = true;
      log.info(`Scanner UDP ready → ${this.ip}:${this.port}`);
      this.emit('connected');
    });
  }

  _scheduleReopen() {
    if (this.destroyed || this._connectTimer) return;
    this._connectTimer = setTimeout(() => {
      this._connectTimer = null;
      this._openSocket();
    }, 5000);
  }

  destroy() {
    this.destroyed = true;
    if (this._connectTimer) clearTimeout(this._connectTimer);
    if (this._pending?.timer) clearTimeout(this._pending.timer);
    if (this.socket) try { this.socket.close(); } catch (_) {}
  }

  // --- Low-level send ---

  _send(cmd) {
    if (!this.socket || !this.connected) return false;
    const buf = Buffer.from(cmd + '\r\n', 'ascii');
    this.socket.send(buf, 0, buf.length, this.port, this.ip, (err) => {
      if (err) log.debug(`Scanner send error: ${err.message}`);
    });
    return true;
  }

  // --- Packet handling ---

  _handlePacket(text) {
    log.debug(`Scanner RX: ${text.substring(0, 120).trim()}`);
    if (!this._pending) return;

    const p = this._pending;
    p.buffer += text;

    if (p.complete(p.buffer)) {
      clearTimeout(p.timer);
      this._pending = null;
      p.resolve(p.buffer);
    }
  }

  // --- Command execution ---

  // Returns a Promise that resolves with the raw response string.
  // complete(buf): function that returns true when the buffer is a full response.
  _command(cmd, complete, timeoutMs = 3000) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        return reject(new Error('Scanner not connected'));
      }

      // Drain any stale pending
      if (this._pending) {
        clearTimeout(this._pending.timer);
        this._pending.reject(new Error('superseded'));
        this._pending = null;
      }

      const timer = setTimeout(() => {
        if (this._pending?.resolve === resolve) {
          this._pending = null;
          reject(new Error(`${cmd} timeout`));
        }
      }, timeoutMs);

      this._pending = { buffer: '', timer, resolve, reject, complete };
      this._send(cmd);
    });
  }

  // --- High-level commands ---

  async getModel() {
    const res = await this._command('MDL', (b) => b.includes('MDL,'));
    return res.split(',')[1]?.trim() || '';
  }

  async getVersion() {
    const res = await this._command('VER', (b) => b.includes('VER,'));
    return res.split(',')[1]?.trim() || '';
  }

  // Returns a status object parsed from GSI XML.
  // { mode, system, department, talkgroup, frequency, p25status, viewText }
  async getStatus() {
    // GSI complete when XML closing tag received
    const res = await this._command('GSI', (b) => b.includes('</ScannerInfo>'), 5000);
    // Find the XML portion (starts after "GSI,<XML>,")
    const xmlStart = res.indexOf('<?xml');
    if (xmlStart === -1) return null;
    return parseGSI(res.substring(xmlStart));
  }

  // Convenience: get status with a callback (for MetadataPoller compatibility)
  getStatusCb(callback) {
    this.getStatus()
      .then((s) => callback(null, s))
      .catch((e) => callback(e, null));
  }

  sendRestart(command) {
    log.warn(`Watchdog: sending restart command: ${command}`);
    this._send(command);
  }
}

module.exports = Scanner;
