'use strict';

const path = require('path');
const { load: loadConfig } = require('./config');
const log = require('./logger');
const Scanner = require('./scanner');
const StreamManager = require('./stream');
const { MetadataPoller } = require('./metadata');
const Watchdog = require('./watchdog');
const WebServer = require('./web');

async function main() {
  const configPath = process.env.CONFIG_PATH || path.join(process.cwd(), 'config.json');

  let cfg;
  try {
    cfg = loadConfig(configPath);
  } catch (e) {
    console.error(`Configuration error: ${e.message}`);
    process.exit(1);
  }

  log.setLevel(cfg.logging.level, cfg.logging.timestamps);
  log.info('=== SDS200 → Broadcastify Stream Service starting ===');
  log.info(`Scanner: ${cfg.scanner.ip} | RTSP: rtsp://${cfg.scanner.ip}:${cfg.scanner.rtspPort}${cfg.scanner.rtspPath}`);
  log.info(`Icecast: ${cfg.icecast.server}:${cfg.icecast.port}${cfg.icecast.mount} @ ${cfg.icecast.bitrate}kbps`);

  const scanner  = new Scanner(cfg);
  const stream   = new StreamManager(cfg);
  const metadata = new MetadataPoller(cfg, scanner);
  const watchdog = new Watchdog(cfg, scanner, stream);
  const web      = new WebServer({ cfg, scanner, stream, metadata, configPath });

  // Graceful shutdown
  const shutdown = (signal) => {
    log.info(`Received ${signal}, shutting down...`);
    web.stop();
    metadata.stop();
    stream.stop();
    scanner.destroy();
    process.exit(0);
  };
  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Unhandled errors — log and stay alive
  process.on('uncaughtException', (err) => {
    log.error(`Uncaught exception: ${err.message}\n${err.stack}`);
  });
  process.on('unhandledRejection', (reason) => {
    log.error(`Unhandled rejection: ${reason}`);
  });

  // Start everything
  web.start();
  watchdog.start();
  scanner.connect();
  stream.start();
  metadata.start();

  scanner.on('connected', () => {
    scanner.getModel((err, model) => {
      if (!err) log.info(`Scanner model: ${model}`);
    });
  });

  stream.on('started', () => {
    log.info('FFmpeg stream started');
  });

  stream.on('disconnected', () => {
    log.warn('FFmpeg stream disconnected, will reconnect...');
  });
}

main();
