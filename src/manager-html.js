'use strict';

module.exports = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Scanner Manager</title>
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
.page { max-width: 700px; margin: 0 auto; padding: 40px 20px 60px; }

/* ── Header ── */
.hdr { display: flex; align-items: center; gap: 15px; margin-bottom: 40px; }
.hdr-icon {
  width: 44px; height: 44px; border-radius: 11px; flex-shrink: 0;
  background: linear-gradient(145deg, #4f46e5 0%, #7c3aed 100%);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 0 1px rgba(255,255,255,.12) inset, 0 6px 20px rgba(79,70,229,.38);
}
.hdr-title { font-size: 1.18rem; font-weight: 700; letter-spacing: -.025em; }
.hdr-sub   { font-size: .8rem; color: var(--muted); margin-top: 3px; }

/* ── Scanner section ── */
.scanner-section { margin-bottom: 28px; }
.scanner-label {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 10px;
}
.scanner-badge {
  font-size: .62rem; font-weight: 800; letter-spacing: .12em;
  text-transform: uppercase; color: var(--dim);
  background: rgba(148,163,184,.06);
  border: 1px solid var(--border);
  border-radius: 5px; padding: 3px 8px;
}
.scanner-name-lbl {
  font-size: .88rem; font-weight: 600; color: var(--muted);
}
.scanner-chip {
  margin-left: auto;
  font-size: .72rem; font-weight: 700;
  padding: 3px 10px; border-radius: 20px;
  background: var(--red-soft); color: var(--red);
  border: 1px solid var(--red-ring);
  transition: background .4s, color .4s, border-color .4s;
}
.scanner-chip.live {
  background: var(--green-soft); color: var(--green);
  border-color: var(--green-ring);
}

/* ── Card ── */
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 20px 22px;
  margin-bottom: 4px;
}
.card-label {
  font-size: .67rem; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase;
  color: var(--dim); margin-bottom: 14px;
}

/* ── Live bar ── */
.live-bar {
  display: flex; align-items: center; gap: 14px;
  background: var(--card-deep);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  padding: 14px 16px;
  margin-bottom: 12px;
  transition: background .5s, border-color .5s;
}
.live-bar.is-live    { background: var(--green-soft); border-color: var(--green-ring); }
.live-bar.is-offline { background: var(--red-soft);   border-color: var(--red-ring);   }

.pip { position: relative; width: 20px; height: 20px; flex-shrink: 0; }
.pip-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--dim);
  position: absolute; inset: 0; margin: auto;
  transition: background .4s;
}
.pip-ring {
  position: absolute; inset: 0; border-radius: 50%;
  border: 2px solid var(--green); opacity: 0;
}
.is-live    .pip-dot  { background: var(--green); }
.is-live    .pip-ring { animation: ripple 2.2s ease-out infinite; }
.is-offline .pip-dot  { background: var(--red); }
@keyframes ripple {
  0%   { opacity: .6; transform: scale(.45); }
  100% { opacity: 0;  transform: scale(2.4); }
}

.live-text { flex: 1; min-width: 0; }
.live-state {
  font-size: .95rem; font-weight: 700;
  color: var(--dim); transition: color .4s;
}
.is-live    .live-state { color: var(--green); }
.is-offline .live-state { color: var(--red);   }
.live-now {
  font-size: .8rem; color: var(--muted); margin-top: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* ── Stats ── */
.stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-bottom: 12px; }
.stat {
  background: var(--card-deep);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  padding: 10px 12px;
}
.stat-lbl { font-size: .64rem; font-weight: 700; color: var(--dim); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 4px; }
.stat-val { font-size: .85rem; font-weight: 600; color: var(--muted); }
.stat-val.ok  { color: var(--green); }
.stat-val.bad { color: var(--red);   }
.stat-val.run { color: var(--indigo); }

/* ── Card footer ── */
.card-ftr {
  display: flex; align-items: center; gap: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}
.card-ftr-info {
  flex: 1; min-width: 0;
  font-size: .75rem; color: var(--dim);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.card-ftr-info span { color: var(--muted); }

/* ── Buttons ── */
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: var(--r-sm); border: none;
  font-size: .8rem; font-weight: 700; font-family: inherit; cursor: pointer;
  letter-spacing: -.005em; transition: opacity .15s, transform .1s;
  white-space: nowrap;
}
.btn:active { transform: scale(.96); }
.btn:hover  { opacity: .82; }

