const STORAGE_KEY = 'gentrack_demo_v12';

  /* ========== BACKEND API CONNECTION ========== */
  // Change this if your API runs on a different port
  const API_BASE = 'http://localhost:3000/api';
  let apiOnline = false;

  async function apiFetch(path, options) {
    const opts = options || {};
    const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    const res = await fetch(API_BASE + path, Object.assign({}, opts, { headers }));
    let json = null;
    try { json = await res.json(); } catch (e) { json = null; }
    if (!res.ok) {
      const err = new Error((json && json.error) || ('HTTP ' + res.status));
      err.status = res.status;
      err.payload = json;
      throw err;
    }
    return json;
  }

  async function checkApi() {
    try {
      const r = await apiFetch('/health');
      apiOnline = !!(r && r.ok);
    } catch (e) {
      apiOnline = false;
    }
    return apiOnline;
  }

  async function syncFromApi() {
    if (!apiOnline) return false;
    try {
      const [sched, books, msgs, prof] = await Promise.all([
        apiFetch('/schedules'),
        apiFetch('/bookings'),
        apiFetch('/messages'),
        apiFetch('/profile')
      ]);
      if (sched && sched.data) state.schedules = sched.data;
      if (books && books.data) {
        state.bookings = books.data.map(function (b) {
          return Object.assign({}, b, {
            fare: typeof b.fare === 'string' ? b.fare : ('₱' + b.fare),
            boarded: !!b.boarded
          });
        });
      }
      if (msgs && msgs.data) state.messages = msgs.data;
      if (prof && prof.data) state.profile = Object.assign({}, state.profile, prof.data);
      // Rebuild occupied from upcoming bookings
      state.occupied = {};
      state.bookings.forEach(function (b) {
        if (b.status !== 'upcoming') return;
        if (!state.occupied[b.bus]) state.occupied[b.bus] = [];
        String(b.seat || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (seat) {
          if (state.occupied[b.bus].indexOf(seat) < 0) state.occupied[b.bus].push(seat);
        });
      });
      saveState();
      return true;
    } catch (e) {
      console.warn('API sync failed, using local data', e);
      return false;
    }
  }

  function setApiBadge(online) {
    // Optional small indicator on splash/home if element exists
    var el = document.getElementById('apiStatusBadge');
    if (!el) return;
    el.textContent = online ? 'API Connected' : 'Offline Demo Mode';
    el.style.color = online ? 'var(--success)' : 'var(--text-muted)';
  }
  const DEFAULT_DRIVERS = [
    { id: 'GT-0042', password: 'driver123', name: 'Juan Dela Cruz', role: 'Driver', bus: 'GN-204' },
    { id: 'GT-0108', password: 'conductor123', name: 'Maria Santos', role: 'Conductor', bus: 'GN-112' }
  ];
  const DEFAULT_NEARBY = [
    { id: 'GN-204', route: 'Cubao → Baguio City', eta: '12 min', seats: 8, fare: '₱695', status: 'On route' },
    { id: 'GN-156', route: 'Cubao → Balanga, Bataan', eta: '8 min', seats: 15, fare: '₱306', status: 'On route' },
    { id: 'GN-089', route: 'Cubao → Clark Airport', eta: '18 min', seats: 22, fare: '₱310', status: 'Approaching' }
  ];
  const DEFAULT_SCHEDULES = [
    { id: 'GN-204', origin: 'Cubao', dest: 'Baguio City', dep: '2:00 PM', arr: '6:45 PM', fare: '₱695', seats: 8, status: 'On Route', filter: 'baguio', capacity: 40 },
    { id: 'GN-112', origin: 'Cubao', dest: 'Mariveles, Bataan', dep: '3:00 PM', arr: '6:30 PM', fare: '₱416', seats: 14, status: 'Scheduled', filter: 'bataan', capacity: 40 },
    { id: 'GN-308', origin: 'Cubao', dest: 'Clark Airport', dep: '3:30 PM', arr: '5:15 PM', fare: '₱310', seats: 22, status: 'Scheduled', filter: 'clark', capacity: 40 },
    { id: 'GN-221', origin: 'Cubao', dest: 'Baguio City', dep: '4:00 PM', arr: '8:45 PM', fare: '₱695', seats: 5, status: 'Scheduled', filter: 'baguio', capacity: 32 },
    { id: 'GN-045', origin: 'Cubao', dest: 'Baler, Aurora', dep: '4:30 PM', arr: '9:00 PM', fare: '₱520', seats: 18, status: 'Scheduled', filter: 'baler', capacity: 36 },
    { id: 'GN-178', origin: 'Cubao', dest: 'Balanga, Bataan', dep: '5:00 PM', arr: '7:30 PM', fare: '₱306', seats: 11, status: 'Scheduled', filter: 'bataan', capacity: 32 },
    { id: 'GN-092', origin: 'Pasay', dest: 'Mariveles, Bataan', dep: '5:30 PM', arr: '8:45 PM', fare: '₱416', seats: 9, status: 'Scheduled', filter: 'bataan', capacity: 32 },
    { id: 'GN-340', origin: 'Cubao', dest: 'Clark Airport', dep: '6:00 PM', arr: '7:45 PM', fare: '₱310', seats: 25, status: 'Scheduled', filter: 'clark', capacity: 40 }
  ];
  const DEFAULT_MESSAGES = [
    { id: 1, icon: 'blue', title: 'Bus Approaching', preview: 'Bus GN-204 is now approaching your pickup point.', time: '2 min ago', unread: true },
    { id: 2, icon: 'green', title: 'Reservation Confirmed', preview: 'Your reservation for GN-112 has been confirmed.', time: '1 hour ago', unread: true },
    { id: 3, icon: 'orange', title: 'Route Update', preview: 'Route update: Expect delays due to traffic on NLEX.', time: '3 hours ago', unread: false },
    { id: 4, icon: 'blue', title: 'Departure Reminder', preview: 'Your scheduled trip is departing soon (GN-308).', time: 'Yesterday', unread: false },
    { id: 5, icon: 'green', title: 'Seat Available', preview: 'Additional seats opened for Cubao–Baguio 4:00 PM.', time: 'Yesterday', unread: false }
  ];
  const DEFAULT_BOOKINGS = [
    { id: 'BK-001', ref: 'GT-20261005-3192', bus: 'GN-112', origin: 'Cubao', dest: 'Mariveles, Bataan', pickup: 'Cubao Terminal', dropoff: 'Mariveles, Bataan', date: 'Oct 7, 2026', dep: '3:00 PM', seat: '12A', status: 'upcoming', fare: '₱416', passenger: 'Juan Dela Cruz', boarded: false },
    { id: 'BK-002', ref: 'GT-20260928-8841', bus: 'GN-204', origin: 'Cubao', dest: 'Baguio City', pickup: 'Cubao Terminal', dropoff: 'Baguio City', date: 'Sep 28, 2026', dep: '2:00 PM', seat: '5B', status: 'completed', fare: '₱695', passenger: 'Juan Dela Cruz', boarded: true },
    { id: 'BK-003', ref: 'GT-20261009-1001', bus: 'GN-204', origin: 'Cubao', dest: 'Baguio City', pickup: 'Cubao Terminal Gate 2', dropoff: 'Baguio City Terminal', date: 'Oct 9, 2026', dep: '2:00 PM', seat: '1A', status: 'upcoming', fare: '₱695', passenger: 'Ana Reyes', boarded: false },
    { id: 'BK-004', ref: 'GT-20261009-1002', bus: 'GN-204', origin: 'Cubao', dest: 'Baguio City', pickup: 'Cubao Terminal Gate 2', dropoff: 'Baguio City Terminal', date: 'Oct 9, 2026', dep: '2:00 PM', seat: '1B', status: 'upcoming', fare: '₱695', passenger: 'Carlos Mendoza', boarded: true },
    { id: 'BK-005', ref: 'GT-20261009-1003', bus: 'GN-204', origin: 'Cubao', dest: 'Baguio City', pickup: 'Balintawak Stop', dropoff: 'Tarlac Terminal', date: 'Oct 9, 2026', dep: '2:00 PM', seat: '3C', status: 'upcoming', fare: '₱695', passenger: 'Maria Santos', boarded: false },
    { id: 'BK-006', ref: 'GT-20261009-1004', bus: 'GN-204', origin: 'Cubao', dest: 'Baguio City', pickup: 'Cubao Terminal Gate 3', dropoff: 'Baguio City Terminal', date: 'Oct 9, 2026', dep: '2:00 PM', seat: '4A', status: 'upcoming', fare: '₱695', passenger: 'Pedro Garcia', boarded: false },
    { id: 'BK-007', ref: 'GT-20261009-1005', bus: 'GN-204', origin: 'Cubao', dest: 'Baguio City', pickup: 'Cubao Terminal', dropoff: 'Baguio City', date: 'Oct 9, 2026', dep: '2:00 PM', seat: '5D', status: 'upcoming', fare: '₱695', passenger: 'Lisa Tan', boarded: true },
    { id: 'BK-008', ref: 'GT-20261009-1006', bus: 'GN-204', origin: 'Cubao', dest: 'Baguio City', pickup: 'Cubao Terminal Gate 1', dropoff: 'Baguio City Terminal', date: 'Oct 9, 2026', dep: '2:00 PM', seat: '6B', status: 'upcoming', fare: '₱695', passenger: 'Jose Ramirez', boarded: false },
    { id: 'BK-009', ref: 'GT-20261009-1007', bus: 'GN-204', origin: 'Cubao', dest: 'Baguio City', pickup: 'Cubao Terminal', dropoff: 'Baguio City', date: 'Oct 9, 2026', dep: '2:00 PM', seat: '7A', status: 'upcoming', fare: '₱695', passenger: 'Sofia Cruz', boarded: false },
    { id: 'BK-010', ref: 'GT-20261009-1008', bus: 'GN-204', origin: 'Cubao', dest: 'Baguio City', pickup: 'NLEX Exit Stop', dropoff: 'Baguio City Terminal', date: 'Oct 9, 2026', dep: '2:00 PM', seat: '8C', status: 'upcoming', fare: '₱695', passenger: 'Miguel Torres', boarded: false },
    { id: 'BK-011', ref: 'GT-20261009-1009', bus: 'GN-204', origin: 'Cubao', dest: 'Baguio City', pickup: 'Cubao Terminal Gate 2', dropoff: 'Baguio City', date: 'Oct 9, 2026', dep: '2:00 PM', seat: '9B', status: 'upcoming', fare: '₱695', passenger: 'Elena Vargas', boarded: false },
    { id: 'BK-012', ref: 'GT-20261009-1010', bus: 'GN-204', origin: 'Cubao', dest: 'Baguio City', pickup: 'Cubao Terminal', dropoff: 'Baguio City Terminal', date: 'Oct 9, 2026', dep: '2:00 PM', seat: '10A', status: 'upcoming', fare: '₱695', passenger: 'Rico Aquino', boarded: false },
    { id: 'BK-013', ref: 'GT-20261007-2001', bus: 'GN-112', origin: 'Cubao', dest: 'Mariveles, Bataan', pickup: 'Cubao Terminal', dropoff: 'Mariveles Terminal', date: 'Oct 7, 2026', dep: '3:00 PM', seat: '1A', status: 'upcoming', fare: '₱416', passenger: 'Grace Lim', boarded: false },
    { id: 'BK-014', ref: 'GT-20261007-2002', bus: 'GN-112', origin: 'Cubao', dest: 'Mariveles, Bataan', pickup: 'Cubao Terminal Gate 4', dropoff: 'Mariveles, Bataan', date: 'Oct 7, 2026', dep: '3:00 PM', seat: '2B', status: 'upcoming', fare: '₱416', passenger: 'Marco Diaz', boarded: true },
    { id: 'BK-015', ref: 'GT-20261007-2003', bus: 'GN-112', origin: 'Cubao', dest: 'Mariveles, Bataan', pickup: 'Cubao Terminal', dropoff: 'Balanga Stop', date: 'Oct 7, 2026', dep: '3:00 PM', seat: '5B', status: 'upcoming', fare: '₱416', passenger: 'Nina Flores', boarded: false }
  ];
  const DEFAULT_PROFILE = { name: 'Juan Dela Cruz', email: 'juan.delacruz@email.com', phone: '09171234567', prefs: { arrival: true, booking: true, delay: true, promo: false } };
  const DEFAULT_OCCUPIED = {
    'GN-204': ['1A','1B','3C','4A','5D','6B','7A','8C','9B','10A'],
    'GN-112': ['1A','2B','3A','4C','5B','6D','7C','8A','9D','10B','11A','12C'],
    'GN-308': ['1C','2A','3B','4D','5A'],
    'GN-221': ['1A','1B','1C','1D','2A','2B','2C','2D','3A','3B','3C','3D','4A','4B','4C','4D','5A','5B','5C'],
    'GN-045': ['1A','2C','3B','4A','5D','6B'],
    'GN-178': ['1B','2A','3C','4D','5A','6C','7B','8D','9A','10C','11B'],
    'GN-092': ['1A','2B','3C','4A','5B','6C','7A','8B','9C'],
    'GN-340': ['1A','2B','3A']
  };
  const ROUTE_STOPS = {
    'GN-204': [
      { name: 'Cubao Terminal', time: '2:00 PM', status: 'passed' },
      { name: 'Balintawak', time: '2:25 PM', status: 'passed' },
      { name: 'NLEX Toll', time: '2:45 PM', status: 'current' },
      { name: 'SCTEX Exit', time: '4:00 PM', status: 'upcoming' },
      { name: 'Tarlac', time: '4:40 PM', status: 'upcoming' },
      { name: 'Baguio City', time: '6:45 PM', status: 'upcoming' }
    ],
    'default': [
      { name: 'Origin Terminal', time: '—', status: 'upcoming' },
      { name: 'Midpoint', time: '—', status: 'upcoming' },
      { name: 'Destination', time: '—', status: 'upcoming' }
    ]
  };

  let state = {
    profile: { ...DEFAULT_PROFILE },
    messages: JSON.parse(JSON.stringify(DEFAULT_MESSAGES)),
    bookings: JSON.parse(JSON.stringify(DEFAULT_BOOKINGS)),
    schedules: JSON.parse(JSON.stringify(DEFAULT_SCHEDULES)),
    occupied: JSON.parse(JSON.stringify(DEFAULT_OCCUPIED)),
    boardedTickets: [],
    feedbacks: []
  };
  let currentDriver = null, boardedCount = 24, tripState = 'idle', currentBusId = 'GN-204';
  let historyStack = [], bookingTab = 'upcoming', selectedSeats = [];
  let bookingState = { origin: 'Cubao', dest: 'Baguio', date: '', passengers: 1, bus: null, seat: null, fare: 695, paxName: '', paxPhone: '', paxEmail: '', payment: 'GCash' };
  let scheduleFilter = 'all', scheduleQuery = '', feedbackRating = 0, simMoving = false, simProgress = 35, simTimer = null, modalCallback = null;
  let manifestFilter = 'all', manifestQuery = '', selectedStaffSeat = null, selectedManifestId = null;

  /* ========== OPENSTREETMAP + LEAFLET ========== */
  // Demo coordinates (Philippines) — simulated GPS, not live vehicle feeds
  const OSM_PLACES = {
    cubao: [14.6220, 121.0530],
    balintawak: [14.6575, 121.0040],
    nlex: [14.7800, 120.9800],
    sctex: [15.1500, 120.6200],
    tarlac: [15.4865, 120.5970],
    baguio: [16.4023, 120.5960],
    bataan: [14.4500, 120.5200],
    clark: [15.1860, 120.5600],
    baler: [15.7600, 121.5600]
  };

  // Route polylines for major destinations (simplified demo paths)
  const ROUTE_PATHS = {
    baguio: [OSM_PLACES.cubao, OSM_PLACES.balintawak, OSM_PLACES.nlex, OSM_PLACES.sctex, OSM_PLACES.tarlac, OSM_PLACES.baguio],
    bataan: [OSM_PLACES.cubao, [14.55, 120.90], [14.50, 120.70], OSM_PLACES.bataan],
    clark: [OSM_PLACES.cubao, OSM_PLACES.balintawak, OSM_PLACES.nlex, OSM_PLACES.clark],
    baler: [OSM_PLACES.cubao, [14.80, 121.20], [15.20, 121.40], OSM_PLACES.baler],
    default: [OSM_PLACES.cubao, OSM_PLACES.nlex, OSM_PLACES.tarlac]
  };

  function routeKeyForBus(busId) {
    const s = (state.schedules || []).find(x => x.id === busId);
    if (!s) return 'default';
    const f = (s.filter || '').toLowerCase();
    if (ROUTE_PATHS[f]) return f;
    const dest = (s.dest || '').toLowerCase();
    if (dest.includes('baguio')) return 'baguio';
    if (dest.includes('bataan') || dest.includes('mariveles') || dest.includes('balanga')) return 'bataan';
    if (dest.includes('clark')) return 'clark';
    if (dest.includes('baler')) return 'baler';
    return 'default';
  }

  function lerpLatLng(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }

  function pointAlongPath(path, progress01) {
    if (!path || path.length < 2) return path[0] || OSM_PLACES.cubao;
    const p = Math.max(0, Math.min(1, progress01));
    const segCount = path.length - 1;
    const pos = p * segCount;
    const i = Math.min(segCount - 1, Math.floor(pos));
    const t = pos - i;
    return lerpLatLng(path[i], path[i + 1], t);
  }

  function locationLabel(progress01) {
    if (progress01 < 0.15) return 'Cubao Terminal';
    if (progress01 < 0.30) return 'Balintawak / NLEX';
    if (progress01 < 0.50) return 'NLEX';
    if (progress01 < 0.70) return 'SCTEX';
    if (progress01 < 0.88) return 'Tarlac';
    return 'Approaching destination';
  }

  let homeMap = null, detailMap = null, driverMap = null;
  let homeBusMarkers = [], detailBusMarker = null, detailRouteLine = null;
  let driverBusMarker = null;
  let mapsReady = false;

  function busDivIcon(selected, own) {
    const cls = 'bus-pin' + (selected ? ' selected' : '') + (own ? ' own' : '');
    return L.divIcon({
      className: '',
      html: '<div class="' + cls + '">🚌</div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  }

  function userDivIcon() {
    return L.divIcon({
      className: '',
      html: '<div class="user-pin"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
  }

  function stopDivIcon(type) {
    return L.divIcon({
      className: '',
      html: '<div class="stop-pin ' + type + '"></div>',
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });
  }

  function ensureLeaflet() {
    return typeof L !== 'undefined';
  }

  function addOsmTiles(map) {
    // OpenStreetMap tiles — NO API key required (open data project)
    // Must show attribution (OSM Tile Usage Policy)
    var osmAttr = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
    var primary = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: osmAttr,
      // Keep request volume low (policy): one layer, browser cache OK
      updateWhenIdle: true,
      keepBuffer: 1
    });
    // Community mirror if openstreetmap.org returns "access blocked"
    var fallback = L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: osmAttr + ' | Tiles by OSM Deutschland'
    });
    primary.addTo(map);
    var switched = false;
    primary.on('tileerror', function () {
      if (switched) return;
      switched = true;
      try { map.removeLayer(primary); } catch (e) {}
      if (!map.hasLayer(fallback)) fallback.addTo(map);
      console.warn('OSM.org tiles blocked or failed — using OpenStreetMap.de mirror');
    });
  }

  function initHomeMap() {
    if (!ensureLeaflet()) return;
    const el = document.getElementById('homeLeaflet');
    if (!el) return;
    if (homeMap) {
      setTimeout(function () { homeMap.invalidateSize(); }, 100);
      return;
    }
    homeMap = L.map(el, { zoomControl: false, attributionControl: true }).setView(OSM_PLACES.cubao, 12);
    addOsmTiles(homeMap);
    L.marker(OSM_PLACES.cubao, { icon: userDivIcon() }).addTo(homeMap).bindPopup('Your location');

    const offsets = [
      [14.635, 121.040],
      [14.610, 121.070],
      [14.600, 121.030]
    ];
    homeBusMarkers = [];
    (DEFAULT_NEARBY || []).forEach(function (bus, idx) {
      const m = L.marker(offsets[idx] || OSM_PLACES.cubao, {
        icon: busDivIcon(idx === 0, false)
      }).addTo(homeMap);
      m.bindPopup('<strong>' + bus.id + '</strong><br>' + bus.route + '<br>ETA ' + bus.eta);
      m.on('click', function () { selectNearbyBus(idx); });
      homeBusMarkers.push(m);
    });
    setTimeout(function () { homeMap.invalidateSize(); }, 200);
  }

  function homeMapZoom(delta) {
    if (homeMap) homeMap.setZoom(homeMap.getZoom() + delta);
  }
  function homeMapRecenter() {
    if (homeMap) homeMap.setView(OSM_PLACES.cubao, 12);
    showToast('Recentered on your area');
  }

  function initDetailMap(busId) {
    if (!ensureLeaflet()) return;
    const el = document.getElementById('detailLeaflet');
    if (!el) return;
    const key = routeKeyForBus(busId);
    const path = ROUTE_PATHS[key] || ROUTE_PATHS.default;
    const progress = (simProgress || 0) / 100;
    const busPos = pointAlongPath(path, progress);

    if (!detailMap) {
      detailMap = L.map(el, { zoomControl: false, attributionControl: true }).setView(busPos, 9);
      addOsmTiles(detailMap);
    }

    // Clear previous layers except tiles
    detailMap.eachLayer(function (layer) {
      if (layer instanceof L.TileLayer) return;
      detailMap.removeLayer(layer);
    });

    detailRouteLine = L.polyline(path, {
      color: '#2563EB',
      weight: 4,
      opacity: 0.75
    }).addTo(detailMap);

    L.marker(path[0], { icon: stopDivIcon('origin') }).addTo(detailMap).bindPopup('Origin');
    L.marker(path[path.length - 1], { icon: stopDivIcon('dest') }).addTo(detailMap).bindPopup('Destination');
    L.marker(OSM_PLACES.cubao, { icon: userDivIcon() }).addTo(detailMap).bindPopup('Your location');

    detailBusMarker = L.marker(busPos, { icon: busDivIcon(true, false) }).addTo(detailMap);
    detailBusMarker.bindPopup('Bus ' + (busId || ''));

    try {
      detailMap.fitBounds(detailRouteLine.getBounds(), { padding: [30, 30] });
    } catch (e) {}
    setTimeout(function () { detailMap.invalidateSize(); }, 200);
  }

  function updateDetailBusPosition() {
    if (!detailMap || !detailBusMarker) return;
    const key = routeKeyForBus(currentBusId);
    const path = ROUTE_PATHS[key] || ROUTE_PATHS.default;
    const pos = pointAlongPath(path, (simProgress || 0) / 100);
    detailBusMarker.setLatLng(pos);
  }

  function detailMapRecenter() {
    if (!detailMap || !detailRouteLine) return;
    try {
      detailMap.fitBounds(detailRouteLine.getBounds(), { padding: [30, 30] });
    } catch (e) {
      detailMap.setView(OSM_PLACES.nlex, 9);
    }
    showToast('Map recentered on route');
  }

  function initDriverMap() {
    if (!ensureLeaflet()) return;
    const el = document.getElementById('driverLeaflet');
    if (!el) return;
    const busId = currentDriver ? currentDriver.bus : 'GN-204';
    const key = routeKeyForBus(busId);
    const path = ROUTE_PATHS[key] || ROUTE_PATHS.default;
    const pos = pointAlongPath(path, 0.35);

    if (!driverMap) {
      driverMap = L.map(el, { zoomControl: false, attributionControl: true }).setView(pos, 10);
      addOsmTiles(driverMap);
    }
    driverMap.eachLayer(function (layer) {
      if (layer instanceof L.TileLayer) return;
      driverMap.removeLayer(layer);
    });
    L.polyline(path, { color: '#2563EB', weight: 3, opacity: 0.6 }).addTo(driverMap);
    driverBusMarker = L.marker(pos, { icon: busDivIcon(false, true) }).addTo(driverMap);
    driverBusMarker.bindPopup('Your bus ' + busId);
    setTimeout(function () { driverMap.invalidateSize(); }, 250);
  }

  function refreshMapsOnScreen(screenId) {
    setTimeout(function () {
      if (screenId === 'home') initHomeMap();
      if (screenId === 'busDetails') initDetailMap(currentBusId);
      if (screenId === 'driverHome') initDriverMap();
    }, 150);
  }



  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.profile) state.profile = { ...DEFAULT_PROFILE, ...saved.profile };
        if (saved.messages) state.messages = saved.messages;
        if (saved.bookings) state.bookings = saved.bookings;
        if (saved.schedules) state.schedules = saved.schedules;
        if (saved.occupied) state.occupied = saved.occupied;
        if (saved.boardedTickets) state.boardedTickets = saved.boardedTickets;
        if (saved.feedbacks) state.feedbacks = saved.feedbacks;
        if (typeof saved.boardedCount === 'number') boardedCount = saved.boardedCount;
      }
    } catch (e) { console.warn('load failed', e); }
  }
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        profile: state.profile, messages: state.messages, bookings: state.bookings,
        schedules: state.schedules, occupied: state.occupied, boardedTickets: state.boardedTickets,
        feedbacks: state.feedbacks, boardedCount
      }));
    } catch (e) { console.warn('save failed', e); }
  }
  function resetDemoData() {
    state = {
      profile: { ...DEFAULT_PROFILE },
      messages: JSON.parse(JSON.stringify(DEFAULT_MESSAGES)),
      bookings: JSON.parse(JSON.stringify(DEFAULT_BOOKINGS)),
      schedules: JSON.parse(JSON.stringify(DEFAULT_SCHEDULES)),
      occupied: JSON.parse(JSON.stringify(DEFAULT_OCCUPIED)),
      boardedTickets: [], feedbacks: []
    };
    boardedCount = 24; tripState = 'idle'; saveState();
    updateProfileUI(); updateNotifBadge(); showToast('Data has been reset', 'success'); navTo('home');
  }

  function navigate(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) { screen.classList.add('active'); if (historyStack[historyStack.length - 1] !== screenId) historyStack.push(screenId); }
    updateNav(screenId);
  }
  function navTo(screenId) {
    historyStack = [screenId]; navigate(screenId);
    if (screenId === 'schedule') renderSchedule();
    if (screenId === 'messages') renderMessages();
    if (screenId === 'bookings') renderBookings();
    if (screenId === 'home') { renderHomeSchedule(); updateNotifBadge(); updateGreeting(); }
    if (screenId === 'profile') updateProfileUI();
    refreshMapsOnScreen(screenId);
  }
  function goBack() {
    if (historyStack.length > 1) {
      historyStack.pop();
      const prev = historyStack[historyStack.length - 1];
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      document.getElementById(prev).classList.add('active');
      updateNav(prev);
    } else { if (currentDriver) driverNav('driverHome'); else navTo('home'); }
  }
  function updateNav(screenId) {
    const mainScreens = ['home', 'schedule', 'messages', 'bookings', 'profile'];
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.nav === screenId && mainScreens.includes(screenId));
    });
  }
  function driverNav(screenId) {
    historyStack = [screenId];
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
      if (item.dataset.nav && item.dataset.nav.startsWith('driver')) item.classList.toggle('active', item.dataset.nav === screenId);
    });
    if (screenId === 'driverHome') { refreshStaffDashboard(); refreshMapsOnScreen('driverHome'); }
  }

  setTimeout(() => {
    const loader = document.getElementById('splashLoader');
    if (loader) loader.style.display = 'none';
    const btns = document.getElementById('roleButtons');
    if (btns) btns.classList.add('show');
  }, 1200);

  function selectRole(role) {
    if (role === 'passenger') {
      document.getElementById('splash').classList.remove('active');
      document.getElementById('home').classList.add('active');
      historyStack = ['home']; currentDriver = null;
      updateGreeting(); updateNotifBadge(); renderHomeSchedule();
      setTimeout(initHomeMap, 250);
    } else {
      document.getElementById('splash').classList.remove('active');
      document.getElementById('driverLogin').classList.add('active');
      historyStack = ['splash', 'driverLogin'];
      document.getElementById('driverId').value = '';
      document.getElementById('driverPw').value = '';
      document.getElementById('loginError').classList.remove('show');
    }
  }
  function backToRoleSelect() {
    currentDriver = null; tripState = 'idle'; stopSimMovement();
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('splash').classList.add('active');
    document.getElementById('splashLoader').style.display = 'none';
    document.getElementById('roleButtons').classList.add('show');
    historyStack = ['splash'];
  }

  function togglePassword() {
    const input = document.getElementById('driverPw');
    const icon = document.getElementById('eyeIcon');
    if (input.type === 'password') {
      input.type = 'text';
      icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    } else {
      input.type = 'password';
      icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }
  }
  function applyStaffSession(match) {
    currentDriver = { id: match.id, name: match.name, role: match.role, bus: match.bus };
    document.getElementById('driverWelcome').textContent = 'Welcome, ' + match.name.split(' ')[0];
    document.getElementById('driverBusLabel').textContent = match.bus;
    document.getElementById('driverProfileName').textContent = match.name;
    document.getElementById('driverProfileId').textContent = 'ID: ' + match.id;
    document.getElementById('driverAssignedBus').textContent = match.bus;
    document.getElementById('driverRole').textContent = match.role;
    document.getElementById('driverAvatar').textContent = match.name.split(' ').map(n => n[0]).join('').slice(0, 2);
    document.getElementById('feedbackBus').textContent = match.bus;
    updateTripControls();
    refreshStaffDashboard();
    driverNav('driverHome');
    showToast('Logged in as ' + match.role, 'success');
  }

  async function doDriverLogin() {
    const id = document.getElementById('driverId').value.trim();
    const pw = document.getElementById('driverPw').value;
    const errEl = document.getElementById('loginError');
    errEl.classList.remove('show');
    if (!id || !pw) { showToast('Enter your ID number and password', 'error'); return; }
    const btn = document.getElementById('loginBtn');
    btn.disabled = true; btn.textContent = 'Verifying...';
    try {
      if (apiOnline) {
        const res = await apiFetch('/staff/login', { method: 'POST', body: JSON.stringify({ id, password: pw }) });
        applyStaffSession(res.data);
      } else {
        const match = DEFAULT_DRIVERS.find(d => d.id.toUpperCase() === id.toUpperCase() && d.password === pw);
        if (!match) { errEl.classList.add('show'); document.getElementById('driverPw').value = ''; return; }
        await new Promise(r => setTimeout(r, 400));
        applyStaffSession(match);
      }
    } catch (e) {
      errEl.classList.add('show');
      document.getElementById('driverPw').value = '';
      showToast(e.message || 'Login failed', 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Log in';
    }
  }
  function confirmDriverLogout() {
    openModal('Log out?', 'You will return to the role selection screen.', () => {
      currentDriver = null; tripState = 'idle'; backToRoleSelect(); showToast('Logged out');
    });
  }

  function updateTripControls() {
    const st = tripState;
    document.getElementById('tripStatusLabel').textContent = st === 'idle' ? 'Idle' : st === 'active' ? 'Active (Live tracking)' : st === 'paused' ? 'Paused' : 'Ended';
    document.getElementById('btnStartTrip').disabled = st !== 'idle' && st !== 'ended';
    document.getElementById('btnPauseTrip').disabled = st !== 'active';
    document.getElementById('btnResumeTrip').disabled = st !== 'paused';
    document.getElementById('btnEndTrip').disabled = st === 'idle' || st === 'ended';
    const badge = document.getElementById('driverStatusBadge');
    const duty = document.getElementById('driverDutyStatus');
    if (st === 'active') { badge.textContent = 'On Route'; badge.className = 'bus-status'; if (duty) duty.textContent = 'On route'; }
    else if (st === 'paused') { badge.textContent = 'Paused'; badge.className = 'bus-status delayed'; if (duty) duty.textContent = 'Paused'; }
    else if (st === 'ended') { badge.textContent = 'Off Duty'; badge.className = 'bus-status ended'; if (duty) duty.textContent = 'Off duty'; }
    else { badge.textContent = 'On Duty'; badge.className = 'bus-status'; if (duty) duty.textContent = 'On duty'; }
    const sumStatus = document.getElementById('summaryStatus');
    if (sumStatus) sumStatus.textContent = st === 'active' ? 'On Route' : st === 'paused' ? 'Paused' : st === 'ended' ? 'Ended' : 'Idle';
  }
  async function tripAction(action) {
    if (apiOnline && currentDriver) {
      try {
        await apiFetch('/staff/bus/' + encodeURIComponent(currentDriver.bus) + '/trip', {
          method: 'POST',
          body: JSON.stringify({ action: action })
        });
      } catch (e) {
        showToast(e.message || 'Trip action failed', 'error');
        return false;
      }
    }
    return true;
  }
  async function startTrip() {
    if (!(await tripAction('start'))) return;
    tripState = 'active'; updateTripControls(); showToast('Trip started · Tracking active', 'success');
  }
  async function pauseTrip() {
    if (!(await tripAction('pause'))) return;
    tripState = 'paused'; updateTripControls(); showToast('Trip paused');
  }
  async function resumeTrip() {
    if (!(await tripAction('resume'))) return;
    tripState = 'active'; updateTripControls(); showToast('Trip resumed · Tracking active', 'success');
  }
  function confirmEndTrip() {
    openModal('End Trip?', 'This will mark the current trip as completed. Continue?', async () => {
      if (!(await tripAction('end'))) return;
      tripState = 'ended'; updateTripControls(); showToast('Trip ended', 'success');
    });
  }

  function openNextPickup(route, time) {
    document.getElementById('pickupName').textContent = 'Ana Reyes';
    document.getElementById('pickupLoc').textContent = 'Cubao Terminal Gate 3';
    document.getElementById('pickupNum').textContent = '09XX-XXX-4821';
    navigate('nextPickup');
  }
  function openQuickReply() { document.getElementById('replyOverlay').classList.add('show'); document.getElementById('quickReplySheet').classList.add('open'); }
  function closeQuickReply() { document.getElementById('replyOverlay').classList.remove('show'); document.getElementById('quickReplySheet').classList.remove('open'); }
  async function sendQuickReply(msg) {
    closeQuickReply();
    if (apiOnline) {
      try {
        await apiFetch('/staff/quick-reply', {
          method: 'POST',
          body: JSON.stringify({ message: msg, bus: currentDriver ? currentDriver.bus : null })
        });
        await syncFromApi();
        renderMessages(); updateNotifBadge();
      } catch (e) { console.warn(e); }
    }
    showToast('Message sent: "' + msg + '"', 'success');
  }
  function acknowledgeDispatch(btn) { btn.textContent = 'Acknowledged'; btn.disabled = true; btn.style.opacity = '0.6'; showToast('Dispatch acknowledged', 'success'); }

  async function simulateScan() {
    const manual = document.getElementById('manualTicket').value.trim();
    const busId = currentDriver ? currentDriver.bus : null;
    const result = document.getElementById('scanResult');
    const title = document.getElementById('scanResultTitle');
    const detail = document.getElementById('scanResultDetail');
    result.classList.remove('hidden');
    try {
      if (apiOnline) {
        const res = await apiFetch('/staff/validate-ticket', {
          method: 'POST',
          body: JSON.stringify({ ref: manual || undefined, bus: busId })
        });
        const booking = res.data;
        await syncFromApi();
        refreshStaffDashboard();
        title.style.color = 'var(--success)'; title.textContent = '✓ Ticket valid';
        detail.innerHTML = 'Seat <strong>' + escapeHtml(booking.seat) + '</strong> · ' + escapeHtml(booking.passenger || 'Passenger') +
          '<br>Ref: ' + escapeHtml(booking.ref) +
          '<br>Pickup: ' + escapeHtml(booking.pickup || booking.origin || '—');
        showToast('Ticket valid · Seat ' + booking.seat + ' · Boarded', 'success');
        return;
      }
      // Local fallback
      let booking = null;
      if (manual) booking = state.bookings.find(b => b.ref.toUpperCase() === manual.toUpperCase());
      else if (busId) booking = state.bookings.find(b => b.bus === busId && b.status === 'upcoming' && !b.boarded);
      else booking = state.bookings.find(b => b.status === 'upcoming' && !b.boarded);
      if (!booking) {
        title.style.color = 'var(--danger)'; title.textContent = '✗ Ticket not found';
        detail.textContent = 'No matching upcoming booking for this bus.';
        showToast('Invalid ticket', 'error'); return;
      }
      if (busId && booking.bus !== busId) {
        title.style.color = 'var(--danger)'; title.textContent = '✗ Wrong bus';
        detail.textContent = 'This ticket is for bus ' + booking.bus + ', not ' + busId + '.';
        showToast('Ticket is for a different bus', 'error'); return;
      }
      if (booking.status === 'cancelled') {
        title.style.color = 'var(--danger)'; title.textContent = '✗ Ticket cancelled';
        detail.textContent = 'This booking was cancelled.';
        showToast('Cancelled ticket', 'error'); return;
      }
      if (booking.status === 'completed') {
        title.style.color = 'var(--warning)'; title.textContent = '⚠ Trip already completed';
        detail.textContent = 'Seat ' + booking.seat + ' · ' + (booking.passenger || 'Passenger');
        showToast('Trip already completed', 'error'); return;
      }
      if (booking.boarded || state.boardedTickets.includes(booking.ref)) {
        title.style.color = 'var(--warning)'; title.textContent = '⚠ Already boarded';
        detail.textContent = 'Seat ' + booking.seat + ' · ' + (booking.passenger || 'Passenger');
        showToast('Ticket already used', 'error'); return;
      }
      booking.boarded = true;
      if (!state.boardedTickets.includes(booking.ref)) state.boardedTickets.push(booking.ref);
      boardedCount = getStaffBookings().filter(b => b.boarded && b.status === 'upcoming').length;
      const seatsLeftEl = document.getElementById('seatsLeftCount');
      const boardedEl = document.getElementById('boardedCount');
      if (boardedEl) boardedEl.textContent = boardedCount;
      if (seatsLeftEl) {
        const cap = getBusCapacity(busId);
        seatsLeftEl.textContent = Math.max(0, cap - getStaffBookings().filter(b => b.status === 'upcoming').length);
      }
      title.style.color = 'var(--success)'; title.textContent = '✓ Ticket valid';
      detail.innerHTML = 'Seat <strong>' + escapeHtml(booking.seat) + '</strong> · ' + escapeHtml(booking.passenger || 'Passenger') +
        '<br>Ref: ' + escapeHtml(booking.ref) +
        '<br>Pickup: ' + escapeHtml(booking.pickup || booking.origin || '—');
      saveState();
      refreshStaffDashboard();
      showToast('Ticket valid · Seat ' + booking.seat + ' · Boarded', 'success');
    } catch (e) {
      const code = e.payload && e.payload.code;
      title.style.color = code === 'ALREADY_BOARDED' ? 'var(--warning)' : 'var(--danger)';
      title.textContent = code === 'ALREADY_BOARDED' ? '⚠ Already boarded' : '✗ ' + (e.message || 'Invalid');
      detail.textContent = e.message || 'Validation failed';
      showToast(e.message || 'Invalid ticket', 'error');
    }
  }

  function simulateScanInvalid() {
    const result = document.getElementById('scanResult');
    result.classList.remove('hidden');
    document.getElementById('scanResultTitle').style.color = 'var(--danger)';
    document.getElementById('scanResultTitle').textContent = '✗ Invalid ticket';
    document.getElementById('scanResultDetail').textContent = 'QR code could not be verified (demo invalid).';
    showToast('Invalid ticket', 'error');
  }

  function updateTime() {
    const now = new Date(); const h = now.getHours() % 12 || 12; const m = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('statusTime').textContent = h + ':' + m;
  }
  function updateGreeting() {
    const h = new Date().getHours();
    let g = 'Good evening'; if (h < 12) g = 'Good morning'; else if (h < 17) g = 'Good afternoon';
    document.getElementById('greetingText').textContent = g;
    document.getElementById('homeUserName').textContent = (state.profile.name || 'Guest').split(' ')[0];
  }
  updateTime(); setInterval(updateTime, 30000);

  function selectNearbyBus(idx) {
    document.querySelectorAll('#homeMap .bus-marker').forEach((m, i) => m.classList.toggle('selected', i === idx));
    const b = DEFAULT_NEARBY[idx];
    document.getElementById('nbNumber').textContent = b.id;
    document.getElementById('nbStatus').textContent = b.status;
    document.getElementById('nbStatus').className = 'bus-status' + (b.status === 'Approaching' ? ' approaching' : '');
    document.getElementById('nbRoute').textContent = b.route;
    document.getElementById('nbEta').textContent = b.eta;
    const sched = state.schedules.find(s => s.id === b.id);
    document.getElementById('nbSeats').textContent = sched ? sched.seats : b.seats;
    document.getElementById('nbFare').textContent = b.fare;
    currentBusId = b.id;
    const card = document.getElementById('nearbyBusCard');
    card.querySelector('.btn-group').innerHTML = `<button class="btn btn-outline btn-sm" onclick="openBusDetails('${b.id}')">Track Bus</button><button class="btn btn-primary btn-sm" onclick="startBookingFromBus('${b.id}')">Book a Seat</button>`;
  }
  function renderHomeSchedule() {
    const el = document.getElementById('homeSchedulePreview');
    if (!el) return;
    el.innerHTML = state.schedules.slice(0, 2).map(s => `
      <div class="schedule-card" onclick="openBusDetails('${s.id}')">
        <div class="sched-top"><span class="sched-bus">${s.id}</span><span class="sched-fare">${s.fare}</span></div>
        <div class="sched-route"><span>${s.origin}</span><span class="arrow">→</span><span>${s.dest}</span></div>
        <div class="sched-details"><span class="sched-detail">Dep <strong>${s.dep}</strong></span><span class="sched-detail">Arr ~ <strong>${s.arr}</strong></span><span class="sched-detail"><strong>${s.seats}</strong> seats</span></div>
      </div>`).join('');
  }

  function openBusDetails(busId) {
    currentBusId = busId;
    const sched = state.schedules.find(s => s.id === busId) || state.schedules[0];
    document.getElementById('bdNumber').textContent = sched.id;
    document.getElementById('bdStatus').textContent = sched.status;
    document.getElementById('bdStatus').className = 'bus-status' + (sched.status === 'Scheduled' ? ' scheduled' : '');
    document.getElementById('bdRoute').textContent = sched.origin + ' Terminal → ' + sched.dest;
    document.getElementById('bdEta').textContent = sched.status === 'On Route' ? '~4h 45m' : '—';
    document.getElementById('bdSeats').textContent = sched.seats;
    document.getElementById('bdFare').textContent = sched.fare;
    document.getElementById('bdDep').textContent = sched.dep;
    document.getElementById('bdArr').textContent = sched.arr;
    document.getElementById('bdLoc').textContent = sched.status === 'On Route' ? 'NLEX' : 'Terminal';
    simProgress = sched.status === 'On Route' ? 35 : 0;
    document.getElementById('tripProgress').style.width = simProgress + '%';
    document.getElementById('progressLabel').textContent = 'Trip progress · Simulated · ' + simProgress + '%';
    renderStops(busId); stopSimMovement(); navigate('busDetails');
  }
  function renderStops(busId) {
    const stops = ROUTE_STOPS[busId] || ROUTE_STOPS.default;
    document.getElementById('stopList').innerHTML = stops.map(s => `
      <div class="stop-item"><div class="stop-dot ${s.status}"></div><div class="stop-info"><div class="stop-name">${s.name}</div><div class="stop-time">${s.time}${s.status === 'current' ? ' · Current' : s.status === 'passed' ? ' · Passed' : ''}</div></div></div>`).join('');
  }
  function toggleSimMovement() {
    if (simMoving) { stopSimMovement(); showToast('Tracking paused'); }
    else {
      simMoving = true;
      var btn = document.getElementById('simMoveBtn');
      if (btn) btn.textContent = '❚❚';
      if (!detailMap) initDetailMap(currentBusId);
      simTimer = setInterval(function () {
        if (simProgress >= 95) {
          stopSimMovement();
          showToast('Arrived at destination', 'success');
          return;
        }
        simProgress += 2;
        document.getElementById('tripProgress').style.width = simProgress + '%';
        document.getElementById('progressLabel').textContent = 'Trip progress · ' + simProgress + '%';
        updateDetailBusPosition();
        document.getElementById('bdLoc').textContent = locationLabel(simProgress / 100);
        document.getElementById('bdEta').textContent =
          simProgress < 30 ? '~4h' : simProgress < 60 ? '~2h 30m' : simProgress < 85 ? '~1h' : '~20 min';
      }, 800);
      showToast('Live tracking started');
    }
  }
  function stopSimMovement() {
    simMoving = false;
    if (simTimer) { clearInterval(simTimer); simTimer = null; }
    const btn = document.getElementById('simMoveBtn');
    if (btn) btn.textContent = '▶';
  }
  function resetSimPosition() {
    stopSimMovement();
    simProgress = 35;
    document.getElementById('tripProgress').style.width = '35%';
    document.getElementById('progressLabel').textContent = 'Trip progress · OSM path · 35%';
    document.getElementById('bdLoc').textContent = 'NLEX';
    document.getElementById('bdEta').textContent = '~4h 45m';
    if (!detailMap) initDetailMap(currentBusId);
    else updateDetailBusPosition();
    showToast('Position reset');
  }

  function renderSchedule() {
    const list = document.getElementById('scheduleList');
    let filtered = scheduleFilter === 'all' ? state.schedules : state.schedules.filter(s => s.filter === scheduleFilter);
    if (scheduleQuery) {
      const q = scheduleQuery.toLowerCase();
      filtered = filtered.filter(s => s.id.toLowerCase().includes(q) || s.origin.toLowerCase().includes(q) || s.dest.toLowerCase().includes(q));
    }
    if (filtered.length === 0) {
      list.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><p>No schedules match your search</p><button class="btn btn-outline btn-sm" onclick="clearScheduleFilters()">Clear filters</button></div>`;
      return;
    }
    list.innerHTML = '<div class="px-16 py-12">' + filtered.map(s => `
      <div class="schedule-card">
        <div class="sched-top"><span class="sched-bus">${s.id}</span><span class="sched-fare">${s.fare}</span></div>
        <div class="sched-route"><span>${s.origin}</span><span class="arrow">→</span><span>${s.dest}</span></div>
        <div class="sched-details"><span class="sched-detail">Dep <strong>${s.dep}</strong></span><span class="sched-detail">Arr ~ <strong>${s.arr}</strong></span><span class="sched-detail"><strong>${s.seats}</strong> seats</span><span class="sched-detail">${s.status}</span></div>
        <div class="sched-actions"><button class="btn btn-outline btn-sm" onclick="event.stopPropagation();openBusDetails('${s.id}')">Details</button><button class="btn btn-primary btn-sm" onclick="event.stopPropagation();startBookingFromSchedule('${s.id}')">Book</button></div>
      </div>`).join('') + '</div>';
  }
  function filterSchedule(btn, filter) {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active'); scheduleFilter = filter; renderSchedule();
  }
  function onScheduleSearch() { scheduleQuery = document.getElementById('scheduleSearch').value.trim(); renderSchedule(); }
  function clearScheduleFilters() {
    scheduleFilter = 'all'; scheduleQuery = ''; document.getElementById('scheduleSearch').value = '';
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c.dataset.filter === 'all'));
    renderSchedule();
  }

  function renderMessages() {
    const list = document.getElementById('messageList');
    if (state.messages.length === 0) {
      list.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>No messages yet</p></div>`;
      return;
    }
    list.innerHTML = state.messages.map(m => `
      <div class="message-item ${m.unread ? 'unread' : ''}" onclick="openMessage(${m.id})">
        <div class="msg-icon ${m.icon}"><svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div>
        <div class="msg-body"><div class="msg-title">${m.title}<span class="msg-time">${m.time}</span></div><div class="msg-preview">${m.preview}</div></div>
        ${m.unread ? '<div class="unread-dot"></div>' : ''}
      </div>`).join('');
    updateNotifBadge();
  }
  function openMessage(id) {
    const m = state.messages.find(x => x.id === id);
    if (m) { m.unread = false; saveState(); renderMessages(); showToast(m.preview); }
  }
  function markAllRead() { state.messages.forEach(m => m.unread = false); saveState(); renderMessages(); showToast('All messages marked as read', 'success'); }
  function updateNotifBadge() {
    const unread = state.messages.filter(m => m.unread).length;
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    if (unread > 0) { badge.style.display = 'flex'; badge.className = 'badge count'; badge.textContent = unread > 9 ? '9+' : unread; }
    else { badge.style.display = 'none'; badge.className = 'badge'; badge.textContent = ''; }
  }

  function renderBookings() {
    const list = document.getElementById('bookingsList');
    const filtered = state.bookings.filter(b => b.status === bookingTab);
    if (filtered.length === 0) {
      list.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><p>No ${bookingTab} bookings</p>${bookingTab === 'upcoming' ? '<button class="btn btn-primary btn-sm" onclick="navigate(\'reserve\')">Book a Ride</button>' : ''}</div>`;
      return;
    }
    list.innerHTML = '<div class="px-16 py-12">' + filtered.map(b => `
      <div class="booking-card" onclick="openBookingDetail('${b.id}')">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span class="sched-bus">${b.bus}</span><span class="booking-status ${b.status}">${b.status.charAt(0).toUpperCase() + b.status.slice(1)}</span></div>
        <div class="sched-route" style="margin-bottom:6px"><span>${b.origin}</span><span class="arrow">→</span><span>${b.dest}</span></div>
        <div class="sched-details"><span class="sched-detail">${b.date}</span><span class="sched-detail">Dep <strong>${b.dep}</strong></span><span class="sched-detail">Seat <strong>${b.seat}</strong></span></div>
      </div>`).join('') + '</div>';
  }
  function switchBookingTab(btn, tab) {
    document.querySelectorAll('#bookings .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active'); bookingTab = tab; renderBookings();
  }
  function openBookingDetail(id) {
    const b = state.bookings.find(x => x.id === id);
    if (!b) return;
    document.getElementById('bookingDetailContent').innerHTML = `
      <div class="summary-card">
        <div class="summary-row"><span class="label">Booking Ref</span><span class="value">${b.ref} <button class="copy-btn" onclick="event.stopPropagation();copyRef('${b.ref}')">Copy</button></span></div>
        <div class="summary-row"><span class="label">Status</span><span class="value"><span class="booking-status ${b.status}">${b.status.charAt(0).toUpperCase() + b.status.slice(1)}</span></span></div>
        <div class="summary-row"><span class="label">Bus</span><span class="value">${b.bus}</span></div>
        <div class="summary-row"><span class="label">Route</span><span class="value">${b.origin} → ${b.dest}</span></div>
        <div class="summary-row"><span class="label">Date</span><span class="value">${b.date}</span></div>
        <div class="summary-row"><span class="label">Departure</span><span class="value">${b.dep}</span></div>
        <div class="summary-row"><span class="label">Seat</span><span class="value">${b.seat}</span></div>
        <div class="summary-row"><span class="label">Passenger</span><span class="value">${b.passenger || '—'}</span></div>
        <div class="summary-row"><span class="label">Fare</span><span class="value">${b.fare}</span></div>
      </div>
      <div class="qr-placeholder"><div class="qr-grid">${generateQRCells(b.ref)}</div><span>Ticket QR</span></div>
      ${b.status === 'upcoming' ? `<button class="btn btn-primary btn-block" onclick="openBusDetails('${b.bus}')">Track Bus</button><button class="btn btn-outline btn-block mt-12" onclick="confirmCancelBooking('${b.id}')">Cancel Booking</button>` : ''}`;
    navigate('bookingDetail');
  }
  function copyRef(ref) {
    if (navigator.clipboard) navigator.clipboard.writeText(ref).then(() => showToast('Reference copied', 'success'));
    else showToast('Reference: ' + ref);
  }
  function confirmCancelBooking(id) {
    openModal('Cancel Booking?', 'This will cancel your reservation and release the seat(s). This cannot be undone.', () => cancelBooking(id));
  }
  async function cancelBooking(id) {
    const b = state.bookings.find(x => x.id === id);
    if (!b || b.status !== 'upcoming') return;
    try {
      if (apiOnline) {
        await apiFetch('/bookings/' + encodeURIComponent(b.id) + '/cancel', { method: 'POST', body: '{}' });
        await syncFromApi();
      } else {
        b.status = 'cancelled';
        b.boarded = false;
        const seats = (b.seat || '').split(',').map(s => s.trim()).filter(Boolean);
        if (!state.occupied[b.bus]) state.occupied[b.bus] = [];
        seats.forEach(s => { const idx = state.occupied[b.bus].indexOf(s); if (idx >= 0) state.occupied[b.bus].splice(idx, 1); });
        const sched = state.schedules.find(s => s.id === b.bus);
        if (sched) sched.seats = Math.min(sched.capacity || 32, sched.seats + seats.length);
        const tIdx = state.boardedTickets.indexOf(b.ref);
        if (tIdx >= 0) state.boardedTickets.splice(tIdx, 1);
        saveState();
      }
      if (currentDriver && currentDriver.bus === b.bus) refreshStaffDashboard();
      showToast('Booking cancelled · Seats released', 'success');
      navigate('bookings'); renderBookings();
    } catch (e) {
      showToast(e.message || 'Cancel failed', 'error');
    }
  }

  function startBookingFromBus(busId) {
    const s = state.schedules.find(x => x.id === busId) || state.schedules[0];
    bookingState.bus = s; bookingState.origin = s.origin; bookingState.dest = s.dest;
    bookingState.fare = parseInt(String(s.fare).replace(/[₱,]/g, '')) || 695; currentBusId = busId;
    const originSel = document.getElementById('originSelect');
    if (originSel) { const match = Array.from(originSel.options).find(o => s.origin.toLowerCase().includes(o.value.toLowerCase())); if (match) originSel.value = match.value; }
    const destSel = document.getElementById('destSelect');
    if (destSel) { const match = Array.from(destSel.options).find(o => s.dest.toLowerCase().includes(o.value.toLowerCase())); if (match) destSel.value = match.value; }
    navigate('reserve'); updateRoutePreview();
  }
  function startBookingFromSchedule(busId) { startBookingFromBus(busId); }
  function updateRoutePreview() {
    const o = document.getElementById('originSelect').value;
    const d = document.getElementById('destSelect').value;
    const date = document.getElementById('travelDate').value;
    const pax = document.getElementById('passengerCount').value;
    document.getElementById('routePreview').textContent = o + ' → ' + d;
    const dateStr = date ? new Date(date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today';
    document.getElementById('datePreview').textContent = dateStr + ' · ' + pax + ' passenger' + (pax > 1 ? 's' : '');
    bookingState.origin = o; bookingState.dest = d; bookingState.date = date; bookingState.passengers = parseInt(pax) || 1;
  }
  function goToTripSelection() {
    updateRoutePreview();
    const list = document.getElementById('tripList');
    const o = bookingState.origin.toLowerCase().slice(0, 4);
    const d = bookingState.dest.toLowerCase().slice(0, 4);
    let relevant = state.schedules.filter(s => s.origin.toLowerCase().includes(o) || s.dest.toLowerCase().includes(d));
    if (!relevant.length) relevant = state.schedules.slice(0, 4);
    list.innerHTML = relevant.map(s => `
      <div class="schedule-card">
        <div class="sched-top"><span class="sched-bus">${s.id}</span><span class="sched-fare">${s.fare}</span></div>
        <div class="sched-route"><span>${s.origin}</span><span class="arrow">→</span><span>${s.dest}</span></div>
        <div class="sched-details"><span class="sched-detail">Dep <strong>${s.dep}</strong></span><span class="sched-detail">Arr ~ <strong>${s.arr}</strong></span><span class="sched-detail"><strong>${s.seats}</strong> seats left</span></div>
        <button class="btn btn-primary btn-sm btn-block" onclick="selectTrip('${s.id}')">Select Trip</button>
      </div>`).join('');
    navigate('tripSelect');
  }
  function selectTrip(busId) {
    const s = state.schedules.find(x => x.id === busId); if (!s) return;
    bookingState.bus = s; bookingState.fare = parseInt(String(s.fare).replace(/[₱,]/g, '')) || 695;
    selectedSeats = []; renderSeatMap(); navigate('seatSelect');
  }
  function renderSeatMap() {
    const grid = document.getElementById('seatGrid');
    const busId = bookingState.bus ? bookingState.bus.id : 'GN-204';
    const occupied = new Set(state.occupied[busId] || []);
    let html = '';
    for (let r = 1; r <= 10; r++) {
      html += '<div class="seat-row">';
      ['A', 'B'].forEach(col => {
        const id = r + col; const isOcc = occupied.has(id); const isSel = selectedSeats.includes(id);
        html += `<div class="seat ${isOcc ? 'occupied' : isSel ? 'selected' : 'available'}" data-seat="${id}" ${isOcc ? '' : `onclick="toggleSeat('${id}')"`}>${id}</div>`;
      });
      html += '<div class="seat aisle"></div>';
      ['C', 'D'].forEach(col => {
        const id = r + col; const isOcc = occupied.has(id); const isSel = selectedSeats.includes(id);
        html += `<div class="seat ${isOcc ? 'occupied' : isSel ? 'selected' : 'available'}" data-seat="${id}" ${isOcc ? '' : `onclick="toggleSeat('${id}')"`}>${id}</div>`;
      });
      html += '</div>';
    }
    grid.innerHTML = html; updateSeatSummary();
  }
  function toggleSeat(id) {
    const max = bookingState.passengers;
    const idx = selectedSeats.indexOf(id);
    if (idx >= 0) selectedSeats.splice(idx, 1);
    else { if (selectedSeats.length >= max) selectedSeats.shift(); selectedSeats.push(id); }
    bookingState.seat = selectedSeats.join(', '); renderSeatMap();
  }
  function updateSeatSummary() {
    document.getElementById('selectedSeatLabel').textContent = selectedSeats.length ? selectedSeats.join(', ') : 'None';
    document.getElementById('seatPassCount').textContent = bookingState.passengers;
    document.getElementById('seatFare').textContent = '₱' + bookingState.fare;
    document.getElementById('seatTotal').textContent = '₱' + (bookingState.fare * bookingState.passengers);
    document.getElementById('seatContinueBtn').disabled = selectedSeats.length < bookingState.passengers;
  }
  function goToPassengerInfo() {
    if (selectedSeats.length < bookingState.passengers) { showToast('Please select ' + bookingState.passengers + ' seat(s)', 'error'); return; }
    document.getElementById('paxName').value = state.profile.name || '';
    document.getElementById('paxPhone').value = state.profile.phone || '';
    document.getElementById('paxEmail').value = state.profile.email || '';
    document.getElementById('paxNameErr').classList.remove('show');
    document.getElementById('paxPhoneErr').classList.remove('show');
    navigate('passengerInfo');
  }
  function goToPayment() {
    const name = document.getElementById('paxName').value.trim();
    const phone = document.getElementById('paxPhone').value.trim();
    let valid = true;
    if (!name) { document.getElementById('paxNameErr').classList.add('show'); valid = false; } else document.getElementById('paxNameErr').classList.remove('show');
    if (!phone || phone.replace(/\D/g, '').length < 10) { document.getElementById('paxPhoneErr').classList.add('show'); valid = false; } else document.getElementById('paxPhoneErr').classList.remove('show');
    if (!valid) return;
    bookingState.paxName = name; bookingState.paxPhone = phone; bookingState.paxEmail = document.getElementById('paxEmail').value.trim();
    const s = bookingState.bus;
    const dateStr = bookingState.date ? new Date(bookingState.date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Tomorrow';
    document.getElementById('payRoute').textContent = s.origin + ' → ' + s.dest;
    document.getElementById('payDate').textContent = dateStr;
    document.getElementById('payDep').textContent = s.dep;
    document.getElementById('payBus').textContent = s.id;
    document.getElementById('paySeat').textContent = selectedSeats.join(', ');
    document.getElementById('payPax').textContent = bookingState.passengers;
    document.getElementById('payPaxName').textContent = name;
    document.getElementById('payTotal').textContent = '₱' + (bookingState.fare * bookingState.passengers);
    document.getElementById('paymentContent').classList.remove('hidden');
    document.getElementById('confirmedContent').classList.add('hidden');
    navigate('payment');
  }
  function selectPayment(el) {
    document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected'); el.querySelector('input').checked = true;
    bookingState.payment = el.dataset.method || 'GCash';
  }
  async function confirmReservation() {
    const btn = document.getElementById('confirmBookBtn');
    btn.disabled = true; btn.textContent = 'Processing...';
    const s = bookingState.bus;
    const dateStr = bookingState.date ? new Date(bookingState.date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Tomorrow';
    try {
      let newBooking;
      if (apiOnline) {
        const res = await apiFetch('/bookings', {
          method: 'POST',
          body: JSON.stringify({
            bus: s.id,
            seats: selectedSeats.slice(),
            passenger: bookingState.paxName,
            phone: bookingState.paxPhone || '',
            email: bookingState.paxEmail || '',
            date: dateStr,
            payment: bookingState.payment || 'GCash'
          })
        });
        newBooking = res.data;
        await syncFromApi();
      } else {
        const ref = 'GT-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);
        newBooking = {
          id: 'BK-' + Date.now(), ref, bus: s.id, origin: s.origin, dest: s.dest,
          pickup: (s.origin || 'Cubao') + (s.origin && s.origin.toLowerCase().includes('terminal') ? '' : ' Terminal'),
          dropoff: s.dest,
          date: dateStr, dep: s.dep,
          seat: selectedSeats.join(', '), status: 'upcoming', fare: '₱' + (bookingState.fare * bookingState.passengers),
          passenger: bookingState.paxName, boarded: false
        };
        state.bookings.unshift(newBooking);
        if (!state.occupied[s.id]) state.occupied[s.id] = [];
        selectedSeats.forEach(seat => { if (!state.occupied[s.id].includes(seat)) state.occupied[s.id].push(seat); });
        s.seats = Math.max(0, s.seats - selectedSeats.length);
        state.messages.unshift({ id: Date.now(), icon: 'green', title: 'Reservation Confirmed', preview: 'Your reservation ' + ref + ' for ' + s.id + ' is confirmed.', time: 'Just now', unread: true });
        saveState();
      }
      if (currentDriver && currentDriver.bus === s.id) refreshStaffDashboard();
      document.getElementById('confRef').textContent = newBooking.ref;
      document.getElementById('confBus').textContent = s.id;
      document.getElementById('confRoute').textContent = s.origin + ' → ' + s.dest;
      document.getElementById('confDep').textContent = dateStr + ' · ' + s.dep;
      document.getElementById('confSeat').textContent = selectedSeats.join(', ');
      document.getElementById('qrGrid').innerHTML = generateQRCells(newBooking.ref);
      document.getElementById('paymentContent').classList.add('hidden');
      document.getElementById('confirmedContent').classList.remove('hidden');
      showToast('Reservation confirmed!', 'success');
    } catch (e) {
      showToast(e.message || 'Booking failed', 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Confirm Reservation';
    }
  }
  function generateQRCells(seed) {
    let cells = '', h = 0;
    for (let i = 0; i < seed.length; i++) h = ((h << 5) - h) + seed.charCodeAt(i);
    for (let i = 0; i < 49; i++) { const on = ((h + i * 17) % 7) > 2; cells += `<div class="qr-cell ${on ? '' : 'off'}"></div>`; }
    return cells;
  }
  function viewBookingAfterConfirm() { openBookingDetail(state.bookings[0].id); }

  function updateProfileUI() {
    const p = state.profile;
    document.getElementById('profileName').textContent = p.name;
    document.getElementById('profileEmail').textContent = p.email;
    document.getElementById('profileAvatar').textContent = p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('editName').value = p.name;
    document.getElementById('editEmail').value = p.email;
    document.getElementById('editPhone').value = p.phone || '';
    document.getElementById('togArrival').classList.toggle('on', !!p.prefs.arrival);
    document.getElementById('togBooking').classList.toggle('on', !!p.prefs.booking);
    document.getElementById('togDelay').classList.toggle('on', !!p.prefs.delay);
    document.getElementById('togPromo').classList.toggle('on', !!p.prefs.promo);
  }
  function openEditProfile() { updateProfileUI(); document.getElementById('editNameErr').classList.remove('show'); document.getElementById('editEmailErr').classList.remove('show'); navigate('editProfile'); }
  function saveProfile() {
    const name = document.getElementById('editName').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    let valid = true;
    if (!name) { document.getElementById('editNameErr').classList.add('show'); valid = false; } else document.getElementById('editNameErr').classList.remove('show');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { document.getElementById('editEmailErr').classList.add('show'); valid = false; } else document.getElementById('editEmailErr').classList.remove('show');
    if (!valid) return;
    state.profile.name = name; state.profile.email = email; state.profile.phone = phone;
    saveState(); updateProfileUI(); updateGreeting(); showToast('Profile saved', 'success'); navTo('profile');
  }
  function openPaymentMethods() { showToast('Payment methods: GCash, Maya, Card, Pay at Terminal'); }
  function openNotifSettings() { updateProfileUI(); navigate('notifSettings'); }
  function togglePref(btn, key) {
    btn.classList.toggle('on'); state.profile.prefs[key] = btn.classList.contains('on'); saveState();
    showToast((state.profile.prefs[key] ? 'Enabled' : 'Disabled') + ' ' + key + ' alerts');
  }
  function openFeedbackForm() {
    feedbackRating = 0; document.querySelectorAll('.star-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('feedbackText').value = ''; document.getElementById('feedbackErr').classList.remove('show');
    navigate('feedback');
  }
  function setRating(v) { feedbackRating = v; document.querySelectorAll('.star-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.v) <= v)); }
  function submitFeedback() {
    const text = document.getElementById('feedbackText').value.trim();
    if (!feedbackRating || !text) { document.getElementById('feedbackErr').classList.add('show'); return; }
    state.feedbacks.push({ rating: feedbackRating, text, at: new Date().toISOString() });
    saveState(); showToast('Thank you for your feedback!', 'success'); navTo('profile');
  }
  function openHelp() { navigate('help'); }
  function openAbout() { navigate('about'); }
  function confirmResetData() {
    openModal('Reset Data?', 'This will restore default bookings, messages, seats, and profile. Continue?', () => resetDemoData());
  }

  function openModal(title, message, onConfirm) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    modalCallback = onConfirm;
    document.getElementById('modalOverlay').classList.add('show');
    document.getElementById('modalConfirm').onclick = () => { closeModal(); if (modalCallback) modalCallback(); };
  }
  function closeModal() { document.getElementById('modalOverlay').classList.remove('show'); modalCallback = null; }

  function showToast(msg, type) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show' + (type === 'error' ? ' error' : type === 'success' ? ' success' : '');
    setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ========== STAFF SEAT MAP & PASSENGER MANIFEST ========== */
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function getBusCapacity(busId) {
    const sched = state.schedules.find(s => s.id === busId);
    return (sched && sched.capacity) ? sched.capacity : 32;
  }

  function getStaffBookings() {
    if (!currentDriver) return [];
    const busId = currentDriver.bus;
    // Active trip bookings for this bus (upcoming + cancelled for visibility; completed filtered out of active counts)
    return state.bookings.filter(b => b.bus === busId);
  }

  function getActiveStaffBookings() {
    return getStaffBookings().filter(b => b.status === 'upcoming');
  }

  function seatToBookingMap(busId) {
    const map = {};
    getStaffBookings().forEach(b => {
      if (b.status === 'cancelled') return;
      const seats = (b.seat || '').split(',').map(s => s.trim()).filter(Boolean);
      seats.forEach(seat => { map[seat] = b; });
    });
    return map;
  }

  function refreshStaffDashboard() {
    if (!currentDriver) return;
    const busId = currentDriver.bus;
    const sched = state.schedules.find(s => s.id === busId);
    const titleEl = document.getElementById('staffBusTitle');
    const routeEl = document.getElementById('staffBusRoute');
    if (titleEl) titleEl.textContent = busId;
    if (routeEl) {
      routeEl.textContent = sched
        ? (sched.origin + ' → ' + sched.dest + ' · ' + sched.dep)
        : 'Assigned route';
    }
    updateStaffStats();
    renderStaffSeatMap();
    renderPassengerManifest();
  }

  function updateStaffStats() {
    if (!currentDriver) return;
    const busId = currentDriver.bus;
    const capacity = getBusCapacity(busId);
    const active = getActiveStaffBookings();
    const all = getStaffBookings();
    const booked = active.length;
    const boarded = active.filter(b => b.boarded).length;
    const notBoarded = active.filter(b => !b.boarded).length;
    const cancelled = all.filter(b => b.status === 'cancelled').length;
    const available = Math.max(0, capacity - booked);

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('statCapacity', capacity);
    set('statBooked', booked);
    set('statAvailable', available);
    set('statBoarded', boarded);
    set('statNotBoarded', notBoarded);
    set('statCancelled', cancelled);

    // Sync trip summary counts if present
    const boardedEl = document.getElementById('boardedCount');
    const seatsLeftEl = document.getElementById('seatsLeftCount');
    if (boardedEl) boardedEl.textContent = boarded;
    if (seatsLeftEl) seatsLeftEl.textContent = available;
  }

  function renderStaffSeatMap() {
    const grid = document.getElementById('staffSeatGrid');
    if (!grid || !currentDriver) return;
    const busId = currentDriver.bus;
    const capacity = getBusCapacity(busId);
    const rows = Math.ceil(capacity / 4);
    const seatMap = seatToBookingMap(busId);
    // Blocked seats: in occupied list but no active booking (legacy demo data)
    const occupiedList = new Set(state.occupied[busId] || []);

    let html = '';
    for (let r = 1; r <= rows; r++) {
      html += '<div class="seat-row">';
      ['A', 'B'].forEach(col => {
        const id = r + col;
        html += staffSeatHtml(id, seatMap, occupiedList);
      });
      html += '<div class="seat aisle"></div>';
      ['C', 'D'].forEach(col => {
        const id = r + col;
        html += staffSeatHtml(id, seatMap, occupiedList);
      });
      html += '</div>';
    }
    grid.innerHTML = html;
  }

  function staffSeatHtml(id, seatMap, occupiedList) {
    const booking = seatMap[id];
    let cls = 'staff-available';
    let onclick = '';
    if (booking) {
      cls = booking.boarded ? 'staff-boarded' : 'staff-booked';
      onclick = `onclick="selectStaffSeat('${id}')"`;
    } else if (occupiedList.has(id)) {
      // Occupied in demo data without a matching active booking → treat as booked placeholder (blocked visual)
      cls = 'staff-blocked';
    }
    if (selectedStaffSeat === id) cls += ' staff-highlight';
    return `<div class="seat ${cls}" data-seat="${id}" ${onclick}>${id}</div>`;
  }

  function selectStaffSeat(seatId) {
    if (!currentDriver) return;
    const busId = currentDriver.bus;
    const seatMap = seatToBookingMap(busId);
    const booking = seatMap[seatId];
    selectedStaffSeat = seatId;
    selectedManifestId = booking ? booking.id : null;
    renderStaffSeatMap();
    renderPassengerManifest();
    showStaffSeatDetail(booking, seatId);
  }

  function showStaffSeatDetail(booking, seatId) {
    const panel = document.getElementById('staffSeatDetail');
    if (!panel) return;
    if (!booking) {
      panel.classList.remove('show');
      return;
    }
    panel.classList.add('show');
    document.getElementById('staffDetailTitle').textContent = 'Seat ' + seatId;
    document.getElementById('sdName').textContent = booking.passenger || '—';
    document.getElementById('sdRef').textContent = booking.ref || '—';
    document.getElementById('sdSeat').textContent = booking.seat || seatId;
    document.getElementById('sdPickup').textContent = booking.pickup || booking.origin || '—';
    document.getElementById('sdDropoff').textContent = booking.dropoff || booking.dest || '—';
    document.getElementById('sdStatus').textContent = booking.status === 'upcoming' ? 'Confirmed' : (booking.status || '—');
    document.getElementById('sdBoarding').textContent = booking.boarded ? 'Boarded' : 'Not Yet Boarded';
  }

  function clearStaffSeatSelection() {
    selectedStaffSeat = null;
    selectedManifestId = null;
    const panel = document.getElementById('staffSeatDetail');
    if (panel) panel.classList.remove('show');
    renderStaffSeatMap();
    renderPassengerManifest();
  }

  function renderPassengerManifest() {
    const el = document.getElementById('passengerManifest');
    if (!el || !currentDriver) return;
    let list = getStaffBookings();

    // Filter by boarding / status
    if (manifestFilter === 'boarded') list = list.filter(b => b.status === 'upcoming' && b.boarded);
    else if (manifestFilter === 'not-boarded') list = list.filter(b => b.status === 'upcoming' && !b.boarded);
    else if (manifestFilter === 'cancelled') list = list.filter(b => b.status === 'cancelled');
    else list = list.filter(b => b.status === 'upcoming' || b.status === 'cancelled');

    // Search
    if (manifestQuery) {
      const q = manifestQuery.toLowerCase();
      list = list.filter(b =>
        (b.passenger || '').toLowerCase().includes(q) ||
        (b.ref || '').toLowerCase().includes(q) ||
        (b.seat || '').toLowerCase().includes(q)
      );
    }

    // Sort: not boarded first, then boarded, then cancelled
    list.sort((a, b) => {
      if (a.status === 'cancelled' && b.status !== 'cancelled') return 1;
      if (b.status === 'cancelled' && a.status !== 'cancelled') return -1;
      if (a.boarded !== b.boarded) return a.boarded ? 1 : -1;
      return (a.seat || '').localeCompare(b.seat || '');
    });

    if (list.length === 0) {
      el.innerHTML = `<div class="empty-state" style="padding:24px 12px">
        <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <p>No passengers match this filter</p>
      </div>`;
      return;
    }

    el.innerHTML = list.map(b => {
      const isSelected = selectedManifestId === b.id;
      const boardingBadge = b.status === 'cancelled'
        ? '<span class="pax-badge cancelled">Cancelled</span>'
        : (b.boarded
          ? '<span class="pax-badge boarded">Boarded</span>'
          : '<span class="pax-badge not-boarded">Not Boarded</span>');
      const statusBadge = b.status === 'upcoming'
        ? '<span class="pax-badge confirmed">Confirmed</span>'
        : (b.status === 'cancelled' ? '' : '<span class="pax-badge confirmed">' + escapeHtml(b.status) + '</span>');
      return `<div class="pax-card ${isSelected ? 'selected' : ''}" onclick="selectManifestPassenger('${b.id}')">
        <div class="pax-card-top">
          <div class="pax-name">${escapeHtml(b.passenger || 'Passenger')}</div>
          <div class="pax-seat-badge">${escapeHtml(b.seat || '—')}</div>
        </div>
        <div class="pax-meta">
          Ref: <strong>${escapeHtml(b.ref || '—')}</strong><br>
          Pickup: <strong>${escapeHtml(b.pickup || b.origin || '—')}</strong><br>
          Drop-off: <strong>${escapeHtml(b.dropoff || b.dest || '—')}</strong>
        </div>
        <div class="pax-badges">${statusBadge}${boardingBadge}</div>
      </div>`;
    }).join('');
  }

  function selectManifestPassenger(bookingId) {
    const b = state.bookings.find(x => x.id === bookingId);
    if (!b) return;
    selectedManifestId = bookingId;
    // Highlight first seat of multi-seat bookings
    const firstSeat = (b.seat || '').split(',')[0].trim();
    selectedStaffSeat = firstSeat || null;
    renderStaffSeatMap();
    renderPassengerManifest();
    if (b.status !== 'cancelled') showStaffSeatDetail(b, firstSeat);
    else {
      const panel = document.getElementById('staffSeatDetail');
      if (panel) panel.classList.remove('show');
    }
  }

  function filterManifest(btn, filter) {
    document.querySelectorAll('[data-mfilter]').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    manifestFilter = filter;
    renderPassengerManifest();
  }

  function onManifestSearch() {
    const el = document.getElementById('manifestSearch');
    manifestQuery = el ? el.value.trim() : '';
    renderPassengerManifest();
  }

  async function init() {
    loadState();
    state.bookings.forEach(b => {
      if (!b.pickup) b.pickup = b.origin || 'Cubao Terminal';
      if (!b.dropoff) b.dropoff = b.dest || '—';
    });
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const dateEl = document.getElementById('travelDate');
    if (dateEl) dateEl.value = tomorrow.toISOString().split('T')[0];
    ['originSelect', 'destSelect', 'travelDate', 'passengerCount'].forEach(id => {
      const el = document.getElementById(id); if (el) el.addEventListener('change', updateRoutePreview);
    });
    // Try connect to backend API
    await checkApi();
    if (apiOnline) {
      await syncFromApi();
      showToast('Connected', 'success');
    }
    setApiBadge(apiOnline);
    updateRoutePreview(); updateProfileUI(); updateNotifBadge(); updateGreeting();
    renderSchedule(); renderMessages(); renderBookings(); renderHomeSchedule();
    // Init OSM maps when passenger reaches home (also on nav)
    setTimeout(function () {
      if (document.getElementById('home') && document.getElementById('home').classList.contains('active')) {
        initHomeMap();
      }
    }, 400);
  }
  init();
