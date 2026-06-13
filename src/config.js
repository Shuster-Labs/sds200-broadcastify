'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  scanner: {
    rtspPort: 554,
    rtspPath: '/au:scanner.au',
    commandPort: 50536,
    commandProtocol: 'udp',
  },
  icecast: {
    port: 80,
    bitrate: 16,
    sampleRate: 22050,
    channels: 1,
    name: 'Scanner Feed',
    description: 'Scanner audio stream',
    genre: 'Scanner',
  },
  metadata: {
    pollIntervalMs: 1500,
    titleFormat: '{talkgroup} | {system} | {frequency}',
    idleTitle: 'Scanning...',
  },
  watchdog: {
    enabled: true,
    silenceThresholdDb: -50,
    silenceTimeoutSeconds: 30,
    restartCommand: 'KEY,POWER,P',
    restartWaitSeconds: 90,
    maxRestartAttempts: 5,
    restartCooldownSeconds: 300,
  },
  logging: {
    level: 'info',
    timestamps: true,
  },
};

function deepMerge(defaults, overrides) {
  const result = { ...defaults };
  for (const key of Object.keys(overrides || {})) {
    if (overrides[key] !== null && typeof overrides[key] === 'object' && !Array.isArray(overrides[key])) {
      result[key] = deepMerge(defaults[key] || {}, overrides[key]);
    } else {
      result[key] = overrides[key];
    }
  }
  return result;
}

function load(configPath) {
  const resolved = configPath || process.env.CONFIG_PATH || path.join(process.cwd(), 'config.json');

  if (!fs.existsSync(resolved)) {
    throw new Error(`Config file not found: ${resolved}\nCopy config.example.json to config.json and fill in your values.`);
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch (e) {
    throw new Error(`Failed to parse config file: ${e.message}`);
  }

  const cfg = deepMerge(DEFAULTS, raw);

  // Required field validation
  const required = [
    ['scanner.ip', cfg.scanner?.ip],
    ['icecast.server', cfg.icecast?.server],
    ['icecast.mount', cfg.icecast?.mount],
    ['icecast.password', cfg.icecast?.password],
  ];

  for (const [field, value] of required) {
    if (!value) throw new Error(`Missing required config field: ${field}`);
  }

  return cfg;
}

module.exports = { load };