.btn-cfg {
  background: rgba(129,140,248,.1); color: var(--indigo);
  border: 1px solid rgba(129,140,248,.2);
  padding: 7px 12px; font-size: .75rem;
}
.btn-cfg .chevron { display: inline-block; transition: transform .25s; font-style: normal; }
.btn-cfg.open .chevron { transform: rotate(180deg); }

.btn-restart-sm {
  background: rgba(220,38,38,.1); color: #fca5a5;
  border: 1px solid rgba(220,38,38,.2);
  padding: 7px 12px; font-size: .75rem;
}
.btn-stop {
  background: rgba(220,38,38,.13); color: #fca5a5;
  border: 1px solid rgba(220,38,38,.25);
  padding: 7px 12px; font-size: .75rem;
}
.btn-start {
  background: rgba(52,211,153,.1); color: var(--green);
  border: 1px solid rgba(52,211,153,.25);
  padding: 7px 12px; font-size: .75rem;
}

/* ── Config panel ── */
.cfg-panel {
  background: var(--card);
  border: 1px solid var(--border-hi);
  border-top: none;
  border-radius: 0 0 var(--r) var(--r);
  padding: 20px 22px 22px;
  margin-bottom: 4px;
  margin-top: -4px;
}
.cfg-panel-label {
  font-size: .67rem; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase;
  color: var(--dim); margin-bottom: 16px;
}

/* rounded bottom only when closed, flat when cfg open */
.card.cfg-open { border-radius: var(--r) var(--r) 0 0; }

