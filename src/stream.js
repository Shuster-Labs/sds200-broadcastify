'use strict';

const { spawn } = require('child_process');
const EventEmitter = require('events');
const log = require('./logger');

// FFmpeg stderr patterns for silence detection
const SILENCE_START_RE = /\[silencedetect[^\]]*\] silence_start: ([\d.]+)/;
const SILENCE_END_RE   = /\[silencedetect[^\]]*\] silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/;

class StreamManager extends EventEmitter {
  constructor(cfg) {
    super();
    this.cfg = cfg;
    this.process = null;
    this.running = false;
    this.reconnectTimer = null;
    this.reconnectDelay = 5000;
    this._rapidFailCount = 0;
    this.stderrBuffer = '';
  }

  get rtspUrl() {
    const s = this.cfg.scanner;
    // rtspUrl override points at MediaMTX proxy instead of the scanner directly.
    // MediaMTX handles the scanner's RTSP quirks (port-0 SDP, single TCP slot, etc.)
    return s.rtspUrl || `rtsp://${s.ip}:${s.rtspPort}${s.rtspPath}`;
  }

  get icecastUrl() {
    const ic = this.cfg.icecast;
    const mount = ic.mount.startsWith('/') ? ic.mount : '/' + ic.mount;
    return `icecast://source:${ic.password}@${ic.server}:${ic.port}${mount}`;
  }

  _buildArgs() {
    const cfg = this.cfg;
    const silenceDur = Math.max(1, Math.floor(cfg.watchdog.silenceTimeoutSeconds * 0.75));
    const noiseDb    = cfg.watchdog.silenceThresholdDb;

    return [
      '-rtsp_transport', 'tcp',
      '-probesize', '32',
      '-analyzeduration', '0',
      '-loglevel', 'verbose',
      '-timeout', '30000000',
      '-i', this.rtspUrl,
      '-af', `silencedetect=noise=${noiseDb}dB:duration=${silenceDur}`,
      '-c:a', 'libmp3lame',
      '-b:a', `${cfg.icecast.bitrate}k`,
      '-ar', String(cfg.icecast.sampleRate),
      '-ac', String(cfg.icecast.channels),
      '-content_type', 'audio/mpeg',
      '-ice_name', cfg.icecast.name || 'Scanner Feed',
      '-ice_description', cfg.icecast.description || '',
      '-ice_genre', cfg.icecast.genre || 'Scanner',
      '-f', 'mp3',
      '-legacy_icecast', '1',
      this.icecastUrl,
    ];
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._spawn();
  }

  stop() {
    this.running = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this._killProcess();
  }

  _spawn() {
    if (!this.running) return;

    const args = this._buildArgs();
    log.info(`FFmpeg: ffmpeg ${args.map((a) => (a.includes('@') ? '***' : a)).join(' ')}`);

    this.process = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    this.stderrBuffer = '';

    this.process.stderr.on('data', (data) => {
      this.stderrBuffer += data.toString();
      const lines = this.stderrBuffer.split('\n');
      this.stderrBuffer = lines.pop();
      for (const line of lines) this._handleStderr(line);
    });

    this.process.stdout.on('data', () => {}); // drain stdout

    this.process.on('error', (err) => {
      log.error(`FFmpeg spawn error: ${err.message}`);
    });

    const spawnedAt = Date.now();

    this.process.on('close', (code, signal) => {
      const runMs = Date.now() - spawnedAt;
      log.warn(`FFmpeg exited code=${code} signal=${signal} after ${(runMs / 1000).toFixed(1)}s`);
      this.process = null;

      if (runMs > 30000) {
        // Successful connection that dropped — reset to fast reconnect
        this._rapidFailCount = 0;
        this.reconnectDelay = 5000;
      } else {
        // Fast failure = Icecast rejected us; back off aggressively
        this._rapidFailCount++;
        if (this._rapidFailCount >= 3) {
          this.reconnectDelay = 300000; // 5 minutes
        } else if (this._rapidFailCount === 2) {
          this.reconnectDelay = 120000; // 2 minutes
        } else {
          this.reconnectDelay = 60000;  // 1 minute
        }
        log.warn(`Icecast rejection #${this._rapidFailCount} — next attempt in ${this.reconnectDelay / 1000}s`);
      }
      this.emit('disconnected');
      if (this.running) this._scheduleReconnect();
    });

    this.emit('started');
  }

  _handleStderr(line) {
    const trimmed = line.trim();
    if (!trimmed) return;

    let m = trimmed.match(SILENCE_START_RE);
    if (m) {
      log.warn(`Silence detected at stream pos ${parseFloat(m[1]).toFixed(1)}s`);
      this.emit('silence_start', parseFloat(m[1]));
      return;
    }

    m = trimmed.match(SILENCE_END_RE);
    if (m) {
      log.info(`Silence ended after ${parseFloat(m[2]).toFixed(1)}s`);
      this.emit('silence_end', parseFloat(m[2]));
      return;
    }

    if (/error|failed|refused|timeout|broken pipe/i.test(trimmed)) {
      log.warn(`FFmpeg: ${trimmed}`);
    } else {
      log.info(`FFmpeg: ${trimmed}`);
    }
  }

  _killProcess() {
    if (this.process) {
      const proc = this.process;
      this.process = null;
      proc.removeAllListeners();
      // SIGINT triggers graceful FFmpeg shutdown and RTSP TEARDOWN
      proc.kill('SIGINT');
      const forceTimer = setTimeout(() => proc.kill('SIGTERM'), 4000);
      proc.once('close', () => clearTimeout(forceTimer));
    }
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) return;
    log.info(`Stream reconnect in ${(this.reconnectDelay / 1000).toFixed(0)}s...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this._spawn();
    }, this.reconnectDelay);
  }

  resetReconnectDelay() {
    this._rapidFailCount = 0;
    this.reconnectDelay = 5000;
  }

  restart() {
    this._killProcess();
    setTimeout(() => { if (this.running) this._spawn(); }, 2000);
  }
}

module.exports = StreamManager;
