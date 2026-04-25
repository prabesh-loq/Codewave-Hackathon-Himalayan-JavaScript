// =========================================================================
// MARGAA — Routing engine + map UI (Part 1, defensive build)
// =========================================================================
//
// Initialization order:
//   1. Top-level error handler — surfaces any JS errors visibly
//   2. Static UI render (demos, legend, stats, empty state, tabs)
//      → works WITHOUT Leaflet, so the page is never silently dead
//   3. Map init (wrapped in try/catch) — falls back to error message
//   4. Map-dependent handlers (search, click, swap, clear, etc.)
// =========================================================================

// ---- 1. Top-level error handler ---------------------------------------
window.addEventListener("error", (e) => {
  showErrorBanner("JavaScript error: " + (e.message || "unknown") +
    " (open browser console with F12 for details)");
});
window.addEventListener("unhandledrejection", (e) => {
  showErrorBanner("Promise error: " + (e.reason && e.reason.message ? e.reason.message : e.reason));
});

function showErrorBanner(msg) {
  const el = document.getElementById("errorBanner");
  if (!el) return;
  el.hidden = false;
  el.textContent = msg;
}

// ---- Pull data ---------------------------------------------------------
if (!window.MARGAA_DATA) {
  showErrorBanner("data.js failed to load — check that data.js is in the same folder as index.html.");
  throw new Error("MARGAA_DATA missing");
}
// STOPS, ROUTES, STOP_BY_ID are already declared as globals by data.js.
// Re-declaring them here with const would throw a SyntaxError in any browser
// because both scripts share the same global lexical scope.

// ---- Tunables ----------------------------------------------------------
const TRANSFER_PENALTY_KM = 1.5;
const MAX_WALK_M          = 1500;
const COMFORT_WALK_M      = 600;
const WALK_SPEED_KMH      = 4.5;
const BUS_SPEED_KMH       = 18;
const KTM_BBOX = { south: 27.58, west: 85.18, north: 27.82, east: 85.55 };

// =========================================================================
// Geometry / graph / Dijkstra (pure, no DOM, no Leaflet)
// =========================================================================
const toRad = d => d * Math.PI / 180;
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
          + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const distMeters = (a, b) => haversineKm(a.lat, a.lon, b.lat, b.lon) * 1000;

function buildGraph() {
  const adj = {};
  STOPS.forEach(s => { adj[s.id] = []; });
  ROUTES.forEach(route => {
    for (let i = 0; i < route.stops.length - 1; i++) {
      const aId = route.stops[i], bId = route.stops[i + 1];
      if (aId === bId) continue;
      const a = STOP_BY_ID[aId], b = STOP_BY_ID[bId];
      if (!a || !b) continue;
      const dKm = haversineKm(a.lat, a.lon, b.lat, b.lon);
      adj[aId].push({ to: bId, routeId: route.id, dKm });
      adj[bId].push({ to: aId, routeId: route.id, dKm });
    }
  });
  return adj;
}
const ADJ = buildGraph();

class MinHeap {
  constructor(cmp) { this._h = []; this._cmp = cmp; }
  push(v) {
    this._h.push(v);
    let i = this._h.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this._cmp(this._h[i], this._h[p]) >= 0) break;
      [this._h[i], this._h[p]] = [this._h[p], this._h[i]];
      i = p;
    }
  }
  pop() {
    const top = this._h[0];
    const last = this._h.pop();
    if (this._h.length > 0) {
      this._h[0] = last;
      let i = 0;
      for (;;) {
        let s = i, l = 2 * i + 1, r = 2 * i + 2;
        if (l < this._h.length && this._cmp(this._h[l], this._h[s]) < 0) s = l;
        if (r < this._h.length && this._cmp(this._h[r], this._h[s]) < 0) s = r;
        if (s === i) break;
        [this._h[i], this._h[s]] = [this._h[s], this._h[i]];
        i = s;
      }
    }
    return top;
  }
  get size() { return this._h.length; }
}

function findPath(startId, endId) {
  if (startId === endId) return { cost: 0, transfers: 0, path: [{ stop: startId, route: null }] };
  const visited = Object.create(null);
  const heap = new MinHeap((a, b) => a.cost - b.cost);
  heap.push({ cost: 0, transfers: 0, stop: startId, route: null, path: [{ stop: startId, route: null }] });
  while (heap.size) {
    const cur = heap.pop();
    if (cur.stop === endId) return cur;
    const key = cur.stop + "|" + cur.route;
    if (visited[key] !== undefined && visited[key] <= cur.cost) continue;
    visited[key] = cur.cost;
    for (const edge of ADJ[cur.stop] || []) {
      const isTransfer = cur.route !== null && cur.route !== edge.routeId;
      const cost = cur.cost + edge.dKm + (isTransfer ? TRANSFER_PENALTY_KM : 0);
      heap.push({
        cost, transfers: cur.transfers + (isTransfer ? 1 : 0),
        stop: edge.to, route: edge.routeId,
        path: cur.path.concat([{ stop: edge.to, route: edge.routeId }]),
      });
    }
  }
  return null;
}

function pathToLegs(path) {
  const legs = [];
  let cur = null;
  for (let i = 1; i < path.length; i++) {
    const step = path[i];
    if (!cur || cur.routeId !== step.route) {
      if (cur) legs.push(cur);
      cur = { routeId: step.route, stops: [path[i - 1].stop, step.stop] };
    } else {
      cur.stops.push(step.stop);
    }
  }
  if (cur) legs.push(cur);
  return legs;
}

function legDistanceKm(leg) {
  let d = 0;
  for (let i = 0; i < leg.stops.length - 1; i++) {
    const a = STOP_BY_ID[leg.stops[i]], b = STOP_BY_ID[leg.stops[i + 1]];
    d += haversineKm(a.lat, a.lon, b.lat, b.lon);
  }
  return d;
}

function nearestStop(latlng) {
  let best = null, bestD = Infinity;
  for (const s of STOPS) {
    const d = distMeters({ lat: latlng.lat, lon: latlng.lng }, s);
    if (d < bestD) { bestD = d; best = s; }
  }
  return { stop: best, distM: bestD };
}

// Projects pt onto segment a→b; returns metres to closest point + t ∈ [0,1]
function projectPointToSegment(pt, a, b) {
  const cosLat = Math.cos(toRad((a.lat + b.lat) / 2));
  const mLat = 111320;
  const mLon = mLat * cosLat;
  const px = (pt.lon - a.lon) * mLon, py = (pt.lat - a.lat) * mLat;
  const dx = (b.lon - a.lon) * mLon, dy = (b.lat - a.lat) * mLat;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / len2));
  return {
    dist: Math.sqrt((px - t * dx) ** 2 + (py - t * dy) ** 2),
    snapLat: a.lat + t * (b.lat - a.lat),
    snapLon: a.lon + t * (b.lon - a.lon),
    t,
  };
}

