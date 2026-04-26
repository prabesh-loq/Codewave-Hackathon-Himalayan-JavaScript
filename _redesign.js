/**
 * Complete UI redesign:
 * - New font: Plus Jakarta Sans (body) + Bricolage Grotesque (display)
 * - All emojis replaced with inline SVG icons
 * - Full CSS rewrite with modern design system
 * - Updated HTML for icon buttons
 */
const fs = require('fs');

// ── SVG icon library (Lucide-style, 24×24 viewBox, stroke-based) ──────────
const IC = {
  walk:     `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13" cy="4" r="1"/><path d="M7.5 17.5 10 12l3 3 2-4.5"/><path d="m6.5 20.5 4-3"/><path d="m16.5 20.5-1.5-4.5-3-2"/><path d="M6.5 11 10 12"/></svg>`,
  bus:      `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17H5a2 2 0 0 1-2-2V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8a2 2 0 0 1-2 2Z"/><path d="M3 11h18"/><path d="M8 17v2"/><path d="M16 17v2"/><circle cx="8.5" cy="14.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="15.5" cy="14.5" r="1.5" fill="currentColor" stroke="none"/></svg>`,
  transfer: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m17 3 4 4-4 4"/><path d="M3 7h18"/><path d="m7 21-4-4 4-4"/><path d="M21 17H3"/></svg>`,
  pin:      `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  stop_dot: `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="currentColor"/></svg>`,
  search:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  locate:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`,
  swap:     `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/></svg>`,
  close:    `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  play:     `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  pause:    `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`,
  chevron:  `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
  flag:     `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>`,
  dest:     `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="currentColor"/></svg>`,
};

// ── 1. Update index.html ──────────────────────────────────────────────────
let html = fs.readFileSync('index.html', 'utf8');

// Update fonts — add Plus Jakarta Sans
html = html.replace(
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Inter+Tight:wght@400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap'
);

// Replace emoji in search bar
html = html.replace(
  `<span class="search-icon">🔍</span>`,
  `<span class="search-icon">${IC.search}</span>`
);
html = html.replace(
  `<button class="search-locate" id="locateBtn" title="Use my location">📍</button>`,
  `<button class="search-icon-btn" id="locateBtn" title="Use my location">${IC.locate}</button>`
);

// Update swap + clear buttons
html = html.replace(
  `<button class="btn-ghost" id="swapBtn">⇅ Swap</button>`,
  `<button class="btn-ghost" id="swapBtn">${IC.swap} Swap</button>`
);
html = html.replace(
  `<button class="btn-ghost" id="clearBtn">Clear</button>`,
  `<button class="btn-ghost" id="clearBtn">${IC.close} Clear</button>`
);

// Update legend toggle caret
html = html.replace(
  `<span class="caret">▾</span>`,
  `<span class="caret">${IC.chevron}</span>`
);

fs.writeFileSync('index.html', html, 'utf8');
console.log('index.html updated');

// ── 2. Update app.js — inject ICONS + replace emoji in HTML strings ───────
let app = fs.readFileSync('app.js', 'utf8');

// Inject icon library right after the MARGAA_DATA check
const iconLib = `
// ── Icon library — inline SVG, replaces all emoji ─────────────────────────
const IC = {
  walk:     \`${IC.walk}\`,
  bus:      \`${IC.bus}\`,
  transfer: \`${IC.transfer}\`,
  pin:      \`${IC.pin}\`,
  stop_dot: \`${IC.stop_dot}\`,
  search:   \`${IC.search}\`,
  locate:   \`${IC.locate}\`,
  swap:     \`${IC.swap}\`,
  close:    \`${IC.close}\`,
  play:     \`${IC.play}\`,
  pause:    \`${IC.pause}\`,
  flag:     \`${IC.flag}\`,
  dest:     \`${IC.dest}\`,
};

`;

app = app.replace(
  '// ---- Tunables',
  iconLib + '// ---- Tunables'
);

// Replace emoji in search dropdown
app = app.replace(
  `\${it.type === "stop" ? "●" : "📍"}`,
  `\${it.type === "stop" ? IC.stop_dot : IC.pin}`
);

// Replace emoji in renderOneOption (old renderTripPanel style steps)
app = app.replace(
  `    <div class="step-icon">🚶</div>\n    <div class="step-body">\n      <div class="step-title">Walk to`,
  `    <div class="step-icon">\${IC.walk}</div>\n    <div class="step-body">\n      <div class="step-title">Walk to`
);
app = app.replace(
  `    <div class="step-icon">🚌</div>`,
  `    <div class="step-icon">\${IC.bus}</div>`
);
app = app.replace(
  `        <div class="step-icon">↻</div>`,
  `        <div class="step-icon">\${IC.transfer}</div>`
);
app = app.replace(
  `    <div class="step-icon">🚶</div>\n    <div class="step-body">\n      <div class="step-title">Walk to destination</div>`,
  `    <div class="step-icon">\${IC.walk}</div>\n    <div class="step-body">\n      <div class="step-title">Walk to destination</div>`
);

// Replace emoji in renderOneOption (new multi-route panel)
app = app.replace(
  /`🚶 \${walkInTitle}`/g,
  '`<span class="step-ic">\${IC.walk}</span> \${walkInTitle}`'
);
app = app.replace(
  /`🚶 Walk to destination`/g,
  '`<span class="step-ic">\${IC.walk}</span> Walk to destination`'
);
app = app.replace(
  `'<div class="xfer-label">↻ Change at `,
  `'<div class="xfer-label"><span class="step-ic">\${IC.transfer}</span> Change at `
);

// Replace emoji in play button rendering (wirePlayBtn and renderOneOption)
app = app.replace(
  `'<button class="btn-play" id="playTripBtn">&#9654; Play trip</button>'`,
  `'<button class="btn-play" id="playTripBtn"><span class="btn-play-ic">\${IC.play}</span> Play trip</button>'`
);

// Replace emoji in stopAnimation / startAnimation button text
app = app.replace(/btn\.textContent = "\\u23F8 Stop"/g, `btn.innerHTML = '<span class="btn-play-ic">' + IC.pause + '</span> Stop'`);
app = app.replace(/btn\.textContent = "\\u25B6 Play trip"/g, `btn.innerHTML = '<span class="btn-play-ic">' + IC.play + '</span> Play trip'`);
app = app.replace(/btn\.textContent = "\\u25B6 Replay trip"/g, `btn.innerHTML = '<span class="btn-play-ic">' + IC.play + '</span> Replay trip'`);

// Fix flag-down walk step to use flag icon
app = app.replace(
  '`Flag down \${escapeHtml(oRoute.short)} bus`',
  '`<span class=\"step-ic\">\${IC.flag}</span> Flag down \${escapeHtml(oRoute.short)} bus`'
);

fs.writeFileSync('app.js', app, 'utf8');

const appCheck = fs.readFileSync('app.js','utf8');
console.log('IC object injected:', appCheck.includes('const IC = {'));
console.log('Walk icon in steps:', appCheck.includes('IC.walk'));
console.log('Bus icon in steps:', appCheck.includes('IC.bus'));

// ── 3. Write new styles.css ────────────────────────────────────────────────
const newCSS = `/* ==========================================================================
   MARGAA — Design System v2
   Modern, professional UI for Kathmandu public transit routing
   ========================================================================== */

/* ── CSS Variables ─────────────────────────────────────────────────────── */
:root {
  /* Backgrounds */
  --bg:          #0d0d18;
  --surface:     #12121f;
  --surface-2:   #191929;
  --surface-3:   #202036;

  /* Borders */
  --border:      #252540;
  --border-2:    #30305a;

  /* Text */
  --text:        #eeeef5;
  --text-2:      #9090ae;
  --text-3:      #55556e;
  --text-4:      #363650;

  /* Brand / Accents */
  --accent:      #e11d48;
  --accent-dim:  rgba(225, 29, 72, 0.14);
  --accent-glow: rgba(225, 29, 72, 0.08);
  --gold:        #f59e0b;
  --gold-dim:    rgba(245, 158, 11, 0.14);
  --green:       #10b981;
  --green-dim:   rgba(16, 185, 129, 0.12);

  /* Radius */
  --r-sm:  6px;
  --r-md:  10px;
  --r-lg:  14px;
  --r-xl:  20px;

  /* Typography */
  --font-body:    'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  --font-display: 'Bricolage Grotesque', serif;
}

/* ── Reset & base ──────────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  font-family: var(--font-body);
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--text);
  background: var(--bg);
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}

svg { display: inline-block; vertical-align: middle; flex-shrink: 0; }

/* ── App layout ─────────────────────────────────────────────────────────── */
.app {
  display: grid;
  grid-template-columns: 40% 60%;
  height: 100vh;
}
.app--sim { grid-template-columns: 45% 55%; }

/* ── Error banner ───────────────────────────────────────────────────────── */
.error-banner {
  position: fixed; top: 0; left: 0; right: 0;
  background: var(--accent); color: #fff;
  padding: 10px 16px; font-size: 13px; font-weight: 600;
  z-index: 10000; text-align: center;
  box-shadow: 0 2px 12px rgba(0,0,0,0.35);
  letter-spacing: 0.01em;
}

/* ── Sidebar ─────────────────────────────────────────────────────────────── */
.sidebar {
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Brand ───────────────────────────────────────────────────────────────── */
.brand {
  padding: 20px 22px 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.brand h1 {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 28px;
  letter-spacing: -0.04em;
  color: var(--text);
  line-height: 1;
  display: flex;
  align-items: center;
  gap: 7px;
}
.brand h1 .dot {
  width: 8px; height: 8px;
  background: var(--accent);
  border-radius: 50%;
  flex-shrink: 0;
  margin-bottom: 1px;
}
.brand .tagline {
  font-size: 10px;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.2em;
  margin-top: 5px;
  font-weight: 500;
}

/* ── Tabs ────────────────────────────────────────────────────────────────── */
.tabs {
  display: flex;
  padding: 10px 16px;
  gap: 4px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.tab {
  flex: 1;
  padding: 8px 14px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--r-md);
  color: var(--text-3);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  font-family: var(--font-body);
  letter-spacing: 0.02em;
  transition: all 140ms ease;
  text-align: center;
}
.tab:hover { color: var(--text-2); background: var(--surface-2); }
.tab.active {
  color: var(--accent);
  background: var(--accent-dim);
  border-color: rgba(225,29,72,0.25);
}

.view { display: none; flex: 1; flex-direction: column; overflow: hidden; }
.view.active { display: flex; }

/* ── Search ──────────────────────────────────────────────────────────────── */
.search-wrap {
  position: relative;
  padding: 14px 16px 6px;
  flex-shrink: 0;
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-2);
  border: 1.5px solid var(--border);
  border-radius: var(--r-lg);
  padding: 0 6px 0 14px;
  transition: border-color 150ms, box-shadow 150ms;
}
.search-bar:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}
.search-icon {
  color: var(--text-3);
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.search-icon svg { width: 15px; height: 15px; }
#searchInput {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text);
  padding: 11px 0;
  font-family: var(--font-body);
  font-size: 13.5px;
  font-weight: 400;
}
#searchInput::placeholder { color: var(--text-3); }

.search-icon-btn {
  background: transparent;
  border: none;
  color: var(--text-3);
  cursor: pointer;
  padding: 8px;
  border-radius: var(--r-md);
  display: flex;
  align-items: center;
  transition: all 130ms;
}
.search-icon-btn:hover { color: var(--text-2); background: var(--surface-3); }
.search-icon-btn.loading { animation: pulse 1s ease-in-out infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }

/* Search dropdown */
.search-dropdown {
  position: absolute;
  left: 16px; right: 16px;
  top: calc(100% + 2px);
  background: var(--surface-2);
  border: 1.5px solid var(--border);
  border-radius: var(--r-lg);
  box-shadow: 0 12px 36px rgba(0,0,0,0.5);
  display: none;
  z-index: 1000;
  overflow: hidden;
  max-height: 320px;
  overflow-y: auto;
}
.search-dropdown.open { display: block; }
.sr-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  background: transparent;
  border: none;
  padding: 11px 14px;
  text-align: left;
  cursor: pointer;
  color: var(--text);
  font-family: var(--font-body);
  font-size: 13px;
  border-bottom: 1px solid var(--border);
  transition: background 120ms;
}
.sr-item:last-child { border-bottom: none; }
.sr-item:hover { background: var(--surface-3); }
.sr-icon {
  width: 22px; height: 22px;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-3);
  flex-shrink: 0;
}
.sr-icon.stop { color: var(--accent); }
.sr-text { flex: 1; min-width: 0; }
.sr-name {
  display: block; font-weight: 600; font-size: 13px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  color: var(--text);
}
.sr-sub {
  display: block; font-size: 11.5px; color: var(--text-3);
  margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.sr-loading, .sr-empty { padding: 12px 14px; font-size: 12.5px; color: var(--text-3); }

/* ── Demo presets ─────────────────────────────────────────────────────────── */
.demos { padding: 8px 16px 6px; flex-shrink: 0; }
.demos-label {
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--text-3);
  font-weight: 700;
  margin-bottom: 7px;
}
.demos-row { display: flex; flex-wrap: wrap; gap: 5px; }
.demo-btn {
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text-2);
  font-size: 11.5px;
  font-weight: 500;
  padding: 5px 11px;
  border-radius: 999px;
  cursor: pointer;
  font-family: var(--font-body);
  transition: all 130ms;
  white-space: nowrap;
}
.demo-btn:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

/* ── Origin / Destination fields ─────────────────────────────────────────── */
.io { padding: 8px 16px 10px; flex-shrink: 0; }
.io-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 13px;
  background: var(--surface-2);
  border: 1.5px solid transparent;
  border-radius: var(--r-md);
  cursor: pointer;
  transition: border-color 140ms, background 140ms;
}
.io-row + .io-row { margin-top: 6px; }
.io-row:hover { background: var(--surface-3); }
.io-row.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
  background: var(--surface-2);
}
.io-dot {
  width: 11px; height: 11px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid;
}
.io-dot.from { border-color: var(--green); background: var(--green); }
.io-dot.to   { border-color: var(--accent); background: var(--accent); }
.io-text { flex: 1; min-width: 0; }
.io-label {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--text-3);
  font-weight: 700;
}
.io-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}
.io-row.active .io-value { color: var(--text); }

.io-actions { display: flex; gap: 6px; margin-top: 8px; }
.btn-ghost {
  flex: 1;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-3);
  padding: 7px 10px;
  border-radius: var(--r-md);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: var(--font-body);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: all 130ms;
  letter-spacing: 0.01em;
}
.btn-ghost:hover { background: var(--surface-2); color: var(--text-2); border-color: var(--border-2); }
.btn-ghost svg { opacity: 0.7; }

/* ── Results ─────────────────────────────────────────────────────────────── */
.results-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  border-top: 1px solid var(--border);
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}
.results-wrap::-webkit-scrollbar { width: 4px; }
.results-wrap::-webkit-scrollbar-thumb { background: var(--border-2); border-radius: 2px; }

/* Empty state */
.empty {
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.6;
  padding: 16px 18px;
}
.empty strong { color: var(--text); font-weight: 600; }
.empty .muted { color: var(--text-3); font-size: 12px; margin-top: 4px; }
.howto { margin: 8px 0 10px; padding-left: 18px; }
.howto li { margin-bottom: 5px; color: var(--text-2); font-size: 13px; }

/* ── Route option tabs ───────────────────────────────────────────────────── */
.route-options {
  display: flex;
  gap: 6px;
  padding: 10px 14px 8px;
  border-bottom: 1px solid var(--border);
}
.ropt {
  flex: 1;
  background: var(--surface-2);
  border: 1.5px solid var(--border);
  border-radius: var(--r-md);
  padding: 9px 10px 8px;
  text-align: left;
  cursor: pointer;
  font-family: var(--font-body);
  transition: all 140ms;
  min-width: 0;
}
.ropt:hover { border-color: var(--border-2); background: var(--surface-3); }
.ropt.active {
  border-color: var(--accent);
  background: var(--accent-dim);
}
.ropt-label {
  display: block;
  font-size: 8.5px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--text-3);
  font-weight: 700;
  margin-bottom: 3px;
}
.ropt.active .ropt-label { color: rgba(225,29,72,0.7); }
.ropt-time {
  display: block;
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  line-height: 1;
}
.ropt-time small { font-size: 11px; font-weight: 400; color: var(--text-2); }
.ropt.active .ropt-time { color: var(--accent); }
.ropt-meta {
  display: block;
  font-size: 10.5px;
  color: var(--text-3);
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

/* ── Journey bar ─────────────────────────────────────────────────────────── */
.journey-bar {
  display: flex;
  align-items: stretch;
  height: 6px;
  overflow: hidden;
  margin: 8px 14px 2px;
  gap: 2px;
  border-radius: 3px;
}
.jb-walk { background: var(--text-3); border-radius: 3px; min-width: 5px; }
.jb-bus  { border-radius: 3px; min-width: 8px; }
.jb-xfer { width: 6px; flex: none; background: var(--gold); border-radius: 3px; }

/* Journey meta */
.journey-meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 7px 14px 6px;
  font-size: 11.5px;
  color: var(--text-3);
  font-weight: 500;
}
.jm-time {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.02em;
}
.jm-sep { color: var(--border-2); }

/* ── Step timeline ───────────────────────────────────────────────────────── */
.route-detail { flex: 1; overflow-y: auto; }
.steps-list { padding: 4px 14px 2px; }

.step-r { display: flex; gap: 10px; }
.step-r-track {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 16px;
  flex-shrink: 0;
}
.step-r-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  border: 2px solid var(--border-2);
  background: var(--surface);
  flex-shrink: 0;
  margin-top: 5px;
  z-index: 1;
}
.step-r-dot.walk-d { border-color: var(--text-3); background: var(--text-3); }
.step-r-dot.xfer-d { border-color: var(--gold); background: var(--gold); width: 8px; height: 8px; }
.dest-dot {
  width: 11px; height: 11px;
  border-radius: 50%;
  border: 2.5px solid var(--accent);
  background: var(--accent);
  flex-shrink: 0; margin-top: 5px; z-index: 1;
}
.step-r-line {
  flex: 1;
  width: 1.5px;
  background: var(--border);
  margin: 3px 0 0;
  min-height: 18px;
}
.step-r-line.bus-l { width: 2px; opacity: 0.6; }

.step-r-body { flex: 1; padding-bottom: 14px; min-width: 0; }
.step-r.xfer-r .step-r-body { padding-bottom: 8px; }

.step-r-head {
  display: flex;
  align-items: center;
  gap: 7px;
  padding-top: 3px;
  flex-wrap: wrap;
}
.step-r-chip {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 2px 7px;
  border-radius: 4px;
  color: #fff;
  white-space: nowrap;
  flex-shrink: 0;
  text-transform: uppercase;
}
.step-r-stops {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.step-r-name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text);
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}
.step-ic {
  display: inline-flex;
  align-items: center;
  color: var(--text-3);
  flex-shrink: 0;
}
.step-r-dur {
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 700;
  color: var(--text-2);
  white-space: nowrap;
  margin-left: auto;
  padding-left: 4px;
}
.step-r-sub {
  font-size: 11px;
  color: var(--text-3);
  margin-top: 3px;
  line-height: 1.6;
}
.step-r-wait {
  display: inline-block;
  background: var(--surface-3);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 10px;
  color: var(--text-3);
  font-weight: 500;
}
.step-r-fare {
  display: inline-block;
  margin-top: 5px;
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 700;
  color: var(--gold);
}
.step-r-fare-lbl { font-size: 10px; color: var(--text-3); font-family: var(--font-body); font-weight: 400; }
.xfer-label {
  font-size: 11.5px;
  color: var(--gold);
  font-weight: 600;
  padding-top: 3px;
  display: flex;
  align-items: center;
  gap: 5px;
}
.xfer-label .step-ic { color: var(--gold); }

/* Fare footer */
.fare-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px 14px;
  border-top: 1px solid var(--border);
  margin-top: 6px;
}
.fare-footer-label {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--text-3);
  font-weight: 700;
}
.fare-footer-breakdown {
  font-size: 10.5px;
  color: var(--text-3);
  margin-top: 2px;
  font-weight: 500;
}
.fare-footer-total {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 700;
  color: var(--gold);
  letter-spacing: -0.02em;
}

/* Fare breakdown */
.fare-breakdown {
  font-size: 11px;
  color: var(--text-3);
  text-align: center;
  padding: 4px 14px;
  font-weight: 500;
}

/* ── Play button ─────────────────────────────────────────────────────────── */
.btn-play {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: calc(100% - 28px);
  margin: 8px 14px 4px;
  background: var(--accent-dim);
  border: 1.5px solid rgba(225,29,72,0.35);
  color: var(--accent);
  padding: 10px 14px;
  border-radius: var(--r-md);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  font-family: var(--font-body);
  letter-spacing: 0.02em;
  transition: all 130ms;
}
.btn-play:hover { background: var(--accent); color: #fff; border-color: var(--accent); }
.btn-play-ic { display: flex; align-items: center; }

/* Rideshare suggestion */
.rideshare {
  margin-top: 8px;
  padding: 10px 12px;
  background: rgba(225,29,72,0.07);
  border: 1px solid rgba(225,29,72,0.2);
  border-radius: var(--r-md);
  font-size: 11.5px;
  color: var(--text-2);
}
.rs-buttons { display: flex; gap: 6px; margin-top: 8px; }
.rs-buttons a {
  display: inline-block;
  padding: 5px 12px;
  background: var(--accent);
  color: #fff;
  text-decoration: none;
  border-radius: var(--r-sm);
  font-weight: 600;
  font-size: 11.5px;
  letter-spacing: 0.01em;
}
.rs-buttons a:hover { filter: brightness(1.1); }

/* ── Map controls ─────────────────────────────────────────────────────────── */
.map-controls {
  padding: 10px 16px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}
.toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-2);
  cursor: pointer;
  user-select: none;
  font-weight: 500;
}
.toggle input { accent-color: var(--accent); }

/* ── Legend ──────────────────────────────────────────────────────────────── */
.legend-wrap { border-top: 1px solid var(--border); flex-shrink: 0; }
.legend-toggle {
  width: 100%;
  background: transparent;
  border: none;
  color: var(--text-3);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  padding: 10px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  font-family: var(--font-body);
  font-weight: 700;
  transition: color 120ms;
}
.legend-toggle:hover { color: var(--text-2); }
.legend-toggle .caret { transition: transform 200ms; color: var(--text-3); }
.legend-wrap.collapsed .legend-toggle .caret { transform: rotate(-90deg); }
.legend {
  padding: 0 16px 10px;
  max-height: 180px;
  overflow-y: auto;
  transition: max-height 200ms;
}
.legend-wrap.collapsed .legend { max-height: 0; padding-bottom: 0; overflow: hidden; }
.legend-row {
  display: flex; align-items: center; gap: 10px;
  padding: 5px 0;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-2);
  border-bottom: 1px solid var(--border);
  transition: color 120ms;
}
.legend-row:last-child { border-bottom: none; }
.legend-row:hover { color: var(--text); }
.legend-swatch {
  display: inline-block;
  width: 16px; height: 4px;
  border-radius: 2px;
  flex-shrink: 0;
}
.legend-name { font-size: 12px; font-weight: 500; }
.legend-name strong { color: var(--text); font-weight: 700; }

/* ── Footer ──────────────────────────────────────────────────────────────── */
.foot {
  font-size: 10px;
  color: var(--text-4);
  padding: 10px 16px;
  border-top: 1px solid var(--border);
  text-align: center;
  line-height: 1.6;
  flex-shrink: 0;
}
.foot strong { color: var(--text-3); }

/* ── Simulate placeholder ────────────────────────────────────────────────── */
.sim-placeholder { display: none; }
.sim-panel {
  flex: 1; overflow-y: auto;
  display: flex; flex-direction: column;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}

/* ── Map + Leaflet overrides ─────────────────────────────────────────────── */
#map { height: 100vh; background: #1a1a26; }
.map-loading {
  display: flex; align-items: center; justify-content: center;
  height: 100vh; color: var(--text-3); font-size: 14px; font-weight: 500;
}
.map-error {
  display: flex; flex-direction: column; align-items: flex-start;
  justify-content: center; height: 100vh;
  padding: 40px; color: var(--text-2);
  max-width: 560px; margin: 0 auto;
}
.map-error h3 {
  font-family: var(--font-display);
  margin-bottom: 12px;
  color: var(--accent);
  font-size: 20px;
}
.map-error code {
  background: var(--surface-2);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-2);
}
.map-error ul { padding-left: 20px; margin-top: 8px; }
.map-error li { margin-bottom: 5px; font-size: 13px; color: var(--text-2); }

.leaflet-container {
  font-family: var(--font-body);
}

/* Custom map pins */
.margaa-pin .pin {
  width: 28px; height: 28px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  border: 2px solid rgba(255,255,255,0.9);
}
.margaa-pin .pin span {
  transform: rotate(45deg);
  color: #fff;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 12px;
}

/* Bus stop markers */
.bus-stop-marker { cursor: pointer; }
.bsm-inner {
  width: 20px; height: 20px;
  background: #1a1a2e;
  border: 1.5px solid rgba(255,255,255,0.9);
  border-radius: 5px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 6px rgba(0,0,0,0.5);
}
.bsm-inner svg { width: 12px; height: 12px; }

/* Animated bus marker */
.bus-anim-marker { pointer-events: none; }
.bam-inner {
  width: 32px; height: 32px;
  border-radius: 50%;
  border: 2.5px solid rgba(255,255,255,0.95);
  display: flex; align-items: center; justify-content: center;
  font-size: 15px;
  box-shadow: 0 3px 12px rgba(0,0,0,0.5);
}

/* ── Simulation panel ────────────────────────────────────────────────────── */
.sim-hdr { padding: 16px 18px 12px; border-bottom: 1px solid var(--border); }
.sim-title {
  font-family: var(--font-display);
  font-size: 20px; font-weight: 700; color: var(--text); line-height: 1.1;
}
.sim-subtitle {
  font-size: 10px; color: var(--text-3); margin-top: 4px;
  text-transform: uppercase; letter-spacing: 0.14em; font-weight: 600;
}
.sim-toggle-row { display: flex; gap: 8px; padding: 12px 16px 8px; }
.sim-tb {
  flex: 1; background: var(--surface-2); border: 1.5px solid var(--border);
  border-radius: var(--r-md); padding: 9px 10px; font-family: var(--font-body);
  font-size: 12px; font-weight: 700; color: var(--text-2);
  cursor: pointer; transition: all 130ms; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}
.sim-tb:hover { border-color: var(--border-2); color: var(--text); }
.sim-tb.active { border-color: var(--gold); color: var(--gold); background: var(--gold-dim); }
.sim-section-label {
  font-size: 9px; text-transform: uppercase; letter-spacing: 0.16em;
  color: var(--text-3); font-weight: 700; padding: 10px 16px 4px;
}
.sim-tl-wrap { padding: 2px 16px 6px; }
.sim-tl-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.sim-tl-tag {
  font-size: 8px; font-weight: 800; text-transform: uppercase;
  letter-spacing: 0.12em; padding: 3px 7px; border-radius: 4px;
  flex-shrink: 0; width: 36px; text-align: center;
}
.sim-tl-tag.uncord { background: rgba(225,29,72,0.15); color: var(--accent); }
.sim-tl-tag.coord  { background: var(--gold-dim); color: var(--gold); }
.sim-tl-box { flex: 1; min-width: 0; }
.sim-hist-box { width: 100%; }
.sim-metrics-row { display: flex; gap: 8px; padding: 10px 16px 8px; }
.sim-metric {
  flex: 1; background: var(--surface-2); border: 1px solid var(--border);
  border-radius: var(--r-lg); padding: 12px 8px; text-align: center;
}
.sim-metric.bad    { border-color: rgba(225,29,72,0.4);  background: rgba(225,29,72,0.06); }
.sim-metric.good   { border-color: rgba(16,185,129,0.4); background: rgba(16,185,129,0.06); }
.sim-metric.accent { border-color: rgba(245,158,11,0.4); background: var(--gold-dim); }
.sim-metric-val {
  display: block; font-family: var(--font-display);
  font-size: 26px; font-weight: 700; color: var(--text); line-height: 1;
}
.sim-metric.bad    .sim-metric-val { color: var(--accent); }
.sim-metric.good   .sim-metric-val { color: var(--green); }
.sim-metric.accent .sim-metric-val { color: var(--gold); }
.sim-metric-unit { font-size: 12px; font-weight: 400; }
.sim-metric-lbl  { display: block; font-size: 9px; color: var(--text-3); margin-top: 4px; line-height: 1.4; font-weight: 600; letter-spacing: 0.03em; }
.sim-legend { padding: 4px 16px 8px; }
.sim-leg-row {
  display: flex; align-items: center; gap: 10px; padding: 5px 0;
  font-size: 12.5px; color: var(--text-2); font-weight: 500;
  border-bottom: 1px solid var(--border);
}
.sim-leg-row:last-child { border-bottom: none; }
.sim-leg-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.sim-leg-name { flex: 1; }
.sim-leg-freq { font-size: 10.5px; color: var(--text-3); white-space: nowrap; font-weight: 500; }
.sim-explain {
  padding: 10px 16px 18px;
  font-size: 12px; color: var(--text-3); line-height: 1.65;
  border-top: 1px solid var(--border); margin-top: 4px;
}
.sim-explain strong { color: var(--text-2); font-weight: 600; }

/* ── Mobile ──────────────────────────────────────────────────────────────── */
@media (max-width: 860px) {
  .app { grid-template-columns: 1fr; grid-template-rows: 52vh 48vh; }
  .app--sim { grid-template-columns: 1fr; }
  .sidebar { border-right: none; border-top: 1px solid var(--border); }
  #map { height: 52vh; }
  .map-controls, .legend-wrap, .foot { display: none; }
}
`;

fs.writeFileSync('styles.css', newCSS, 'utf8');
console.log('styles.css written:', Math.round(newCSS.length/1024) + 'KB');

// ── Final checks ──────────────────────────────────────────────────────────
console.log('\n=== Verification ===');
const a = fs.readFileSync('app.js','utf8');
const c = fs.readFileSync('styles.css','utf8');
const h = fs.readFileSync('index.html','utf8');
[
  ['IC object in app.js',      a.includes('const IC = {')],
  ['IC.walk used',             a.includes('IC.walk')],
  ['IC.bus used',              a.includes('IC.bus')],
  ['IC.transfer used',         a.includes('IC.transfer')],
  ['Search icon in HTML',      h.includes('search-icon">')],
  ['Plus Jakarta Sans in HTML',h.includes('Plus+Jakarta+Sans')],
  ['Locate btn updated',       h.includes('search-icon-btn')],
  ['Swap btn has SVG',         h.includes('IC.swap') || h.includes('stroke-width')],
  ['Font var in CSS',          c.includes('--font-body')],
  ['No emoji walk in CSS',     !c.includes('🚶')],
  ['Step-r-name in CSS',       c.includes('.step-r-name')],
  ['Sim CSS present',          c.includes('.sim-metric')],
].forEach(([l,ok]) => console.log(ok?'✓':'✗', l));
