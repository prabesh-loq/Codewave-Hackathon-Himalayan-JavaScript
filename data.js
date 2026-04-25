// =========================================================================
// MARGAA — Kathmandu Valley transit data
// =========================================================================
// Coordinates sourced from OpenStreetMap via Overpass API (April 2026).
// Routes based on OSM relations from github.com/monsooncollective/yatayat.
// Adding/editing a stop:  push to STOPS, then reference its id in a route.
// Adding a route:         push to ROUTES with ordered stop ids.
// =========================================================================

const STOPS = [
  // ── Central Kathmandu ──────────────────────────────────────────────────
  { id: "ratnapark",     name: "Ratna Park",           lat: 27.7066, lon: 85.3153 },
  { id: "buspark",       name: "Purano Bus Park",       lat: 27.7035, lon: 85.3164 },
  { id: "kantipath",     name: "Kantipath",             lat: 27.7089, lon: 85.3146 },
  { id: "putalisadak",   name: "Putalisadak",           lat: 27.7056, lon: 85.3229 },
  { id: "kamaladi",      name: "Kamaladi",              lat: 27.7103, lon: 85.3223 },
  { id: "dillibazaar",   name: "Dillibazaar",           lat: 27.7098, lon: 85.3270 },
  { id: "gaushala",      name: "Gaushala",              lat: 27.7081, lon: 85.3364 },
  { id: "singhadurbar",  name: "Singha Durbar",         lat: 27.6968, lon: 85.3241 },
  { id: "maitighar",     name: "Maitighar",             lat: 27.6941, lon: 85.3210 },
  { id: "bagbazaar",     name: "Bagbazar",              lat: 27.7050, lon: 85.3250 },
  { id: "lainchaur",     name: "Lainchaur",             lat: 27.7187, lon: 85.3177 },
  { id: "tripureshwor",  name: "Tripureshwor",          lat: 27.6934, lon: 85.3145 },

  // ── Lalitpur / South ───────────────────────────────────────────────────
  { id: "thapathali",    name: "Thapathali",            lat: 27.6918, lon: 85.3180 },
  { id: "kupondol",      name: "Kupondol",              lat: 27.6880, lon: 85.3162 },
  { id: "pulchowk",      name: "Pulchowk",              lat: 27.6780, lon: 85.3164 },
  { id: "jawalakhel",    name: "Jawalakhel",            lat: 27.6733, lon: 85.3135 },
  { id: "lagankhel",     name: "Lagankhel",             lat: 27.6671, lon: 85.3226 },
  { id: "satdobato",     name: "Satdobato",             lat: 27.6588, lon: 85.3247 },
  { id: "ekantakuna",    name: "Ekantakuna",            lat: 27.6666, lon: 85.3083 },
  { id: "balkhu",        name: "Balkhu",                lat: 27.6849, lon: 85.2986 },

  // ── East / Bhaktapur corridor ──────────────────────────────────────────
  { id: "koteshwor",     name: "Koteshwor",             lat: 27.6788, lon: 85.3495 },
  { id: "tinkune",       name: "Tinkune",               lat: 27.6860, lon: 85.3457 },
  { id: "shantinagar",   name: "Shantinagar",           lat: 27.6870, lon: 85.3415 },
  { id: "nayabaneshwor", name: "Naya Baneshwor",        lat: 27.6885, lon: 85.3347 },
  { id: "buddhanagar",   name: "Buddhanagar",           lat: 27.6903, lon: 85.3286 },
  { id: "gairigaun",     name: "Gairigaun",             lat: 27.6873, lon: 85.3505 },
  { id: "sinamangal",    name: "Sinamangal",            lat: 27.6953, lon: 85.3551 },
  { id: "airport",       name: "Tribhuvan Airport",     lat: 27.7006, lon: 85.3537 },
  { id: "lokanthali",    name: "Lokanthali",            lat: 27.6749, lon: 85.3603 },
  { id: "thimi",         name: "Thimi",                 lat: 27.6733, lon: 85.3864 },
  { id: "srijananagar",  name: "Srijana Nagar",         lat: 27.6728, lon: 85.4049 },
  { id: "sallaghari",    name: "Sallaghari",            lat: 27.6699, lon: 85.4110 },
  { id: "suryabinayak",  name: "Suryabinayak",          lat: 27.6657, lon: 85.4242 },
  // id kept as "bhaktapur" so existing demo trips continue to work
  { id: "bhaktapur",     name: "Kamal Binayak (Bhaktapur)", lat: 27.6773, lon: 85.4369 },

  // ── North-east / Boudha–Sundarijal corridor ───────────────────────────
  { id: "chabahil",      name: "Chabahil",              lat: 27.7167, lon: 85.3464 },
  { id: "dhumbarahi",    name: "Dhumbarahi",            lat: 27.7317, lon: 85.3443 },
  { id: "boudha",        name: "Boudha",                lat: 27.7206, lon: 85.3617 },
  { id: "jorpati",       name: "Jorpati",               lat: 27.7217, lon: 85.3727 },
  { id: "gokarna",       name: "Gokarna",               lat: 27.7403, lon: 85.3907 },
  { id: "sundarijal",    name: "Sundarijal",            lat: 27.7576, lon: 85.4194 },

  // ── North / Budhanilkantha corridor ───────────────────────────────────
  { id: "narayangopal",  name: "Narayan Gopal Chowk",   lat: 27.7400, lon: 85.3372 },
  { id: "basundhara",    name: "Basundhara",            lat: 27.7406, lon: 85.3293 },
  { id: "samakhusi",     name: "Samakhusi",             lat: 27.7356, lon: 85.3209 },
  { id: "gongabu",       name: "Gongabu",               lat: 27.7349, lon: 85.3146 },
  { id: "lazimpat",      name: "Lazimpat",              lat: 27.7225, lon: 85.3209 },
  { id: "panipokhari",   name: "Panipokhari",           lat: 27.7307, lon: 85.3260 },
  { id: "bansbari",      name: "Bansbari",              lat: 27.7457, lon: 85.3424 },
  { id: "golfutar",      name: "Golfutar",              lat: 27.7514, lon: 85.3460 },
  { id: "budhanilkantha", name: "Budhanilkantha",       lat: 27.7765, lon: 85.3620 },

  // ── West / Kalanki corridor ────────────────────────────────────────────
  { id: "kalanki",       name: "Kalanki",               lat: 27.6930, lon: 85.2808 },
  { id: "kalimati",      name: "Kalimati",              lat: 27.6984, lon: 85.2994 },
  { id: "kirtipur",      name: "Kirtipur",              lat: 27.6704, lon: 85.2906 },
  { id: "nayabuspark",   name: "Naya Bus Park",         lat: 27.7351, lon: 85.3081 },
  { id: "balaju",        name: "Balaju",                lat: 27.7272, lon: 85.3046 },
  { id: "sorhakhutte",   name: "Sorhakhutte",           lat: 27.7188, lon: 85.3096 },
];