// Finds nearest point on ANY route line (not just nearest stop).
// In Nepal buses are flagged anywhere along the route — not only at stops.
function nearestRoutePoint(latlng) {
  const pt = { lat: latlng.lat, lon: latlng.lng };
  let bestDist = Infinity, bestStop = null, bestRouteId = null;
  let bestSnapLat = null, bestSnapLon = null;

  for (const route of ROUTES) {
    for (let i = 0; i < route.stops.length - 1; i++) {
      const aId = route.stops[i], bId = route.stops[i + 1];
      if (aId === bId) continue;
      const a = STOP_BY_ID[aId], b = STOP_BY_ID[bId];
      if (!a || !b) continue;
      const proj = projectPointToSegment(pt, a, b);
      if (proj.dist < bestDist) {
        bestDist     = proj.dist;
        bestSnapLat  = proj.snapLat;
        bestSnapLon  = proj.snapLon;
        bestRouteId  = route.id;
        // Routing node = whichever stop is closer to the tap
        const dA = distMeters(pt, a), dB = distMeters(pt, b);
        bestStop = dA <= dB ? a : b;
      }
    }
  }
  return {
    stop: bestStop,
    distM: Math.round(bestDist),
    routeId: bestRouteId,
    snapLat: bestSnapLat,
    snapLon: bestSnapLon,
  };
}

function planTrip(originLatLng, destLatLng) {
  const o = nearestRoutePoint(originLatLng);
  const d = nearestRoutePoint(destLatLng);
  if (!o.stop || !d.stop) return { error: "No stops in dataset." };

  if (o.stop.id === d.stop.id) {
    const directM = Math.round(distMeters(
      { lat: originLatLng.lat, lon: originLatLng.lng },
      { lat: destLatLng.lat,   lon: destLatLng.lng }
    ));
    return {
      walkOnly: true, originStop: o, destStop: d, directM,
      message: "Both points are closest to the same bus stop. Walking or rideshare is faster."
    };
  }

  const result = findPath(o.stop.id, d.stop.id);
  if (!result) return { error: "No public transport path found between these stops.", originStop: o, destStop: d };

  const legs = pathToLegs(result.path);
  let totalMin = 0;
  totalMin += (o.distM / 1000) / WALK_SPEED_KMH * 60;
  totalMin += (d.distM / 1000) / WALK_SPEED_KMH * 60;
  legs.forEach((leg, i) => {
    const route = ROUTES.find(r => r.id === leg.routeId);
    const speed = (route && route.avgSpeedKmh) || BUS_SPEED_KMH;
    totalMin += legDistanceKm(leg) / speed * 60;
    const headway = route ? route.frequencyMin : 10;
    totalMin += (i === 0 ? headway / 2 : headway);
  });

  return {
    originStop: o, destStop: d, legs,
    transfers: legs.length - 1,
    totalCostKm: result.cost,
    totalMin: Math.max(1, Math.round(totalMin)),
  };
}


// =========================================================================
// Multi-route planning — returns up to 3 distinct route options
// =========================================================================

// Dijkstra with configurable transfer penalty (lets us bias toward
// fewer changes or more changes depending on the variant).
function findPathWithPenalty(startId, endId, penalty) {
  if (startId === endId) return { cost: 0, transfers: 0, path: [{ stop: startId, route: null }] };
  const visited = Object.create(null);
  const heap = new MinHeap((a, b) => a.cost - b.cost);
  heap.push({ cost: 0, transfers: 0, stop: startId, route: null, path: [{ stop: startId, route: null }] });
  while (heap.size) {
    const cur = heap.pop();
    if (cur.stop === endId) return cur;
    const key = cur.stop + '|' + cur.route;
    if (visited[key] !== undefined && visited[key] <= cur.cost) continue;
    visited[key] = cur.cost;
    for (const edge of ADJ[cur.stop] || []) {
      const isTransfer = cur.route !== null && cur.route !== edge.routeId;
      const cost = cur.cost + edge.dKm + (isTransfer ? penalty : 0);
      heap.push({
        cost, transfers: cur.transfers + (isTransfer ? 1 : 0),
        stop: edge.to, route: edge.routeId,
        path: cur.path.concat([{ stop: edge.to, route: edge.routeId }]),
      });
    }
  }
  return null;
}

function buildTripOption(o, d, result) {
  const legs = pathToLegs(result.path);
  let totalMin = 0;
  totalMin += (o.distM / 1000) / WALK_SPEED_KMH * 60;
  totalMin += (d.distM / 1000) / WALK_SPEED_KMH * 60;

  const legDetails = legs.map((leg, i) => {
    const route = ROUTES.find(r => r.id === leg.routeId);
    const speed  = (route && route.avgSpeedKmh) || BUS_SPEED_KMH;
    const distKm = legDistanceKm(leg);
    const headway = route ? route.frequencyMin : 10;
    const waitMin  = i === 0 ? headway / 2 : headway;
    const travelMin = distKm / speed * 60;
    totalMin += waitMin + travelMin;
    return {
      routeId: leg.routeId, stops: leg.stops, route,
      distKm, travelMin: Math.round(travelMin),
      waitMin: Math.round(waitMin), fare: calcFare(distKm),
      intermediate: leg.stops.length - 2,
    };
  });

  return {
    originStop: o, destStop: d, legs: legDetails,
    transfers: legs.length - 1,
    totalMin: Math.max(1, Math.round(totalMin)),
    totalFare: legDetails.reduce((s, l) => s + l.fare, 0),
    walkInM: Math.round(o.distM), walkOutM: Math.round(d.distM),
  };
}

function planMultipleTrips(originLatLng, destLatLng) {
  const o = nearestRoutePoint(originLatLng);
  const d = nearestRoutePoint(destLatLng);
  if (!o.stop || !d.stop) return { type: 'error', message: 'No stops in dataset.' };

  if (o.stop.id === d.stop.id) {
    const directM = Math.round(distMeters(
      { lat: originLatLng.lat, lon: originLatLng.lng },
      { lat: destLatLng.lat,   lon: destLatLng.lng }
    ));
    return { type: 'walk', directM,
      message: 'Both points are closest to the same bus stop. Walking or rideshare is faster.' };
  }

  const seen = new Set();
  const options = [];
  // Three penalty values: balanced / strongly avoid transfers / willing to transfer
  for (const penalty of [1.5, 14, 0.4]) {
    const result = findPathWithPenalty(o.stop.id, d.stop.id, penalty);
    if (!result) continue;
    const legs = pathToLegs(result.path);
    const key  = legs.map(l => l.routeId).join(':');
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(buildTripOption(o, d, result));
    if (options.length >= 3) break;
  }

  if (!options.length) return { type: 'error', message: 'No public transport route found.' };

  // Sort fastest first, then label
  options.sort((a, b) => a.totalMin - b.totalMin);
  const minT = options[0].transfers;
  options.forEach((opt, i) => {
    if (i === 0)                opt.label = 'Fastest';
    else if (opt.transfers < options[0].transfers) opt.label = 'Fewest changes';
    else if (opt.transfers === minT)               opt.label = 'Alternative';
    else                                           opt.label = opt.transfers + ' changes';
  });

  return { type: 'routes', options };
}

// =========================================================================
// 2. Static UI rendering (works without Leaflet)
// =========================================================================

const DEMO_TRIPS = [
  { id: "demo1", label: "Gokarna → Jawalakhel",     from: "gokarna",        to: "jawalakhel" },
  { id: "demo2", label: "Bhaktapur → Kirtipur",     from: "bhaktapur",      to: "kirtipur"   },
  { id: "demo3", label: "Budhanilkantha → Airport", from: "budhanilkantha", to: "airport"    },
];

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[c]));
}