/* ── Form ── */
.field { margin-bottom: 12px; }
.field:last-of-type { margin-bottom: 0; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
label {
  display: block; font-size: .68rem; font-weight: 700;
  color: var(--muted); text-transform: uppercase; letter-spacing: .07em; margin-bottom: 5px;
}
input {
  width: 100%; background: var(--card-deep);
  border: 1px solid var(--border-hi);
  border-radius: var(--r-sm); color: var(--text);
  font-size: .88rem; font-family: inherit;
  padding: 9px 12px;
  transition: border-color .2s, box-shadow .2s;
  -webkit-appearance: none;
}
input::placeholder { color: var(--dim); }
input:focus { outline: none; border-color: var(--indigo); box-shadow: 0 0 0 3px rgba(129,140,248,.13); }
.rule { border: none; border-top: 1px solid var(--border); margin: 16px 0; }

.btns { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 18px; }
.btn-save {
  background: var(--indigo-dark); color: #fff;
  box-shadow: 0 0 0 1px rgba(255,255,255,.1) inset, 0 3px 10px rgba(67,56,202,.35);
}
.btn-restart {
  background: rgba(220,38,38,.12); color: #fca5a5;
  border: 1px solid rgba(220,38,38,.2);
}

/* ── Toast ── */
.toast { display: none; margin-top: 12px; padding: 10px 13px; border-radius: var(--r-sm); font-size: .81rem; font-weight: 500; }
.toast.ok  { display: block; background: rgba(52,211,153,.08);  border: 1px solid rgba(52,211,153,.2);  color: var(--green); }
.toast.err { display: block; background: rgba(248,113,113,.08); border: 1px solid rgba(248,113,113,.2); color: var(--red);   }

/* ── Add scanner ── */
.add-wrap { margin-top: 8px; }
.btn-add {
  width: 100%;
  justify-content: center;
  background: rgba(129,140,248,.06);
  color: var(--muted);
  border: 1px dashed rgba(129,140,248,.25);
  border-radius: var(--r);
  padding: 14px;
  font-size: .85rem;
  gap: 8px;
  transition: background .2s, border-color .2s, color .2s;
}
.btn-add:hover { background: rgba(129,140,248,.12); border-color: rgba(129,140,248,.4); color: var(--indigo); }
.btn-add.open  { border-style: solid; border-color: var(--border-hi); color: var(--muted); }
.add-panel {
  background: var(--card);
  border: 1px solid var(--border-hi);
  border-top: none;
  border-radius: 0 0 var(--r) var(--r);
  padding: 20px 22px 22px;
  margin-top: -1px;
}
.btn-cancel {
  background: rgba(148,163,184,.07); color: var(--muted);
  border: 1px solid var(--border-hi);
}

/* ── Empty state ── */
.empty { text-align: center; padding: 60px 20px; color: var(--dim); }
.empty-icon { font-size: 2.5rem; margin-bottom: 12px; opacity: .4; }
.empty p { font-size: .88rem; }

@media (max-width: 500px) {
  .stats      { grid-template-columns: 1fr 1fr; }
  .field-row  { grid-template-columns: 1fr; }
  .btns       { flex-direction: column; }
  .btn        { justify-content: center; }
  .card-ftr   { flex-wrap: wrap; }
}
</style>
</head>
<body>
<div class="page">

  <header class="hdr">
    <div class="hdr-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    </div>
    <div>
      <div class="hdr-title">Scanner Manager</div>
      <div class="hdr-sub" id="summary">Loading&hellip;</div>
    </div>
  </header>

  <div id="scanners-list"></div>

  <div class="add-wrap">
    <button class="btn btn-add" id="btn-add" onclick="toggleAdd()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Add Scanner
    </button>
    <div class="add-panel" id="add-panel" style="display:none">
      <div class="cfg-panel-label">New Scanner Setup</div>
      <form id="add-form" autocomplete="off">
        <div class="field field-row">
          <div>
            <label>Scanner Name</label>
            <input name="name" type="text" placeholder="Scanner 2" required>
          </div>
          <div>
            <label>Scanner IP Address</label>
            <input name="scannerIp" type="text" placeholder="10.x.x.x" required>
          </div>
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add &amp; Start Scanner
          </button>
          <button type="button" class="btn btn-cancel" onclick="toggleAdd()">Cancel</button>
        </div>
        <div id="add-toast" class="toast"></div>
      </form>
    </div>
  </div>

</div>
<script>
const cfgState = {}; // id -> { loaded: bool, expanded: bool }

/* ── Render ── */
function cardHTML(s, idx) {
  const id = s.id;
  return \`
<div class="scanner-section" id="section-\${id}">
  <div class="scanner-label">
    <div class="scanner-badge">Scanner \${idx + 1}</div>
    <div class="scanner-name-lbl" id="namelbl-\${id}">\${esc(s.name)}</div>
    <div class="scanner-chip" id="chip-\${id}">Offline</div>
  </div>

  <div class="card" id="statuscard-\${id}">
    <div class="card-label">Stream Status</div>

    <div class="live-bar is-offline" id="bar-\${id}">
      <div class="pip">
        <div class="pip-ring"></div>
        <div class="pip-dot"></div>
      </div>
      <div class="live-text">
        <div class="live-state" id="state-\${id}">Connecting&hellip;</div>
        <div class="live-now"   id="now-\${id}">&mdash;</div>
      </div>
      <button class="btn btn-cfg" id="cfgbtn-\${id}" onclick="toggleCfg('\${id}')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        Configure
        <em class="chevron">&#8964;</em>
      </button>
    </div>

    <div class="stats">
      <div class="stat"><div class="stat-lbl">Scanner</div><div class="stat-val" id="sc-\${id}">&mdash;</div></div>
      <div class="stat"><div class="stat-lbl">FFmpeg</div><div class="stat-val" id="ff-\${id}">&mdash;</div></div>
      <div class="stat"><div class="stat-lbl">Uptime</div><div class="stat-val" id="up-\${id}">&mdash;</div></div>
    </div>

    <div class="card-ftr">
      <div class="card-ftr-info" id="info-\${id}">&mdash;</div>
      <button class="btn btn-stop" id="stopbtn-\${id}" onclick="toggleStream('\${id}')">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
        Stop
      </button>
      <button class="btn btn-restart-sm" onclick="quickRestart('\${id}')">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        Restart
      </button>
    </div>
  </div>

  <div class="cfg-panel" id="cfg-\${id}" style="display:none">
    <div class="cfg-panel-label">Configuration</div>
    <form id="form-\${id}" autocomplete="off">
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
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          Save Config
        </button>
        <button type="button" class="btn btn-restart" onclick="saveRestart('\${id}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Save &amp; Restart
        </button>
      </div>
      <div id="toast-\${id}" class="toast"></div>
    </form>
  </div>
</div>\`;
}

/* ── DOM helpers ── */
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function el(id) { return document.getElementById(id); }

/* ── Status update ── */
function updateStatus(s) {
  const id = s.id;
  const live = s.ffmpegRunning && !s.offline;

  const bar = el('bar-' + id);
  if (bar) bar.className = 'live-bar ' + (live ? 'is-live' : 'is-offline');

  const chip = el('chip-' + id);
  if (chip) {
    chip.textContent = live ? 'Live' : 'Offline';
    chip.className = 'scanner-chip' + (live ? ' live' : '');
  }

  const state = el('state-' + id);
  if (state) state.textContent = live ? 'LIVE — Streaming' : (s.offline ? 'Service Offline' : 'Offline');

  const now = el('now-' + id);
  if (now) now.textContent = s.currentTitle || (live ? 'Scanning…' : '—');

  const sc = el('sc-' + id);
  if (sc) {
    sc.textContent = s.offline ? '—' : (s.scannerConnected ? 'Connected' : 'Disconnected');
    sc.className = 'stat-val ' + (s.offline ? '' : (s.scannerConnected ? 'ok' : 'bad'));
  }

  const ff = el('ff-' + id);
  if (ff) {
    ff.textContent = s.offline ? '—' : (s.ffmpegRunning ? 'Running' : 'Stopped');
    ff.className = 'stat-val ' + (s.offline ? '' : (s.ffmpegRunning ? 'run' : 'bad'));
  }

  const up = el('up-' + id);
  if (up) up.textContent = s.uptime || '—';

  // Stop/Start button
  const stopBtn = el('stopbtn-' + id);
  if (stopBtn) {
    const enabled = s.streamEnabled !== false && !s.offline;
    const svgStop  = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>';
    const svgStart = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    stopBtn.innerHTML = enabled ? (svgStop + ' Stop') : (svgStart + ' Start');
    stopBtn.className = 'btn ' + (enabled ? 'btn-stop' : 'btn-start');
    stopBtn.disabled = s.offline || false;
  }
}

/* ── Summary header ── */
function updateSummary(scanners) {
  const live = scanners.filter(s => s.ffmpegRunning && !s.offline).length;
  el('summary').textContent = scanners.length + ' feed' + (scanners.length !== 1 ? 's' : '') + ' configured · ' + live + ' live';
}

/* ── Config footer info ── */
function updateFooterInfo(id, cfg) {
  const info = el('info-' + id);
  if (info && cfg) {
    info.innerHTML = '<span>' + esc(cfg.icecastServer || '') + '</span> &middot; ' + esc(cfg.icecastMount || '');
  }
}

/* ── Toggle config panel ── */
function toggleCfg(id) {
  const panel = el('cfg-' + id);
  const card  = el('statuscard-' + id);
  const btn   = el('cfgbtn-' + id);
  if (!panel) return;

  const opening = panel.style.display === 'none';
  panel.style.display = opening ? 'block' : 'none';
  card.classList.toggle('cfg-open', opening);
  btn.classList.toggle('open', opening);

  if (opening && !cfgState[id]?.loaded) loadConfig(id);
}

/* ── Load config into form ── */
async function loadConfig(id) {
  try {
    const d = await fetch('/api/scanner/' + id + '/config').then(r => r.json());
    if (!d || d.error) return;
    const f = el('form-' + id);
    if (!f) return;
    f.scannerIp.value       = d.scannerIp       || '';
    f.icecastServer.value   = d.icecastServer   || '';
    f.icecastPort.value     = d.icecastPort     || '';
    f.icecastMount.value    = d.icecastMount    || '';
    f.icecastPassword.value = d.icecastPassword || '';
    f.feedName.value        = d.feedName        || '';
    f.feedDescription.value = d.feedDescription || '';
    if (!cfgState[id]) cfgState[id] = {};
    cfgState[id].loaded = true;
    updateFooterInfo(id, d);
  } catch (_) {}
}

/* ── Toast ── */
function toast(id, msg, ok) {
  const t = el('toast-' + id);
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast ' + (ok ? 'ok' : 'err');
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.className = 'toast'; }, 5000);
}

/* ── Post config ── */
async function postConfig(id, restart) {
  const f = el('form-' + id);
  if (!f) return;
  const body = {
    scannerIp:       f.scannerIp.value.trim(),
    icecastServer:   f.icecastServer.value.trim(),
    icecastPort:     parseInt(f.icecastPort.value, 10),
    icecastMount:    f.icecastMount.value.trim(),
    icecastPassword: f.icecastPassword.value,
    feedName:        f.feedName.value.trim(),
    feedDescription: f.feedDescription.value.trim(),
    restart,
  };
  try {
    const d = await fetch('/api/scanner/' + id + '/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => r.json());
    if (d && d.ok) {
      updateFooterInfo(id, body);
      toast(id, restart ? 'Saved — stream restarting in 15s…' : 'Config saved.', true);
    } else {
      toast(id, 'Error: ' + (d && d.error ? d.error : 'Scanner offline'), false);
    }
  } catch (e) { toast(id, 'Request failed: ' + e.message, false); }
}

function saveRestart(id) { postConfig(id, true); }

/* ── Stop / Start stream ── */
async function toggleStream(id) {
  const btn = el('stopbtn-' + id);
  const stopping = btn && btn.textContent.trim() === 'Stop';
  const action = stopping ? 'stop' : 'start';
  try {
    const d = await fetch('/api/scanner/' + id + '/stream/' + action, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    }).then(r => r.json());
    if (!d || !d.ok) toast(id, 'Could not reach scanner service', false);
  } catch (e) { toast(id, 'Request failed: ' + e.message, false); }
}

/* ── Quick restart (no config save) ── */
async function quickRestart(id) {
  try {
    const d = await fetch('/api/scanner/' + id + '/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restart: true }),
    }).then(r => r.json());
    if (d && d.ok) toast(id, 'Stream restarting…', true);
    else toast(id, 'Could not reach scanner service', false);
  } catch (e) { toast(id, 'Request failed: ' + e.message, false); }
}

/* ── Form submit ── */
function attachForm(id) {
  const f = el('form-' + id);
  if (!f) return;
  f.addEventListener('submit', e => { e.preventDefault(); postConfig(id, false); });
}

/* ── Poll ── */
let scannerIds = [];

async function poll() {
  try {
    const data = await fetch('/api/scanners').then(r => r.json());
    updateSummary(data);
    data.forEach(updateStatus);
  } catch (_) {}
}

/* ── Init ── */
async function init() {
  try {
    const data = await fetch('/api/scanners').then(r => r.json());
    scannerIds = data.map(s => s.id);

    const list = el('scanners-list');
    if (data.length === 0) {
      list.innerHTML = '<div class="empty"><div class="empty-icon">&#x1F4FB;</div><p>No scanners configured.<br>Add entries to <code>scanners.json</code> to get started.</p></div>';
      el('summary').textContent = '0 feeds configured';
      return;
    }

    list.innerHTML = data.map((s, i) => cardHTML(s, i)).join('');
    data.forEach(s => attachForm(s.id));
    updateSummary(data);
    data.forEach(updateStatus);

    // Load configs (for footer info)
    data.forEach(s => loadConfig(s.id));
  } catch (_) {
    el('summary').textContent = 'Could not connect to manager service';
  }
}

/* ── Add Scanner ── */
function toggleAdd() {
  const panel = el('add-panel');
  const btn   = el('btn-add');
  const open  = panel.style.display === 'none';
  panel.style.display = open ? 'block' : 'none';
  btn.classList.toggle('open', open);
  if (!open) el('add-form').reset();
}

document.addEventListener('DOMContentLoaded', () => {
  el('add-form').addEventListener('submit', async e => {
    e.preventDefault();
    const f = el('add-form');
    const body = {
      name:            f.name.value.trim(),
      scannerIp:       f.scannerIp.value.trim(),
      icecastServer:   f.icecastServer.value.trim(),
      icecastPort:     parseInt(f.icecastPort.value, 10) || 80,
      icecastMount:    f.icecastMount.value.trim(),
      icecastPassword: f.icecastPassword.value,
      feedName:        f.feedName.value.trim(),
      feedDescription: f.feedDescription.value.trim(),
    };
    const t = el('add-toast');
    const submitBtn = f.querySelector('button[type=submit]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Starting…';
    try {
      const d = await fetch('/api/scanners', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(r => r.json());
      if (d && d.ok) {
        t.textContent = (d.name || 'Scanner') + ' added and started — reloading…';
        t.className = 'toast ok';
        setTimeout(() => location.reload(), 1800);
      } else {
        t.textContent = 'Error: ' + (d && d.error ? d.error : 'Unknown error');
        t.className = 'toast err';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add & Start Scanner';
      }
    } catch (err) {
      t.textContent = 'Request failed: ' + err.message;
      t.className = 'toast err';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add & Start Scanner';
    }
  });
});

init();
setInterval(poll, 2000);
</script>
</body>
</html>`;