// ── Route colours — distinct, readable on light OSM tiles ─────────────────
const ROUTES = [
  {
    id: "R1",
    name: "Ratna Park – Lagankhel",
    short: "RP–LGK",
    color: "#dc143c",
    frequencyMin: 6,
    avgSpeedKmh: 16,
    // OSM relation: classic south corridor via Patan
    stops: ["ratnapark","maitighar","singhadurbar","tripureshwor",
            "thapathali","kupondol","pulchowk","jawalakhel","lagankhel"],
  },
  {
    id: "R2",
    name: "Ring Road (Clockwise)",
    short: "RING-CW",
    color: "#2563eb",
    frequencyMin: 5,
    avgSpeedKmh: 18,
    osmRelationId: 2266660,
    // Closed loop — koteshwor duplicated at end so buildGraph creates the closing edge
    // OSM relation 2266660; stop coords from Overpass API
    stops: ["koteshwor","gairigaun","sinamangal","airport","chabahil",
            "narayangopal","gongabu","nayabuspark","balaju","sorhakhutte",
            "kalanki","balkhu","ekantakuna","satdobato","koteshwor"],
  },
  {
    id: "R3",
    name: "Purano Bus Park – Sundarijal",
    short: "BP–SDJ",
    color: "#16a34a",
    frequencyMin: 12,
    osmRelationId: 2282101,
    avgSpeedKmh: 17,
    // OSM relation 2282101; stops verified via Overpass
    stops: ["buspark","putalisadak","kamaladi","dillibazaar","gaushala",
            "chabahil","boudha","jorpati","sundarijal"],
  },
  {
    id: "R4",
    name: "Bagbazar – Kamal Binayak (Bhaktapur)",
    short: "BB–BKT",
    color: "#f97316",
    frequencyMin: 8,
    osmRelationId: 2988890,
    avgSpeedKmh: 20,
    // OSM relations 2909799 / 2988890 (Bhaktapur Minibus Samiti, ref 7)
    stops: ["bagbazaar","putalisadak","buspark","singhadurbar","buddhanagar",
            "nayabaneshwor","shantinagar","tinkune","koteshwor","lokanthali",
            "thimi","srijananagar","sallaghari","suryabinayak","bhaktapur"],
  },
  {
    id: "R5",
    name: "Ratna Park – Budhanilkantha",
    short: "RP–BDK",
    color: "#0891b2",
    frequencyMin: 10,
    osmRelationId: 2295734,
    avgSpeedKmh: 18,
    // OSM relation 2295734; all 9 stops verified via Overpass with exact coords
    stops: ["ratnapark","kantipath","lainchaur","lazimpat","panipokhari",
            "narayangopal","bansbari","golfutar","budhanilkantha"],
  },
  {
    id: "R6",
    name: "Kalanki – Tribhuvan Airport",
    short: "KLK–APT",
    color: "#db2777",
    frequencyMin: 8,
    osmRelationId: 3100600,
    avgSpeedKmh: 17,
    // OSM relation 3100600 (Sajha Yatayat); stops verified via Overpass
    stops: ["kalanki","tripureshwor","buddhanagar","nayabaneshwor",
            "shantinagar","tinkune","gairigaun","sinamangal","airport"],
  },
  {
    id: "R7",
    name: "Gokarna – Chabahil – Balaju – Kalanki",
    short: "GKN–KLK",
    color: "#9333ea",
    frequencyMin: 15,
    osmRelationId: 3071402,
    avgSpeedKmh: 16,
    // OSM relation 3071402; cross-valley route via northern ring
    stops: ["gokarna","chabahil","dhumbarahi","narayangopal","basundhara",
            "samakhusi","nayabuspark","balaju","kalanki"],
  },
  {
    id: "R8",
    name: "Ratna Park – Kirtipur",
    short: "RP–KTP",
    color: "#ca8a04",
    frequencyMin: 12,
    avgSpeedKmh: 18,
    stops: ["ratnapark","tripureshwor","kalimati","balkhu","kirtipur"],
  },
];

// Convenience lookup
const STOP_BY_ID = Object.fromEntries(STOPS.map(s => [s.id, s]));

// Expose globally (no modules — zero build setup)
window.MARGAA_DATA = { STOPS, ROUTES, STOP_BY_ID };