function emptyState() {
  return `<div class="empty">
    <p><strong>Plan a trip in three ways</strong></p>
    <ul class="howto">
      <li>Search any place above</li>
      <li>Tap two points on the map</li>
      <li>Click a bus stop circle</li>
    </ul>
    <p class="muted">Or click a demo trip below the search bar to see Margaa work end-to-end.</p>
  </div>`;
}

function formatMeters(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}

function calcFare(distKm) {
  if (distKm <= 5)  return 24;
  if (distKm <= 10) return 33;
  if (distKm <= 15) return 39;
  if (distKm <= 20) return 44;
  return 50;
}

function rideshareSuggestion(m) {
  return `<div class="rideshare">
    <span>This stretch is ${formatMeters(m)} — try a rideshare:</span>
    <div class="rs-buttons">
      <a href="https://pathao.com/np/" target="_blank" rel="noopener">Pathao</a>
      <a href="https://indrive.com/en/cities/np/kathmandu/" target="_blank" rel="noopener">inDrive</a>
    </div>
  </div>`;
}

function renderStaticUI() {
  // Stats line
  const stats = document.getElementById("statsLine");
  if (stats) stats.textContent = `${ROUTES.length} lines · ${STOPS.length} stops · Kathmandu Valley`;

  // Empty state
  const results = document.getElementById("results");
  if (results) results.innerHTML = emptyState();

  // Demo buttons (don't depend on map)
  const wrap = document.getElementById("demoTrips");
  if (wrap) {
    wrap.innerHTML = DEMO_TRIPS.map((d, i) =>
      `<button class="demo-btn" data-i="${i}">${escapeHtml(d.label)}</button>`
    ).join("");
    wrap.querySelectorAll(".demo-btn").forEach(b => {
      b.addEventListener("click", () => loadDemoTrip(DEMO_TRIPS[parseInt(b.dataset.i)]));
    });
  }

  // Legend
  const legend = document.getElementById("legend");
  if (legend) {
    legend.innerHTML = ROUTES.map(r =>
      `<div class="legend-row" data-rid="${r.id}">
        <span class="legend-swatch" style="background:${r.color}"></span>
        <span class="legend-name"><strong>${escapeHtml(r.short)}</strong> · ${escapeHtml(r.name)}</span>
      </div>`
    ).join("");
    legend.querySelectorAll(".legend-row").forEach(row => {
      row.addEventListener("mouseenter", () => highlightRoute(row.dataset.rid, true));
      row.addEventListener("mouseleave", () => highlightRoute(row.dataset.rid, false));
    });
  }

  // Legend collapse
  const lt = document.getElementById("legendToggle");
  if (lt) lt.addEventListener("click", () => {
    document.getElementById("legendWrap").classList.toggle("collapsed");
  });

  // Tabs
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const view = tab.dataset.view;
      document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.dataset.view === view));
      if (view !== "plan") stopAnimation();
    });
  });

  // From/To row clicks
  const oRow = document.getElementById("originRow");
  const dRow = document.getElementById("destRow");
  if (oRow) oRow.addEventListener("click", () => setActiveField("origin"));
  if (dRow) dRow.addEventListener("click", () => setActiveField("destination"));

  // Swap & clear
  const swap = document.getElementById("swapBtn");
  if (swap) swap.addEventListener("click", swapEndpoints);
  const clr = document.getElementById("clearBtn");
  if (clr) clr.addEventListener("click", clearAll);

  // Locate
  const loc = document.getElementById("locateBtn");
  if (loc) loc.addEventListener("click", useMyLocation);

  // Search
  setupSearch();
}

// =========================================================================
// Endpoint state (independent of map; map updates pins reactively)
// =========================================================================
let origin = null;
let destination = null;
let activeField = "origin";
let activeOptions = null;
let activeOptionIdx = 0;

function setActiveField(f) {
  activeField = f;
  const o = document.getElementById("originRow");
  const d = document.getElementById("destRow");
  if (o) o.classList.toggle("active", f === "origin");
  if (d) d.classList.toggle("active", f === "destination");
}

function setEndpoint(field, latLng, label) {
  const ep = {
    lat: latLng.lat, lng: latLng.lng,
    label: label || `${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)}`,
  };
  if (field === "origin") {
    origin = ep;
    const el = document.getElementById("originLabel");
    if (el) el.textContent = ep.label;
  } else {
    destination = ep;
    const el = document.getElementById("destLabel");
    if (el) el.textContent = ep.label;
  }
  refreshPins();
  if (origin && destination) computeAndRender();
}

function swapEndpoints() {
  if (!origin && !destination) return;
  [origin, destination] = [destination, origin];
  document.getElementById("originLabel").textContent = origin ? origin.label : "Tap on map, search, or pick a stop";
  document.getElementById("destLabel").textContent   = destination ? destination.label : "Tap on map, search, or pick a stop";
  refreshPins();
  if (origin && destination) computeAndRender();
}

function clearAll() {
  origin = null;
  destination = null;
  activeOptions = null; activeOptionIdx = 0;
  const ol = document.getElementById("originLabel");
  const dl = document.getElementById("destLabel");
  if (ol) ol.textContent = "Tap on map, search, or pick a stop";
  if (dl) dl.textContent = "Tap on map, search, or pick a stop";
  if (userLayer) userLayer.clearLayers();
  if (tripLayer) tripLayer.clearLayers();
  stopAnimation();
  document.getElementById("results").innerHTML = emptyState();
  setActiveField("origin");
  const si = document.getElementById("searchInput");
  if (si) si.value = "";
  hideSearchDropdown();
}

function loadDemoTrip(d) {
  if (!d) return;
  const f = STOP_BY_ID[d.from], t = STOP_BY_ID[d.to];
  if (!f || !t) { showErrorBanner("Demo trip references unknown stop."); return; }
  origin      = { lat: f.lat, lng: f.lon, label: f.name };
  destination = { lat: t.lat, lng: t.lon, label: t.name };
  document.getElementById("originLabel").textContent = f.name;
  document.getElementById("destLabel").textContent   = t.name;
  refreshPins();
  computeAndRender();
}

// =========================================================================
// Search bar (Nominatim, debounced, KTM-bounded) — does NOT need the map
// =========================================================================
let searchTimer = null;
let lastQuery = "";

function setupSearch() {
  const searchInput    = document.getElementById("searchInput");
  const searchDropdown = document.getElementById("searchDropdown");
  if (!searchInput || !searchDropdown) return;

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim();
    if (q.length < 2) { hideSearchDropdown(); return; }
    if (q === lastQuery) return;
    lastQuery = q;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => runSearch(q), 250);
  });

  searchInput.addEventListener("focus", () => {
    if (searchInput.value.trim().length >= 2) runSearch(searchInput.value.trim());
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrap")) hideSearchDropdown();
  });
}

function hideSearchDropdown() {
  const sd = document.getElementById("searchDropdown");
  if (!sd) return;
  sd.classList.remove("open");
  sd.innerHTML = "";
}

