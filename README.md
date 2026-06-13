# SDS200 → Broadcastify Stream Service

Streams live audio from a **Uniden SDS200** scanner to a **Broadcastify** internet radio feed, 24/7, with a web dashboard and real-time talkgroup metadata.

![Status: Active](https://img.shields.io/badge/status-active-brightgreen)
![Node.js](https://img.shields.io/badge/node-%3E%3D18-blue)

---

## Features

- **Continuous streaming** — the SDS200 sends silent audio frames between transmissions, so the Broadcastify feed stays "online" around the clock with no gaps
- **Live metadata** — polls the scanner every 1.5 seconds and updates the stream title with the active talkgroup name; shows "Scanning..." between calls
- **Web dashboard** — status indicator, live title, and a configuration form at `http://<host>:3000`
- **Auto-recovery** — FFmpeg reconnects automatically on crash; MediaMTX handles scanner RTSP reconnection
- **Runs on a Proxmox LXC** — lightweight, no GPU, ~70 MB RAM

---

## How It Works

```
SDS200 Scanner
  └─ RTSP :554 ──→ MediaMTX (RTSP proxy) ──→ FFmpeg ──→ MP3 16kbps ──→ Broadcastify
  └─ UDP :50536 ──→ Node.js (polls GSI every 1.5s) ──→ Icecast metadata API
```

**MediaMTX** is required as an RTSP proxy between the scanner and FFmpeg. The SDS200 only accepts UDP RTP transport and has a single connection slot — MediaMTX handles the scanner's quirks and lets FFmpeg connect cleanly via TCP.

---

## Requirements

- **Proxmox LXC** (or any Linux host) with Node.js ≥ 18, FFmpeg (with libmp3lame), and systemd
- **Uniden SDS200** scanner on the same LAN
- **Broadcastify** account with a live feed set up ([broadcastify.com](https://www.broadcastify.com))
- SSH access to the LXC from your local machine

---

## Installation

### 1. On the LXC — install Docker

```bash
curl -fsSL https://get.docker.com | sh
```

### 2. On your local machine — clone and configure

```bash
git clone https://github.com/Shuster-Labs/sds200-broadcastify.git
cd sds200-broadcastify

cp config.example.json config.json
```

Edit `config.json` and fill in your values:

| Field | Description |
|---|---|
| `scanner.ip` | LAN IP address of your SDS200 |
| `icecast.server` | Broadcastify relay server (e.g. `audio5.broadcastify.com`) |
| `icecast.mount` | Your feed's mount point (from Broadcastify feed management) |
| `icecast.password` | Source password from Broadcastify feed management |
| `icecast.name` | Display name for your feed |

Leave everything else at the defaults to start.

> **Where to find your Broadcastify credentials:** Log in → Feed Management → click your feed → *Mountpoint/Password* section.

### 3. Deploy to the LXC

```bash
./deploy.sh <lxc-ip>
```

This syncs all files, builds the Docker image, and starts both containers (`mediamtx` and `sds200-stream`). Takes about 60 seconds on first run while the image builds.

### 4. Open the dashboard

```
http://<lxc-ip>:3000
```

A green **LIVE — Streaming** indicator means audio is reaching Broadcastify. You can update credentials and scanner IP from the dashboard without editing files by hand.

---

## Docker Containers

Two containers run via Docker Compose:

| Container | Purpose |
|---|---|
| `mediamtx` | RTSP proxy — connects to the scanner, re-serves on port 8554 |
| `sds200-stream` | Node.js app — runs FFmpeg, polls scanner, updates metadata, hosts dashboard |

Both restart automatically on crash or reboot (`restart: unless-stopped`).

```bash
# Useful commands on the LXC
docker compose -f /opt/sds200-broadcastify/docker-compose.yml ps
docker compose -f /opt/sds200-broadcastify/docker-compose.yml logs -f
docker compose -f /opt/sds200-broadcastify/docker-compose.yml restart sds200-stream
```

---

## Configuration Reference

| Key | Default | Description |
|---|---|---|
| `scanner.ip` | — | SDS200 LAN IP |
| `scanner.rtspUrl` | `rtsp://127.0.0.1:8554/sds200` | Leave as-is — points to MediaMTX proxy |
| `icecast.bitrate` | `16` | kbps — Broadcastify requires 16–24 kbps mono |
| `icecast.sampleRate` | `22050` | Hz |
| `metadata.titleFormat` | `{talkgroupName}` | Tokens: `{talkgroupName}` `{talkgroup}` `{system}` `{department}` `{frequency}` |
| `metadata.idleTitle` | `Scanning...` | Shown when no talkgroup is active |
| `watchdog.enabled` | `false` | Leave disabled — scanner sends silent audio frames, so silence detection is not meaningful |

---

## Updating

```bash
# Pull latest code and redeploy (stream restarts briefly)
git pull
./deploy.sh <lxc-ip>
```

---

## Troubleshooting

**Dashboard shows Offline / FFmpeg not running**
Check logs: `journalctl -u sds200-stream -n 50`. Most common cause is MediaMTX not yet connected to the scanner — wait 30 seconds and check again.

**MediaMTX fails to connect to scanner**
Make sure nothing else is using the scanner's RTSP connection (ProScan, RadioFeed, VLC). The SDS200 only allows one RTSP client at a time. Close any other software and wait ~30 seconds for the slot to free.

**Stream shows as offline on Broadcastify despite FFmpeg running**
Verify your mount point and password in `config.json`. Mount points are case-sensitive and must include the leading `/`.

**FFmpeg missing libmp3lame**
```bash
ffmpeg -encoders 2>/dev/null | grep mp3lame
# If empty:
apt install ffmpeg   # Debian/Ubuntu includes libmp3lame
```

**Metadata not updating**
The Icecast metadata API (`/admin/metadata`) may take up to 30 seconds to reflect on Broadcastify's player. If it never updates, check that your source password is correct.

---

## SDS200 API Notes

- RTSP audio: G.711 µ-law (PCMU) 8 kHz mono — FFmpeg decodes automatically
- The scanner only accepts **UDP RTP transport** — TCP interleaved returns 400. MediaMTX handles this.
- Command protocol: UDP port 50536, plain ASCII + `\r\n`
- `GSI` command returns XML with live scanner state including talkgroup name (`<TGID Name="...">`)
- The scanner streams silent audio frames between calls — no silence watchdog needed

---

## License

This project is free for personal, non-commercial use.  
Commercial use requires a written license agreement.  
Contact SShuster@livefirefeeds.net for licensing inquiries.
