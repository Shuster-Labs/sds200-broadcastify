'use strict';

const log = require('./logger');

// Watchdog: monitors audio stream for silence and restarts FFmpeg if silent too long.
// With MediaMTX as the RTSP proxy, recovery is simpler: just restart FFmpeg and let
// MediaMTX handle reconnecting to the scanner.
class Watchdog {
  constructor(cfg, scanner, stream) {
    this.cfg = cfg.watchdog;
    this.scanner = scanner;
    this.stream = stream;

    this.silenceTimer = null;
    this.restartCount = 0;
    this.lastRestartTime = 0;
    this.inRestart = false;
    this.enabled = cfg.watchdog.enabled !== false;
  }

  start() {
    if (!this.enabled) {
      log.info('Watchdog disabled by config');
      return;
    }

    this.stream.on('silence_start', () => this._onSilenceStart());
    this.stream.on('silence_end', () => this._onSilenceEnd());
    this.stream.on('started', () => this._onStreamStarted());

    log.info(`Watchdog active: silence timeout ${this.cfg.silenceTimeoutSeconds}s`);
  }

  _onStreamStarted() {
    this._cancelSilenceTimer();
    this.inRestart = false;
  }

  _onSilenceStart() {
    if (this.inRestart) return;
    if (this.silenceTimer) return;

    log.warn(`Watchdog: silence detected, will restart in ${this.cfg.silenceTimeoutSeconds}s if not resolved`);

    this.silenceTimer = setTimeout(() => {
      this.silenceTimer = null;
      this._triggerRestart();
    }, this.cfg.silenceTimeoutSeconds * 1000);
  }

  _onSilenceEnd() {
    if (this.silenceTimer) {
      log.info('Watchdog: silence resolved, cancelling recovery timer');
      this._cancelSilenceTimer();
    }
  }

  _cancelSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  async _triggerRestart() {
    if (this.inRestart) return;

    const now = Date.now();
    if (this.restartCount >= this.cfg.maxRestartAttempts) {
      const cooldownMs = this.cfg.restartCooldownSeconds * 1000;
      if (now - this.lastRestartTime < cooldownMs) {
        log.error(`Watchdog: max restart attempts (${this.cfg.maxRestartAttempts}) reached. Waiting for cooldown.`);
        return;
      }
      this.restartCount = 0;
    }

    this.inRestart = true;
    this.restartCount++;
    this.lastRestartTime = now;

    log.warn(`Watchdog: silence persisted — restarting stream (attempt ${this.restartCount}/${this.cfg.maxRestartAttempts})`);

    // Send MSM,1 first as a soft kick before restarting FFmpeg
    log.info('Watchdog: sending MSM,1');
    this.scanner.sendRestart('MSM,1');

    this.stream.stop();
    await new Promise((r) => setTimeout(r, 3000));
    this.inRestart = false;
    this.stream.start();
  }
}

module.exports = Watchdog;