function showSearchDropdown(items) {
  const sd = document.getElementById("searchDropdown");
  if (!sd) return;
  if (!items.length) {
    sd.innerHTML = `<div class="sr-empty">No matches in Kathmandu.</div>`;
    sd.classList.add("open");
    return;
  }
  sd.innerHTML = items.map((it, i) => {
    if (it.type === "loading") return `<div class="sr-loading">Searching the map…</div>`;
    return `<button class="sr-item" data-idx="${i}">
      <span class="sr-icon ${it.type}">${it.type === "stop" ? "●" : "📍"}</span>
      <span class="sr-text">
        <span class="sr-name">${escapeHtml(it.name)}</span>
        ${it.sub ? `<span class="sr-sub">${escapeHtml(it.sub)}</span>` : ""}
      </span>
    </button>`;
  }).join("");
  sd.classList.add("open");
  sd.querySelectorAll(".sr-item").forEach(el => {
    el.addEventListener("click", () => {
      const idx = parseInt(el.dataset.idx);
      const it = items[idx];
      setEndpoint(activeField, { lat: it.lat, lng: it.lon }, it.name);
      if (map) map.setView([it.lat, it.lon], 14);
      setActiveField(activeField === "origin" ? "destination" : "origin");
      document.getElementById("searchInput").value = "";
      hideSearchDropdown();
    });
  });
}

async function runSearch(q) {
  const ql = q.toLowerCase();
  const stopMatches = STOPS
    .filter(s => s.name.toLowerCase().includes(ql))
    .slice(0, 4)
    .map(s => ({ type: "stop", name: s.name, sub: "Bus stop", lat: s.lat, lon: s.lon }));

  showSearchDropdown([...stopMatches, { type: "loading" }]);

  try {
    const url = `https://nominatim.openstreetmap.org/search`
      + `?q=${encodeURIComponent(q)}`
      + `&format=json&limit=5`
      + `&viewbox=${KTM_BBOX.west},${KTM_BBOX.north},${KTM_BBOX.east},${KTM_BBOX.south}`
      + `&bounded=1`;
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) throw new Error("search failed");
    const data = await res.json();
    const placeMatches = data.map(d => ({
      type: "place",
      name: (d.display_name || "").split(",")[0],
      sub: (d.display_name || "").split(",").slice(1, 3).join(",").trim(),
      lat: parseFloat(d.lat),
      lon: parseFloat(d.lon),
    }));
    if (lastQuery === q) showSearchDropdown([...stopMatches, ...placeMatches]);
  } catch (e) {
    if (lastQuery === q) showSearchDropdown(stopMatches);
  }
}

