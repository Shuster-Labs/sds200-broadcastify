#!/usr/bin/env node
'use strict';

// Test script: verifies SDS200 connectivity before running the full service.
// Usage: node test-connection.js [--config path/to/config.json]

const net   = require('net');
const dgram = require('dgram');
const { load: loadConfig } = require('./src/config');

const args = process.argv.slice(2);
const configArg = args.indexOf('--config');
const configPath = configArg !== -1 ? args[configArg + 1] : undefined;

let cfg;
try {
  cfg = loadConfig(configPath);
} catch (e) {
  console.error(`Config error: ${e.message}`);
  process.exit(1);
}

const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
const INFO = '\x1b[33m→\x1b[0m';

function tcpCheck(host, port, label, ms = 5000) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    const t = setTimeout(() => { sock.destroy(); console.log(`${FAIL} ${label} (${host}:${port}) — timeout`); resolve(false); }, ms);
    sock.connect(port, host, () => { clearTimeout(t); sock.destroy(); console.log(`${PASS} ${label} (${host}:${port}) reachable`); resolve(true); });
    sock.on('error', (e) => { clearTimeout(t); sock.destroy(); console.log(`${FAIL} ${label} (${host}:${port}) — ${e.message}`); resolve(false); });
  });
}

// Send a UDP command to the scanner and collect response packets for `windowMs`.
function udpCommand(ip, port, cmd, windowMs = 1500) {
  return new Promise((resolve) => {
    const sock = dgram.createSocket('udp4');
    const packets = [];
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      sock.close(() => resolve(packets.join('')));
    };

    sock.bind(0, () => {
      const buf = Buffer.from(cmd + '\r\n', 'ascii');
      sock.send(buf, 0, buf.length, port, ip, (err) => {
        if (err) { finish(); return; }
        // Collect for windowMs then finish
        setTimeout(finish, windowMs);
      });
    });

    sock.on('message', (msg) => {
      packets.push(msg.toString('ascii'));
    });

    sock.on('error', finish);
  });
}

// Simple XML attribute extractor
function xmlAttr(xml, tag, attr) {
  const m = xml.match(new RegExp(`<${tag}[^>]+>`));
  if (!m) return '';
  const am = m[0].match(new RegExp(`${attr}="([^"]*)"`));
  return am ? am[1].trim() : '';
}

async function run() {
  console.log('\n=== SDS200 → Broadcastify Connection Test ===\n');
  console.log(`Scanner IP       : ${cfg.scanner.ip}`);
  console.log(`RTSP URL         : rtsp://${cfg.scanner.ip}:${cfg.scanner.rtspPort}${cfg.scanner.rtspPath}`);
  console.log(`Command socket   : UDP ${cfg.scanner.ip}:${cfg.scanner.commandPort}`);
  console.log(`Icecast endpoint : ${cfg.icecast.server}:${cfg.icecast.port}${cfg.icecast.mount}`);
  console.log('');

  // 1. RTSP port reachable
  await tcpCheck(cfg.scanner.ip, cfg.scanner.rtspPort, 'RTSP port 554');

  // 2. UDP command: MDL
  console.log(`${INFO} Sending MDL command via UDP...`);
  const mdlRaw = await udpCommand(cfg.scanner.ip, cfg.scanner.commandPort, 'MDL', 2000);
  if (mdlRaw.includes('MDL,')) {
    console.log(`${PASS} MDL: ${mdlRaw.trim()}`);
  } else {
    console.log(`${FAIL} MDL: no response (raw: "${mdlRaw.trim()}")`);
  }

  // 3. UDP command: VER
  console.log(`${INFO} Sending VER command via UDP...`);
  const verRaw = await udpCommand(cfg.scanner.ip, cfg.scanner.commandPort, 'VER', 2000);
  if (verRaw.includes('VER,')) {
    console.log(`${PASS} VER: ${verRaw.trim()}`);
  } else {
    console.log(`${FAIL} VER: no response`);
  }

  // 4. UDP command: GSI (XML status)
  console.log(`${INFO} Sending GSI command via UDP...`);
  const gsiRaw = await udpCommand(cfg.scanner.ip, cfg.scanner.commandPort, 'GSI', 2000);
  const xmlStart = gsiRaw.indexOf('<?xml');
  if (xmlStart !== -1) {
    const xml = gsiRaw.substring(xmlStart);
    const mode    = xmlAttr(xml, 'ScannerInfo', 'Mode');
    const system  = xmlAttr(xml, 'System', 'Name');
    const rawTgid = xmlAttr(xml, 'TGID', 'TGID');
    const freq    = xmlAttr(xml, 'SiteFrequency', 'Freq').trim();
    const status  = xmlAttr(xml, 'Property', 'P25Status');
    const view    = xmlAttr(xml, 'OverWrite', 'Text');
    console.log(`${PASS} GSI XML received:`);
    console.log(`      Mode     : ${mode}`);
    console.log(`      System   : ${system}`);
    console.log(`      TGID     : ${rawTgid}`);
    console.log(`      Frequency: ${freq}`);
    console.log(`      P25Status: ${status}`);
    console.log(`      Display  : ${view}`);
  } else {
    console.log(`${FAIL} GSI: no XML in response (raw: "${gsiRaw.substring(0, 80).trim()}")`);
  }

  // 5. Icecast server reachable
  console.log('');
  await tcpCheck(cfg.icecast.server, cfg.icecast.port, 'Icecast server');

  // 6. FFmpeg check
  console.log('');
  const { execSync } = require('child_process');
  try {
    const ver = execSync('ffmpeg -version 2>&1 | head -1', { encoding: 'utf8' }).trim();
    console.log(`${PASS} ${ver}`);
    const lame = execSync('ffmpeg -encoders 2>&1 | grep libmp3lame || true', { encoding: 'utf8' }).trim();
    if (lame) {
      console.log(`${PASS} libmp3lame encoder available`);
    } else {
      console.log(`${FAIL} libmp3lame not found — install ffmpeg with MP3 support`);
    }
  } catch {
    console.log(`${FAIL} ffmpeg not found in PATH`);
  }

  console.log('\n=== Done ===\n');
}

run().catch((e) => { console.error(e.message); process.exit(1); });
