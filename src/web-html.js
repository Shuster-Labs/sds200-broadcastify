'use strict';

module.exports = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SDS200 Dashboard</title>
<style>
:root {
  --bg:           #07101d;
  --card:         #0c1a2e;
  --card-deep:    #081425;
  --border:       rgba(148,163,184,.09);
  --border-hi:    rgba(148,163,184,.16);
  --text:         #ddeeff;
  --muted:        #6b8aaa;
  --dim:          #3a5470;
  --green:        #34d399;
  --green-soft:   rgba(52,211,153,.1);
  --green-ring:   rgba(52,211,153,.28);
  --red:          #f87171;
  --red-soft:     rgba(248,113,113,.09);
  --red-ring:     rgba(248,113,113,.22);
  --indigo:       #818cf8;
  --indigo-dark:  #4338ca;
  --r:            13px;
  --r-sm:         8px;
}
*,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  background: var(--bg);
  background-image:
    radial-gradient(ellipse 70% 40% at 15% 0%, rgba(67,56,202,.11) 0%, transparent 100%),
    radial-gradient(ellipse 50% 30% at 85% 100%, rgba(52,211,153,.06) 0%, transparent 100%);
  background-attachment: fixed;
  color: var(--text);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}
.page { max-width: 660px; margin: 0 auto; padding: 40px 20px 56px; }

/* ── Header ── */
.hdr { display: flex; align-items: center; gap: 15px; margin-bottom: 36px; }
.hdr-icon {
  width: 44px; height: 44px; border-radius: 11px; flex-shrink: 0;
  background: linear-gradient(145deg, #4f46e5 0%, #7c3aed 100%);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 0 1px rgba(255,255,255,.12) inset, 0 6px 20px rgba(79,70,229,.38);
}
.hdr-title { font-size: 1.18rem; font-weight: 700; letter-spacing: -.025em; line-height: 1.2; }
.hdr-sub   { font-size: .8rem; color: var(--muted); margin-top: 2px; }

/* ── Card ── */
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 22px 24px;
  margin-bottom: 14px;
}
.card-label {
  font-size: .68rem; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase;
  color: var(--dim); margin-bottom: 16px;
}

/* ── Live indicator ── */
.live-bar {
  display: flex; align-items: center; gap: 16px;
  background: var(--card-deep);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  padding: 16px 20px;
  margin-bottom: 14px;
  transition: background .5s ease, border-color .5s ease;
}
.live-bar.is-live    { background: var(--green-soft); border-color: var(--green-ring); }
.live-bar.is-offline { background: var(--red-soft);   border-color: var(--red-ring);   }

.pip { position: relative; width: 22px; height: 22px; flex-shrink: 0; }
.pip-dot {
  width: 11px; height: 11px; border-radius: 50%;
  background: var(--dim);
  position: absolute; inset: 0; margin: auto;
  transition: background .4s;
}
.pip-ring {
  position: absolute; inset: 0; border-radius: 50%;
  border: 2px solid var(--green); opacity: 0;
}
.is-live  .pip-dot  { background: var(--green); }
.is-live  .pip-ring { animation: ripple 2.2s ease-out infinite; }
.is-offline .pip-dot { background: var(--red); }
@keyframes ripple {
  0%   { opacity: .6; transform: scale(.45); }
  100% { opacity: 0;  transform: scale(2.4); }
}