function useMyLocation() {
  if (!navigator.geolocation) {
    alert("Geolocation isn't supported by this browser.");
    return;
  }
  const btn = document.getElementById("locateBtn");
  if (btn) btn.classList.add("loading");
  navigator.geolocation.getCurrentPosition(
    pos => {
      if (btn) btn.classList.remove("loading");
      const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const inKtm = ll.lat > KTM_BBOX.south && ll.lat < KTM_BBOX.north
                 && ll.lng > KTM_BBOX.west  && ll.lng < KTM_BBOX.east;
      if (!inKtm) {
        alert("You appear to be outside Kathmandu Valley. Setting demo origin to Gokarna.");
        const g = STOP_BY_ID.gokarna;
        setEndpoint("origin", { lat: g.lat, lng: g.lon }, "Gokarna (demo)");
      } else {
        setEndpoint("origin", ll, "My location");
      }
      if (map) map.setView([ll.lat, ll.lng], 14);
      setActiveField("destination");
    },
    err => {
      if (btn) btn.classList.remove("loading");
      alert("Couldn't get location: " + err.message);
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

// Run static UI immediately. Even if map fails, this gives the user
// something interactive (demo buttons, legend, swap, clear, search bar).
renderStaticUI();

// =========================================================================
// 3. Map setup — try / catch so a Leaflet failure doesn't kill everything
// =========================================================================
let map = null;
let baseRouteLayer = null, stopLayer = null, tripLayer = null, userLayer = null;
let highlightLayer = null;
let busLayer = null;
let currentTripId = 0;

(function initMap() {
  if (typeof L === "undefined" || !L.map) {
    document.getElementById("map").innerHTML = `
      <div class="map-error">
        <h3>Map library failed to load</h3>
        <p>The Leaflet library couldn't be fetched from the CDN. The rest of the app still works — try a demo trip from the sidebar to confirm.</p>
        <p><strong>Likely fixes:</strong></p>
        <ul>
          <li>Check your internet connection</li>
          <li>Make sure you're running via <code>http://localhost:8000</code> (not <code>file://</code>)</li>
          <li>Try a different network — some Nepali ISPs throttle CDN traffic</li>
        </ul>
      </div>`;
    showErrorBanner("Leaflet (the map library) failed to load. The trip planner still works without the map.");
    return;
  }

  try {
    // Clear the loading message
    document.getElementById("map").innerHTML = "";

    map = L.map("map", { zoomControl: false, attributionControl: true })
      .setView([27.705, 85.335], 13);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      { attribution: "&copy; OpenStreetMap &copy; CARTO", maxZoom: 19, subdomains: "abcd" }
    ).addTo(map);

    baseRouteLayer = L.layerGroup().addTo(map);
    stopLayer      = L.layerGroup().addTo(map);
    tripLayer      = L.layerGroup().addTo(map);
    userLayer      = L.layerGroup().addTo(map);
    busLayer       = L.layerGroup().addTo(map);

    drawBaseNetwork();

    // Map click handler
    map.on("click", (e) => {
      setEndpoint(activeField, e.latlng);
      setActiveField(activeField === "origin" ? "destination" : "origin");
    });

    // Stops toggle
    const stopsT = document.getElementById("stopsToggle");
    if (stopsT) {
      stopsT.addEventListener("change", (e) => {
        if (e.target.checked) map.addLayer(stopLayer);
        else map.removeLayer(stopLayer);
      });
    }
  } catch (err) {
    showErrorBanner("Map init failed: " + (err.message || err));
    console.error(err);
  }
})();

function busStopIcon() {
  return L.divIcon({
    className: 'bus-stop-marker',
    html: `<div class="bsm-inner"><svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM6 10V6h12v4H6z"/></svg></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    tooltipAnchor: [0, -12],
  });
}

const roadCache = new Map();

async function fetchRoadPolyline(stopIds) {
  const key = stopIds.join('|');
  if (roadCache.has(key)) return roadCache.get(key);
  const stops = stopIds.map(id => STOP_BY_ID[id]).filter(Boolean);
  if (stops.length < 2) return stops.map(s => [s.lat, s.lon]);
  const coords = stops.map(s => `${s.lon},${s.lat}`).join(';');
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) throw new Error('OSRM ' + res.status);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes[0]) throw new Error('no route');
    const latlngs = data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
    roadCache.set(key, latlngs);
    return latlngs;
  } catch {
    const fallback = stops.map(s => [s.lat, s.lon]);
    roadCache.set(key, fallback);
    return fallback;
  }
}


// Stitch OSM way member objects (each with .geometry [{lat,lon}]) into one polyline.
function assembleOSMWays(members) {
  const ways = members.filter(m => m.type === 'way' && m.geometry && m.geometry.length);
  if (!ways.length) return [];

  const pts = ways[0].geometry.map(p => [p.lat, p.lon]);
  const used = new Set([0]);

  for (let pass = 0; pass < ways.length; pass++) {
    const tail = pts[pts.length - 1];
    let bi = -1, brev = false, bd = 5e-4; // ~55m threshold in degrees

    for (let i = 1; i < ways.length; i++) {
      if (used.has(i)) continue;
      const g  = ways[i].geometry;
      const ds = Math.hypot(g[0].lat - tail[0],           g[0].lon - tail[1]);
      const de = Math.hypot(g[g.length-1].lat - tail[0],  g[g.length-1].lon - tail[1]);
      if (ds < bd) { bd = ds; bi = i; brev = false; }
      if (de < bd) { bd = de; bi = i; brev = true;  }
    }

    if (bi === -1) break;
    const g   = ways[bi].geometry;
    const src = brev ? [...g].reverse() : g;
    for (let j = 1; j < src.length; j++) pts.push([src[j].lat, src[j].lon]);
    used.add(bi);
  }
  return pts;
}

function drawBaseNetwork() {
  if (!map) return;
  baseRouteLayer.clearLayers();
  stopLayer.clearLayers();

  // Draw every route as straight stop-to-stop lines immediately (instant render),
  // then replace with accurate OSM / OSRM geometry asynchronously.
  const lineMap = new Map(); // routeId → L.Polyline
  ROUTES.forEach(route => {
    const straight = route.stops.map(id => STOP_BY_ID[id]).filter(Boolean).map(s => [s.lat, s.lon]);
    const line = L.polyline(straight, { color: route.color, weight: 4, opacity: 0.35 })
      .bindTooltip(`${route.short} · ${route.name}`, { sticky: true })
      .addTo(baseRouteLayer);
    lineMap.set(route.id, line);
  });

  // Routes with confirmed OSM relation IDs — one batch Overpass request.
  const osmRoutes = ROUTES.filter(r => r.osmRelationId);
  if (osmRoutes.length) {
    const ids   = osmRoutes.map(r => r.osmRelationId).join(',');
    const query = '[out:json][timeout:60];relation(id:' + ids + ');out geom;';
    fetch('https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query),
          { headers: { Accept: 'application/json' } })
      .then(r => r.ok ? r.json() : Promise.reject('Overpass ' + r.status))
      .then(d => {
        for (const el of d.elements || []) {
          const pts = assembleOSMWays(el.members || []);
          if (pts.length < 2) continue;
          roadCache.set('osm:' + el.id, pts);
          const route = osmRoutes.find(r => r.osmRelationId === el.id);
          if (route) lineMap.get(route.id)?.setLatLngs(pts);
        }
      })
      .catch(() => {
        osmRoutes.forEach(route =>
          fetchRoadPolyline(route.stops)
            .then(pts => lineMap.get(route.id)?.setLatLngs(pts)).catch(() => {}));
      });
  }

  // Routes without an OSM relation use OSRM road-following.
  ROUTES.filter(r => !r.osmRelationId).forEach(route =>
    fetchRoadPolyline(route.stops)
      .then(pts => lineMap.get(route.id)?.setLatLngs(pts)).catch(() => {}));

  STOPS.forEach(s => {
    const m = L.marker([s.lat, s.lon], { icon: busStopIcon() })
      .bindTooltip(s.name, { direction: 'top' })
      .addTo(stopLayer);
    m.on('click', ev => {
      if (L.DomEvent && ev.originalEvent) L.DomEvent.stopPropagation(ev.originalEvent);
      setEndpointFromStop(s);
    });
  });
}

function pinIcon(label, color) {
  return L.divIcon({
    className: "margaa-pin",
    html: `<div class="pin" style="background:${color}"><span>${label}</span></div>`,
    iconSize: [28, 36],
    iconAnchor: [14, 34],
  });
}

function refreshPins() {
  if (!userLayer) return;
  userLayer.clearLayers();
  if (origin) {
    L.marker([origin.lat, origin.lng], { icon: pinIcon("A", "#16a34a") }).addTo(userLayer);
  }
  if (destination) {
    L.marker([destination.lat, destination.lng], { icon: pinIcon("B", "#dc143c") }).addTo(userLayer);
  }
}

function setEndpointFromStop(stop) {
  setEndpoint(activeField, { lat: stop.lat, lng: stop.lon }, stop.name);
  setActiveField(activeField === "origin" ? "destination" : "origin");
}

function highlightRoute(routeId, on) {
  if (!map) return;
  if (highlightLayer) { map.removeLayer(highlightLayer); highlightLayer = null; }
  if (!on) return;
  const route = ROUTES.find(r => r.id === routeId);
  if (!route) return;
  const latlngs = route.stops.map(id => STOP_BY_ID[id]).filter(Boolean).map(s => [s.lat, s.lon]);
  highlightLayer = L.polyline(latlngs, { color: route.color, weight: 9, opacity: 0.85 }).addTo(map);
}

// =========================================================================
// Trip rendering
// =========================================================================
function computeAndRender() {
  stopAnimation();
  if (tripLayer) tripLayer.clearLayers();
  const result = planMultipleTrips(origin, destination);

  if (result.type === 'error') {
    document.getElementById('results').innerHTML =
      `<div class="empty"><strong>No route.</strong> ${escapeHtml(result.message)}</div>`;
    return;
  }

  if (result.type === 'walk') {
    if (map && tripLayer) {
      L.polyline([[origin.lat, origin.lng], [destination.lat, destination.lng]],
        { color: '#16a34a', weight: 4, dashArray: '2 8' }).addTo(tripLayer);
      map.fitBounds(L.latLngBounds([[origin.lat, origin.lng], [destination.lat, destination.lng]]),
        { padding: [60, 60] });
    }
    document.getElementById('results').innerHTML = `
      <div class="journey-meta" style="padding:12px 14px 6px">
        <span class="jm-time">${Math.max(1, Math.round(result.directM/1000/WALK_SPEED_KMH*60))} min</span>
        <span class="jm-sep">·</span><span>Walk ${formatMeters(result.directM)}</span>
      </div>
      <div class="empty" style="padding:0 14px 14px"><strong>Tip.</strong> ${escapeHtml(result.message)}</div>`;
    return;
  }

  activeOptions    = result.options;
  activeOptionIdx  = 0;
  renderMultipleRoutes(result.options);
}

function drawTripOnMap(trip, tripId) {
  const oStop = trip.originStop.stop;
  const dStop = trip.destStop.stop;

  const oAnchor = trip.originStop.snapLat != null
    ? [trip.originStop.snapLat, trip.originStop.snapLon]
    : [oStop.lat, oStop.lon];
  const dAnchor = trip.destStop.snapLat != null
    ? [trip.destStop.snapLat, trip.destStop.snapLon]
    : [dStop.lat, dStop.lon];

  L.polyline(
    [[origin.lat, origin.lng], oAnchor],
    { color: "#0a0a0f", weight: 3, dashArray: "2 8", opacity: 0.7 }
  ).addTo(tripLayer);
  // Snap-point marker: where user meets the bus route
  L.circleMarker(oAnchor, {
    radius: 5, color: "#0a0a0f", weight: 2, fillColor: "#fff", fillOpacity: 1,
  }).bindTooltip("Board bus here").addTo(tripLayer);

  trip.legs.forEach((leg, idx) => {
    const route = ROUTES.find(r => r.id === leg.routeId);
    if (!route) return;

    const straight = leg.stops.map(id => { const s = STOP_BY_ID[id]; return [s.lat, s.lon]; });
    const line = L.polyline(straight, { color: route.color, weight: 7, opacity: 0.55, dashArray: '10 6' }).addTo(tripLayer);
    fetchRoadPolyline(leg.stops).then(latlngs => {
      if (currentTripId !== tripId) return;
      line.setLatLngs(latlngs);
      line.setStyle({ opacity: 0.95, dashArray: null });
    }).catch(() => {});

    const boardStop = STOP_BY_ID[leg.stops[0]];
    L.circleMarker([boardStop.lat, boardStop.lon], {
      radius: 7, color: route.color, weight: 3, fillColor: "#ffffff", fillOpacity: 1,
    }).bindTooltip(`Board ${route.short} at ${boardStop.name}`).addTo(tripLayer);

    if (idx < trip.legs.length - 1) {
      const transferStop = STOP_BY_ID[leg.stops[leg.stops.length - 1]];
      L.circleMarker([transferStop.lat, transferStop.lon], {
        radius: 9, color: "#ffd700", weight: 4, fillColor: "#ffffff", fillOpacity: 1,
      }).bindTooltip(`Transfer at ${transferStop.name}`).addTo(tripLayer);
    }
  });

  const lastLeg = trip.legs[trip.legs.length - 1];
  const alightStop = STOP_BY_ID[lastLeg.stops[lastLeg.stops.length - 1]];
  const lastRoute = ROUTES.find(r => r.id === lastLeg.routeId);
  if (lastRoute) {
    L.circleMarker([alightStop.lat, alightStop.lon], {
      radius: 7, color: lastRoute.color, weight: 3, fillColor: "#ffffff", fillOpacity: 1,
    }).bindTooltip(`Alight at ${alightStop.name}`).addTo(tripLayer);
  }

  L.circleMarker(dAnchor, {
    radius: 5, color: "#0a0a0f", weight: 2, fillColor: "#fff", fillOpacity: 1,
  }).bindTooltip("Alight bus here").addTo(tripLayer);
  L.polyline(
    [dAnchor, [destination.lat, destination.lng]],
    { color: "#0a0a0f", weight: 3, dashArray: "2 8", opacity: 0.7 }
  ).addTo(tripLayer);

  const all = [
    [origin.lat, origin.lng], [destination.lat, destination.lng],
    ...trip.legs.flatMap(l => l.stops.map(id => {
      const s = STOP_BY_ID[id]; return [s.lat, s.lon];
    })),
  ];
  map.fitBounds(L.latLngBounds(all), { padding: [60, 60] });
}

function renderTripPanel(trip) {
  const oStop = trip.originStop;
  const dStop = trip.destStop;
  const walkStartM = Math.round(oStop.distM);
  const walkEndM   = Math.round(dStop.distM);
  const walkStartWarn = walkStartM > MAX_WALK_M;
  const walkEndWarn   = walkEndM > MAX_WALK_M;

  const legFares = trip.legs.map(leg => calcFare(legDistanceKm(leg)));
  const totalFare = legFares.reduce((a, b) => a + b, 0);
  const fareBreakdown = trip.legs.length > 1
    ? `<div class="fare-breakdown">${legFares.map(f => '₹' + f).join(' + ')} = ₹${totalFare}</div>`
    : '';

  let html = `
    <div class="summary">
      <div class="chip primary"><span class="chip-num">${trip.totalMin}</span><span class="chip-lbl">min</span></div>
      <div class="chip"><span class="chip-num">${trip.transfers}</span><span class="chip-lbl">transfer${trip.transfers===1?'':'s'}</span></div>
      <div class="chip"><span class="chip-num">${trip.legs.length}</span><span class="chip-lbl">bus${trip.legs.length===1?'':'es'}</span></div>
      <div class="chip"><span class="chip-num">₹${totalFare}</span><span class="chip-lbl">fare</span></div>
    </div>
    <button class="btn-play" id="playTripBtn">&#9654; Play trip</button>
    ${fareBreakdown}
    <ol class="timeline">`;

  const oRoute = trip.originStop.routeId ? ROUTES.find(r => r.id === trip.originStop.routeId) : null;
  const oWalkTitle = oRoute
    ? `Flag down ${escapeHtml(oRoute.short)} bus`
    : `Walk to ${escapeHtml(oStop.stop.name)}`;
  const oWalkSub = oRoute
    ? `${formatMeters(walkStartM)} to bus route · near ${escapeHtml(oStop.stop.name)}${walkStartWarn ? ' · long walk' : ''}`
    : `${formatMeters(walkStartM)}${walkStartWarn ? ' · long walk' : ''}`;
  html += `<li class="step walk ${walkStartWarn ? 'warn' : ''}">
    <div class="step-icon">🚶</div>
    <div class="step-body">
      <div class="step-title">${oWalkTitle}</div>
      <div class="step-sub">${oWalkSub}</div>
      ${walkStartWarn ? rideshareSuggestion(walkStartM) : ''}
    </div>
  </li>`;

  trip.legs.forEach((leg, i) => {
    const route = ROUTES.find(r => r.id === leg.routeId);
    if (!route) return;
    const legKm  = legDistanceKm(leg);
    const km     = legKm.toFixed(1);
    const legFare = legFares[i];
    const fromName = STOP_BY_ID[leg.stops[0]].name;
    const toName   = STOP_BY_ID[leg.stops[leg.stops.length - 1]].name;
    const intermediate = leg.stops.length - 2;
    html += `<li class="step bus" style="--route-color:${route.color}">
      <div class="step-icon">🚌</div>
      <div class="step-body">
        <div class="route-tag">${escapeHtml(route.short)}</div>
        <div class="step-title">${escapeHtml(fromName)} → ${escapeHtml(toName)}</div>
        <div class="step-sub">${escapeHtml(route.name)} · ${km} km${intermediate > 0 ? ` · ${intermediate} stop${intermediate===1?'':'s'} between` : ''}</div>
        <div class="step-fare">₹${legFare}<span class="step-fare-lbl"> this leg</span></div>
      </div>
    </li>`;
    if (i < trip.legs.length - 1) {
      html += `<li class="step transfer">
        <div class="step-icon">↻</div>
        <div class="step-body"><div class="step-title">Transfer at ${escapeHtml(toName)}</div></div>
      </li>`;
    }
  });

  const dRoute = trip.destStop.routeId ? ROUTES.find(r => r.id === trip.destStop.routeId) : null;
  const dWalkSub = dRoute
    ? `${formatMeters(walkEndM)} from bus route to destination${walkEndWarn ? ' · long walk' : ''}`
    : `${formatMeters(walkEndM)}${walkEndWarn ? ' · long walk' : ''}`;
  html += `<li class="step walk ${walkEndWarn ? 'warn' : ''}">
    <div class="step-icon">🚶</div>
    <div class="step-body">
      <div class="step-title">Walk to destination</div>
      <div class="step-sub">${dWalkSub}</div>
      ${walkEndWarn ? rideshareSuggestion(walkEndM) : ''}
    </div>
  </li>`;

  html += `</ol>`;
  document.getElementById("results").innerHTML = html;
  const playBtn = document.getElementById("playTripBtn");
  if (playBtn) {
    playBtn.addEventListener("click", () => {
      if (anim.isPlaying) {
        stopAnimation();
      } else {
        startAnimation(trip);
      }
    });
  }
}


// =========================================================================
// Multi-route UI rendering
// =========================================================================

function renderOneOption(option) {
  const { originStop: o, destStop: d, legs, totalMin, totalFare, walkInM, walkOutM } = option;
  const oRoute = o.routeId ? ROUTES.find(r => r.id === o.routeId) : null;
  const dRoute = d.routeId ? ROUTES.find(r => r.id === d.routeId) : null;

  // ── Journey bar (proportional coloured segments) ───────────────────────
  const walkInMin  = Math.max(0.5, (walkInM  / 1000) / WALK_SPEED_KMH * 60);
  const walkOutMin = Math.max(0.5, (walkOutM / 1000) / WALK_SPEED_KMH * 60);
  let barHtml = '<div class="journey-bar">';
  barHtml += `<div class="jb-walk" style="flex:${walkInMin}" title="Walk ${Math.round(walkInMin)} min"></div>`;
  legs.forEach((leg, i) => {
    if (i > 0) barHtml += '<div class="jb-xfer" title="Change"></div>';
    const legMin = leg.travelMin + leg.waitMin;
    barHtml += `<div class="jb-bus" style="flex:${Math.max(1, legMin)};background:${leg.route?.color || '#888'}" title="${escapeHtml(leg.route?.short || 'Bus')} · ${leg.travelMin} min"></div>`;
  });
  barHtml += `<div class="jb-walk" style="flex:${walkOutMin}" title="Walk ${Math.round(walkOutMin)} min"></div>`;
  barHtml += '</div>';

  // ── Journey meta line ──────────────────────────────────────────────────
  const changesLabel = option.transfers === 0 ? 'Direct' :
    option.transfers + ' change' + (option.transfers > 1 ? 's' : '');
  const metaHtml = `
    <div class="journey-meta">
      <span class="jm-time">${totalMin} min</span>
      <span class="jm-sep">·</span>
      <span>${legs.length} bus${legs.length > 1 ? 'es' : ''}</span>
      <span class="jm-sep">·</span>
      <span>${changesLabel}</span>
    </div>`;

  // ── Play button ────────────────────────────────────────────────────────
  const playBtnHtml = '<button class="btn-play" id="playTripBtn">&#9654; Play trip</button>';

  // ── Step timeline ──────────────────────────────────────────────────────
  let stepsHtml = '<div class="steps-list">';

  // Walk-in
  const walkInWarn  = walkInM > MAX_WALK_M;
  const walkInTitle = oRoute ? `Flag down ${escapeHtml(oRoute.short)} bus` : `Walk to ${escapeHtml(o.stop.name)}`;
  const walkInSub   = oRoute ? `${formatMeters(walkInM)} to bus route · near ${escapeHtml(o.stop.name)}` : formatMeters(walkInM);
  stepsHtml += `
    <div class="step-r walk-r">
      <div class="step-r-track"><div class="step-r-dot walk-d"></div><div class="step-r-line"></div></div>
      <div class="step-r-body">
        <div class="step-r-head">
          <span class="step-r-name">🚶 ${walkInTitle}</span>
          <span class="step-r-dur">${Math.max(1, Math.round(walkInMin))} min</span>
        </div>
        <div class="step-r-sub">${walkInSub}${walkInWarn ? ' · <strong>long walk</strong>' : ''}</div>
        ${walkInWarn ? rideshareSuggestion(walkInM) : ''}
      </div>
    </div>`;

  // Bus legs + transfers
  legs.forEach((leg, i) => {
    const fromStop = STOP_BY_ID[leg.stops[0]];
    const toStop   = STOP_BY_ID[leg.stops[leg.stops.length - 1]];
    const rc = leg.route?.color || '#888';
    stepsHtml += `
      <div class="step-r bus-r" style="--rc:${rc}">
        <div class="step-r-track">
          <div class="step-r-dot bus-d" style="border-color:var(--rc);background:var(--rc)"></div>
          <div class="step-r-line bus-l" style="background:var(--rc)"></div>
        </div>
        <div class="step-r-body">
          <div class="step-r-head">
            <span class="step-r-chip" style="background:var(--rc)">${escapeHtml(leg.route?.short || leg.routeId)}</span>
            <span class="step-r-stops">${escapeHtml(fromStop?.name || '?')} → ${escapeHtml(toStop?.name || '?')}</span>
            <span class="step-r-dur">${leg.travelMin} min</span>
          </div>
          <div class="step-r-sub">
            ${escapeHtml(leg.route?.name || '')} · ${leg.distKm.toFixed(1)} km${leg.intermediate > 0 ? ` · ${leg.intermediate} stop${leg.intermediate > 1 ? 's' : ''} in between` : ''}
            <br><span class="step-r-wait">~${leg.waitMin} min wait · bus every ${leg.route?.frequencyMin || '?'} min</span>
          </div>
          <span class="step-r-fare">₹${leg.fare}</span><span class="step-r-fare-lbl"> this leg</span>
        </div>
      </div>`;
    if (i < legs.length - 1) {
      stepsHtml += `
        <div class="step-r xfer-r">
          <div class="step-r-track"><div class="step-r-dot xfer-d"></div><div class="step-r-line" style="min-height:8px"></div></div>
          <div class="step-r-body"><div class="xfer-label">↻ Change at ${escapeHtml(toStop?.name || '?')}</div></div>
        </div>`;
    }
  });

  // Walk-out
  const walkOutWarn = walkOutM > MAX_WALK_M;
  const walkOutSub  = dRoute
    ? `${formatMeters(walkOutM)} from bus route to destination`
    : formatMeters(walkOutM);
  stepsHtml += `
    <div class="step-r walk-r">
      <div class="step-r-track"><div class="dest-dot"></div></div>
      <div class="step-r-body">
        <div class="step-r-head">
          <span class="step-r-name">🚶 Walk to destination</span>
          <span class="step-r-dur">${Math.max(1, Math.round(walkOutMin))} min</span>
        </div>
        <div class="step-r-sub">${walkOutSub}${walkOutWarn ? ' · <strong>long walk</strong>' : ''}</div>
        ${walkOutWarn ? rideshareSuggestion(walkOutM) : ''}
      </div>
    </div>`;

  stepsHtml += '</div>';

  // ── Fare footer ────────────────────────────────────────────────────────
  const breakdown = legs.length > 1
    ? legs.map(l => '₹' + l.fare).join(' + ') + ' = ₹' + totalFare
    : '';
  const fareHtml = `
    <div class="fare-footer">
      <div>
        <div class="fare-footer-label">Total fare</div>
        ${breakdown ? `<div class="fare-footer-breakdown">${breakdown}</div>` : ''}
      </div>
      <span class="fare-footer-total">₹${totalFare}</span>
    </div>`;

  return barHtml + metaHtml + playBtnHtml + stepsHtml + fareHtml;
}

function wirePlayBtn(option) {
  const btn = document.getElementById('playTripBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (anim.isPlaying) {
      stopAnimation();
    } else {
      startAnimation(option);
    }
  });
}

function renderMultipleRoutes(options) {
  // ── Option tabs ─────────────────────────────────────────────────────────
  let tabsHtml = '<div class="route-options">';
  options.forEach((opt, i) => {
    const chg = opt.transfers === 0 ? 'Direct' :
      opt.transfers + ' change' + (opt.transfers > 1 ? 's' : '');
    tabsHtml += `
      <button class="ropt ${i === 0 ? 'active' : ''}" data-idx="${i}">
        <span class="ropt-label">${escapeHtml(opt.label)}</span>
        <span class="ropt-time">${opt.totalMin}<small> min</small></span>
        <span class="ropt-meta">${chg} · ₹${opt.totalFare}</span>
      </button>`;
  });
  tabsHtml += '</div>';

  const detailHtml = `<div class="route-detail" id="routeDetail">${renderOneOption(options[0])}</div>`;
  document.getElementById('results').innerHTML = tabsHtml + detailHtml;

  // Tab switching
  document.querySelectorAll('.ropt').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      if (idx === activeOptionIdx) return;
      activeOptionIdx = idx;
      document.querySelectorAll('.ropt').forEach(b => b.classList.toggle('active', b === btn));
      document.getElementById('routeDetail').innerHTML = renderOneOption(options[idx]);
      wirePlayBtn(options[idx]);
      // Redraw map
      stopAnimation();
      if (tripLayer) tripLayer.clearLayers();
      currentTripId++;
      if (map && tripLayer) drawTripOnMap(options[idx], currentTripId);
    });
  });

  wirePlayBtn(options[0]);
  currentTripId++;
  if (map && tripLayer) drawTripOnMap(options[0], currentTripId);
}

// =========================================================================
// Trip animation (bus playback along the planned path)
// =========================================================================

const anim = {
  frameId:   null,
  isPlaying: false,
  marker:    null,
  segs:      [],   // { fromLat, fromLon, toLat, toLon, color }
  cum:       [],   // cum[i] = km from trip start to START of segs[i]; cum[segs.length] = totalKm
  totalKm:   0,
  startTime: null,
  lastColor: null, // avoid recreating the icon every frame
};

function busMarkerIcon(color) {
  return L.divIcon({
    className: 'bus-anim-marker',
    html: '<div class="bam-inner" style="background:' + color + '">&#128652;</div>',
    iconSize:   [34, 34],
    iconAnchor: [17, 17],
  });
}

// Build an ordered array of segments covering every bus leg.
// Each segment carries the route color so transfers trigger color swaps.
function buildAnimSegs(trip) {
  const segs = [];
  trip.legs.forEach(leg => {
    const route = ROUTES.find(r => r.id === leg.routeId);
    const color = route ? route.color : '#dc143c';

    // Use the same road polyline that drawTripOnMap draws on the map.
    // fetchRoadPolyline caches under leg.stops.join('|'); startAnimation
    // ensures it is populated before we reach here.
    const roadPts = roadCache.get(leg.stops.join('|'));
    if (roadPts && roadPts.length > 1) {
      for (let i = 0; i < roadPts.length - 1; i++) {
        segs.push({
          fromLat: roadPts[i][0],     fromLon: roadPts[i][1],
          toLat:   roadPts[i + 1][0], toLon:   roadPts[i + 1][1],
          color,
        });
      }
    } else {
      // Fallback: straight stop-to-stop lines if cache is empty
      for (let i = 0; i < leg.stops.length - 1; i++) {
        const a = STOP_BY_ID[leg.stops[i]], b = STOP_BY_ID[leg.stops[i + 1]];
        if (!a || !b) continue;
        segs.push({ fromLat: a.lat, fromLon: a.lon, toLat: b.lat, toLon: b.lon, color });
      }
    }
  });
  return segs;
}

// Precompute cumulative distance (km) at the start of each segment.
function buildCumDist(segs) {
  const cum = [0];
  for (const s of segs) {
    cum.push(cum[cum.length - 1] + haversineKm(s.fromLat, s.fromLon, s.toLat, s.toLon));
  }
  return cum;
}

function animFrame(timestamp) {
  if (!anim.isPlaying) return;

  const elapsed  = (timestamp - anim.startTime) / 1000; // seconds
  const progress = Math.min(elapsed / 12, 1);            // 12-second total duration
  const currentKm = progress * anim.totalKm;

  // Find which segment the bus is on
  let si = 0;
  while (si < anim.segs.length - 1 && anim.cum[si + 1] <= currentKm) si++;

  const seg   = anim.segs[si];
  const segKm = anim.cum[si + 1] - anim.cum[si];
  const t     = segKm === 0 ? 0 : (currentKm - anim.cum[si]) / segKm;
  const lat   = seg.fromLat + t * (seg.toLat - seg.fromLat);
  const lon   = seg.fromLon + t * (seg.toLon - seg.fromLon);

  anim.marker.setLatLng([lat, lon]);

  // Recreate icon only when entering a new leg (avoids 60fps DOM churn)
  if (seg.color !== anim.lastColor) {
    anim.marker.setIcon(busMarkerIcon(seg.color));
    anim.lastColor = seg.color;
  }

  // Gentle pan to keep the bus in view if it drifts off-screen
  if (map && !map.getBounds().contains([lat, lon])) {
    map.panTo([lat, lon], { animate: true, duration: 0.5 });
  }

  if (progress < 1) {
    anim.frameId = requestAnimationFrame(animFrame);
  } else {
    anim.isPlaying = false;
    anim.frameId   = null;
    const btn = document.getElementById("playTripBtn");
    if (btn) btn.textContent = "\u25B6 Replay trip";
  }
}

async function startAnimation(trip) {
  if (!map || !busLayer) return;
  if (anim.isPlaying) return; // ignore second click while running

  stopAnimation(); // clear any residual marker / frameId

  // Make sure road geometry is in roadCache for every leg before animating.
  // fetchRoadPolyline is usually already done by drawTripOnMap, so this is
  // instant for cached legs and only blocks on the first Play click.
  await Promise.all(
    trip.legs.map(leg =>
      roadCache.has(leg.stops.join('|'))
        ? Promise.resolve()
        : fetchRoadPolyline(leg.stops).catch(() => {})
    )
  );

  const segs = buildAnimSegs(trip);
  if (segs.length === 0) return;
  const cum     = buildCumDist(segs);
  const totalKm = cum[cum.length - 1];
  if (totalKm === 0) return;

  anim.segs      = segs;
  anim.cum       = cum;
  anim.totalKm   = totalKm;
  anim.lastColor = null;

  anim.marker = L.marker([segs[0].fromLat, segs[0].fromLon], {
    icon:          busMarkerIcon(segs[0].color),
    zIndexOffset:  1000,
    interactive:   false,
  }).addTo(busLayer);

  const btn = document.getElementById("playTripBtn");
  if (btn) btn.textContent = "\u23F8 Stop";

  anim.isPlaying = true;
  anim.frameId   = requestAnimationFrame(ts => {
    anim.startTime = ts;
    animFrame(ts);
  });
}

function stopAnimation() {
  if (anim.frameId) { cancelAnimationFrame(anim.frameId); anim.frameId = null; }
  anim.isPlaying = false;
  if (busLayer) busLayer.clearLayers();
  anim.marker = null;
  const btn = document.getElementById("playTripBtn");
  if (btn) btn.textContent = "\u25B6 Play trip";
}
