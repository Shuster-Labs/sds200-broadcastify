'use strict';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
let currentLevel = 2;
let useTimestamps = true;

function setLevel(level, timestamps) {
  currentLevel = LEVELS[level] ?? 2;
  useTimestamps = timestamps !== false;
}

function log(level, ...args) {
  if (LEVELS[level] > currentLevel) return;
  const prefix = useTimestamps ? `[${new Date().toISOString()}] [${level.toUpperCase()}]` : `[${level.toUpperCase()}]`;
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(prefix, ...args);
}

module.exports = {
  setLevel,
  error: (...a) => log('error', ...a),
  warn:  (...a) => log('warn',  ...a),
  info:  (...a) => log('info',  ...a),
  debug: (...a) => log('debug', ...a),
};