.live-text { flex: 1; min-width: 0; }
.live-state {
  font-size: .98rem; font-weight: 700; letter-spacing: -.01em;
  color: var(--dim); transition: color .4s;
}
.is-live    .live-state { color: var(--green); }
.is-offline .live-state { color: var(--red);   }
.live-now {
  font-size: .82rem; color: var(--muted); margin-top: 3px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* ── Stats ── */
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.stat {
  background: var(--card-deep);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  padding: 12px 14px;
}
.stat-lbl { font-size: .67rem; font-weight: 700; color: var(--dim); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 5px; }
.stat-val { font-size: .88rem; font-weight: 600; color: var(--muted); }
.stat-val.ok  { color: var(--green); }
.stat-val.bad { color: var(--red);   }
.stat-val.run { color: var(--indigo); }

/* ── Form ── */
.field { margin-bottom: 13px; }
.field:last-of-type { margin-bottom: 0; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

label {
  display: block; font-size: .7rem; font-weight: 700;
  color: var(--muted); text-transform: uppercase; letter-spacing: .07em; margin-bottom: 6px;
}
input {
  width: 100%; background: var(--card-deep);
  border: 1px solid var(--border-hi);
  border-radius: var(--r-sm); color: var(--text);
  font-size: .9rem; font-family: inherit;
  padding: 10px 14px;
  transition: border-color .2s, box-shadow .2s;
  -webkit-appearance: none;
}
input::placeholder { color: var(--dim); }
input:focus {
  outline: none; border-color: var(--indigo);
  box-shadow: 0 0 0 3px rgba(129,140,248,.13);
}

.rule { border: none; border-top: 1px solid var(--border); margin: 18px 0; }

/* ── Buttons ── */
.btns { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px; }
.btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 10px 18px; border-radius: var(--r-sm); border: none;
  font-size: .85rem; font-weight: 700; font-family: inherit; cursor: pointer;
  letter-spacing: -.005em; transition: opacity .15s, transform .1s;
  white-space: nowrap;
}
.btn:active { transform: scale(.97); }
.btn-save {
  background: var(--indigo-dark); color: #fff;
  box-shadow: 0 0 0 1px rgba(255,255,255,.1) inset, 0 3px 10px rgba(67,56,202,.4);
}
.btn-restart {
  background: rgba(220,38,38,.13); color: #fca5a5;
  border: 1px solid rgba(220,38,38,.22);
}
.btn:hover { opacity: .82; }

/* ── Toast ── */
.toast { display: none; margin-top: 14px; padding: 11px 14px; border-radius: var(--r-sm); font-size: .83rem; font-weight: 500; }
.toast.ok  { display: block; background: rgba(52,211,153,.08);  border: 1px solid rgba(52,211,153,.2);  color: var(--green); }
.toast.err { display: block; background: rgba(248,113,113,.08); border: 1px solid rgba(248,113,113,.2); color: var(--red);   }

@media (max-width: 500px) {
  .stats     { grid-template-columns: 1fr 1fr; }
  .field-row { grid-template-columns: 1fr; }
  .btns      { flex-direction: column; }
  .btn       { justify-content: center; }
}
</style>
</head>
<body>
<div class="page">

  <header class="hdr">
    <div class="hdr-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="2"/>
        <path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 7.76a6 6 0 0 0 0 8.49"/>
        <path d="M20.49 3.51a12 12 0 0 1 0 16.97M3.51 3.51a12 12 0 0 0 0 16.97"/>
      </svg>
    </div>
    <div>
      <div class="hdr-title">SDS200 &rarr; Broadcastify</div>
      <div class="hdr-sub">Live feed dashboard</div>
    </div>
  </header>

  <div class="card">
    <div class="card-label">Stream Status</div>

    <div id="live-bar" class="live-bar is-offline">
      <div class="pip">
        <div class="pip-ring"></div>
        <div class="pip-dot"></div>
      </div>
      <div class="live-text">
        <div class="live-state" id="live-state">Connecting&hellip;</div>
        <div class="live-now"  id="live-now">&mdash;</div>
      </div>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="stat-lbl">Scanner</div>
        <div class="stat-val" id="st-scanner">&mdash;</div>
      </div>
      <div class="stat">
        <div class="stat-lbl">FFmpeg</div>
        <div class="stat-val" id="st-ffmpeg">&mdash;</div>
      </div>
      <div class="stat">
        <div class="stat-lbl">Uptime</div>
        <div class="stat-val" id="st-uptime">&mdash;</div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-label">Configuration</div>
    <form id="cfg-form" autocomplete="off">

      <div class="field">
        <label>Scanner IP Address</label>
        <input name="scannerIp" type="text" placeholder="10.x.x.x" required>
      </div>

      <hr class="rule">

      <div class="field">
        <label>Broadcastify Server</label>
        <input name="icecastServer" type="text" placeholder="audioN.broadcastify.com" required>
      </div>
      <div class="field field-row">
        <div>
          <label>Port</label>
          <input name="icecastPort" type="number" placeholder="80" required>
        </div>
        <div>
          <label>Mount / Feed Key</label>
          <input name="icecastMount" type="text" placeholder="/yourfeedkey" required>
        </div>
      </div>
      <div class="field">
        <label>Stream Password</label>
        <input name="icecastPassword" type="password" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;" required>
      </div>

      <hr class="rule">

      <div class="field field-row">
        <div>
          <label>Feed Name</label>
          <input name="feedName" type="text" placeholder="City, ST Scanner">
        </div>
        <div>
          <label>Description</label>
          <input name="feedDescription" type="text" placeholder="County P25 System">
        </div>
      </div>

      <div class="btns">
        <button type="submit" class="btn btn-save">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          Save Config
        </button>
        <button type="button" class="btn btn-restart" onclick="saveAndRestart()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Save &amp; Restart
        </button>
      </div>
      <div id="toast" class="toast"></div>
    </form>
  </div>

</div>
<script>
let lastLive = null;

async function poll() {
  try {
    const d = await fetch('/api/status').then(r => r.json());
    const live = d.ffmpegRunning;

    if (live !== lastLive) {
      document.getElementById('live-bar').className     = 'live-bar ' + (live ? 'is-live' : 'is-offline');
      document.getElementById('live-state').textContent = live ? 'LIVE — Streaming' : 'Offline';
      lastLive = live;
    }

    document.getElementById('live-now').textContent = d.currentTitle || (live ? 'Scanning…' : '—');

    const sc = document.getElementById('st-scanner');
    sc.textContent = d.scannerConnected ? 'Connected' : 'Disconnected';
    sc.className   = 'stat-val ' + (d.scannerConnected ? 'ok' : 'bad');

    const ff = document.getElementById('st-ffmpeg');
    ff.textContent = d.ffmpegRunning ? 'Running' : 'Stopped';
    ff.className   = 'stat-val ' + (d.ffmpegRunning ? 'run' : 'bad');

    document.getElementById('st-uptime').textContent = d.uptime || '—';
  } catch (_) {}
}

async function loadCfg() {
  try {
    const d = await fetch('/api/config').then(r => r.json());
    const f = document.getElementById('cfg-form');
    f.scannerIp.value       = d.scannerIp       || '';
    f.icecastServer.value   = d.icecastServer   || '';
    f.icecastPort.value     = d.icecastPort     || '';
    f.icecastMount.value    = d.icecastMount    || '';
    f.icecastPassword.value = d.icecastPassword || '';
    f.feedName.value        = d.feedName        || '';
    f.feedDescription.value = d.feedDescription || '';
  } catch (_) {}
}

function showToast(msg, ok) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + (ok ? 'ok' : 'err');
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.className = 'toast'; }, 5000);
}

function payload(restart) {
  const f = document.getElementById('cfg-form');
  return {
    scannerIp:       f.scannerIp.value.trim(),
    icecastServer:   f.icecastServer.value.trim(),
    icecastPort:     parseInt(f.icecastPort.value, 10),
    icecastMount:    f.icecastMount.value.trim(),
    icecastPassword: f.icecastPassword.value,
    feedName:        f.feedName.value.trim(),
    feedDescription: f.feedDescription.value.trim(),
    restart,
  };
}

document.getElementById('cfg-form').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const d = await fetch('/api/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload(false)),
    }).then(r => r.json());
    if (d.ok) showToast('Config saved — restart the service to apply changes.', true);
    else showToast('Error: ' + d.error, false);
  } catch (e) { showToast('Request failed: ' + e.message, false); }
});

async function saveAndRestart() {
  try {
    await fetch('/api/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload(true)),
    });
    showToast('Config saved — service restarting…', true);
  } catch (e) { showToast('Request failed: ' + e.message, false); }
}

poll();
loadCfg();
setInterval(poll, 2000);
</script>
</body>
</html>`;
