/**
 * Bus Tracker Prototype – REST API (zero dependencies)
 * Capstone backend: schedules, bookings, seats, staff login, ticket validation
 *
 * Run:  node server.js
 * Base: http://localhost:3000/api
 */
const http = require('http');
const { load, save, reset } = require('./db');

const PORT = process.env.PORT || 3000;

/* ───────────────────────────── helpers ───────────────────────────── */

function genRef() {
  const d = new Date();
  const date = d.toISOString().slice(0, 10).replace(/-/g, '');
  const n = Math.floor(1000 + Math.random() * 9000);
  return `GT-${date}-${n}`;
}

function genId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function parseSeats(seatStr) {
  return String(seatStr || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatFare(n) {
  return typeof n === 'number' ? `₱${n}` : n;
}

function bookingView(b) {
  return {
    ...b,
    fare: typeof b.fare === 'number' ? `₱${b.fare}` : b.fare,
    boarded: !!b.boarded
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        req.destroy();
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function parseUrl(req) {
  const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const parts = u.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  const query = {};
  u.searchParams.forEach((v, k) => {
    query[k] = v;
  });
  return { parts, query, path: u.pathname };
}

/* ───────────────────────────── router ───────────────────────────── */

async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  const { parts, query } = parseUrl(req);
  const method = req.method;
  console.log(`${new Date().toISOString()} ${method} /${parts.join('/')}`);

  try {
    // GET /api/health
    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'health' && parts.length === 2) {
      return send(res, 200, {
        ok: true,
        service: 'Bus Tracker API',
        version: '1.0.0',
        time: new Date().toISOString()
      });
    }

    // POST /api/reset
    if (method === 'POST' && parts[0] === 'api' && parts[1] === 'reset' && parts.length === 2) {
      reset();
      return send(res, 200, { ok: true, message: 'Database reset to demo seed data' });
    }

    // GET /api/schedules
    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'schedules' && parts.length === 2) {
      const db = load();
      let list = db.schedules.map((s) => ({ ...s, fare: formatFare(s.fare) }));
      if (query.filter && query.filter !== 'all') list = list.filter((s) => s.filter === query.filter);
      if (query.origin) list = list.filter((s) => s.origin.toLowerCase().includes(query.origin.toLowerCase()));
      if (query.dest) list = list.filter((s) => s.dest.toLowerCase().includes(query.dest.toLowerCase()));
      if (query.q) {
        const q = query.q.toLowerCase();
        list = list.filter(
          (s) =>
            s.id.toLowerCase().includes(q) ||
            s.origin.toLowerCase().includes(q) ||
            s.dest.toLowerCase().includes(q)
        );
      }
      return send(res, 200, { ok: true, data: list });
    }

    // GET /api/schedules/:id
    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'schedules' && parts.length === 3) {
      const db = load();
      const s = db.schedules.find((x) => x.id === parts[2]);
      if (!s) return send(res, 404, { ok: false, error: 'Schedule not found' });
      return send(res, 200, {
        ok: true,
        data: {
          ...s,
          fare: formatFare(s.fare),
          occupied: db.occupied[s.id] || [],
          stops: db.routeStops[s.id] || [
            { name: s.origin + ' Terminal', time: s.dep, status: 'upcoming' },
            { name: s.dest, time: s.arr, status: 'upcoming' }
          ]
        }
      });
    }

    // GET /api/buses/nearby
    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'buses' && parts[2] === 'nearby') {
      const db = load();
      return send(res, 200, {
        ok: true,
        data: db.nearby.map((b) => ({ ...b, fare: formatFare(b.fare) }))
      });
    }

    // GET /api/buses/:busId/seats
    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'buses' && parts[3] === 'seats' && parts.length === 4) {
      const db = load();
      const busId = parts[2];
      const schedule = db.schedules.find((s) => s.id === busId);
      if (!schedule) return send(res, 404, { ok: false, error: 'Bus not found' });
      const occupied = new Set(db.occupied[busId] || []);
      const capacity = schedule.capacity || 40;
      const rows = Math.ceil(capacity / 4);
      const seats = [];
      for (let r = 1; r <= rows; r++) {
        for (const col of ['A', 'B', 'C', 'D']) {
          const id = `${r}${col}`;
          seats.push({ id, available: !occupied.has(id) });
        }
      }
      return send(res, 200, {
        ok: true,
        data: {
          busId,
          capacity,
          occupied: [...occupied],
          availableCount: seats.filter((s) => s.available).length,
          seats
        }
      });
    }

    // GET /api/bookings
    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'bookings' && parts.length === 2) {
      const db = load();
      let list = db.bookings.map(bookingView);
      if (query.status) list = list.filter((b) => b.status === query.status);
      if (query.bus) list = list.filter((b) => b.bus === query.bus);
      if (query.passenger) {
        const p = query.passenger.toLowerCase();
        list = list.filter((b) => (b.passenger || '').toLowerCase().includes(p));
      }
      return send(res, 200, { ok: true, data: list });
    }

    // GET /api/bookings/:id
    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'bookings' && parts.length === 3) {
      const db = load();
      const b = db.bookings.find((x) => x.id === parts[2] || x.ref === parts[2]);
      if (!b) return send(res, 404, { ok: false, error: 'Booking not found' });
      return send(res, 200, { ok: true, data: bookingView(b) });
    }

    // POST /api/bookings
    if (method === 'POST' && parts[0] === 'api' && parts[1] === 'bookings' && parts.length === 2) {
      const body = await readBody(req);
      const { bus, seats, passenger, phone, email, date, payment } = body;
      if (!bus || !seats || !passenger) {
        return send(res, 400, { ok: false, error: 'Required fields: bus, seats, passenger' });
      }
      const db = load();
      const schedule = db.schedules.find((s) => s.id === bus);
      if (!schedule) return send(res, 404, { ok: false, error: 'Bus/schedule not found' });
      const seatList = Array.isArray(seats) ? seats : parseSeats(seats);
      if (!seatList.length) return send(res, 400, { ok: false, error: 'At least one seat is required' });
      if (!db.occupied[bus]) db.occupied[bus] = [];
      const taken = seatList.filter((s) => db.occupied[bus].includes(s));
      if (taken.length) {
        return send(res, 409, { ok: false, error: `Seat(s) already occupied: ${taken.join(', ')}` });
      }
      const fareNum =
        typeof schedule.fare === 'number'
          ? schedule.fare
          : Number(String(schedule.fare).replace(/[^\d]/g, '')) || 0;
      const total = fareNum * seatList.length;
      const ref = genRef();
      const dateStr =
        date ||
        new Date(Date.now() + 86400000).toLocaleDateString('en-PH', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      const booking = {
        id: genId('BK'),
        ref,
        bus,
        origin: schedule.origin,
        dest: schedule.dest,
        pickup: `${schedule.origin}${schedule.origin.toLowerCase().includes('terminal') ? '' : ' Terminal'}`,
        dropoff: schedule.dest,
        date: dateStr,
        dep: schedule.dep,
        seat: seatList.join(', '),
        status: 'upcoming',
        fare: total,
        passenger: String(passenger).trim(),
        phone: phone || '',
        email: email || '',
        payment: payment || 'GCash',
        boarded: false,
        createdAt: new Date().toISOString()
      };
      seatList.forEach((s) => {
        if (!db.occupied[bus].includes(s)) db.occupied[bus].push(s);
      });
      schedule.seats = Math.max(0, (schedule.seats || schedule.capacity) - seatList.length);
      db.bookings.unshift(booking);
      db.messages.unshift({
        id: Date.now(),
        icon: 'green',
        title: 'Reservation Confirmed',
        preview: `Your reservation ${ref} for ${bus} is confirmed.`,
        time: 'Just now',
        unread: true
      });
      save(db);
      return send(res, 201, { ok: true, data: bookingView(booking) });
    }

    // POST /api/bookings/:id/cancel
    if (
      method === 'POST' &&
      parts[0] === 'api' &&
      parts[1] === 'bookings' &&
      parts[3] === 'cancel' &&
      parts.length === 4
    ) {
      const db = load();
      const b = db.bookings.find((x) => x.id === parts[2] || x.ref === parts[2]);
      if (!b) return send(res, 404, { ok: false, error: 'Booking not found' });
      if (b.status !== 'upcoming') {
        return send(res, 400, { ok: false, error: `Cannot cancel booking with status: ${b.status}` });
      }
      b.status = 'cancelled';
      b.boarded = false;
      const seats = parseSeats(b.seat);
      if (!db.occupied[b.bus]) db.occupied[b.bus] = [];
      seats.forEach((s) => {
        const i = db.occupied[b.bus].indexOf(s);
        if (i >= 0) db.occupied[b.bus].splice(i, 1);
      });
      const schedule = db.schedules.find((s) => s.id === b.bus);
      if (schedule) {
        schedule.seats = Math.min(schedule.capacity || 40, (schedule.seats || 0) + seats.length);
      }
      save(db);
      return send(res, 200, {
        ok: true,
        data: bookingView(b),
        message: 'Booking cancelled; seats released'
      });
    }

    // POST /api/staff/login
    if (method === 'POST' && parts[0] === 'api' && parts[1] === 'staff' && parts[2] === 'login') {
      const body = await readBody(req);
      const { id, password } = body;
      if (!id || !password) {
        return send(res, 400, { ok: false, error: 'Staff ID and password required' });
      }
      const db = load();
      const staff = db.staff.find(
        (s) => s.id.toUpperCase() === String(id).toUpperCase() && s.password === password
      );
      if (!staff) return send(res, 401, { ok: false, error: 'Invalid staff ID or password' });
      const { password: _pw, ...safe } = staff;
      const schedule = db.schedules.find((s) => s.id === staff.bus);
      return send(res, 200, {
        ok: true,
        data: {
          ...safe,
          route: schedule ? `${schedule.origin} → ${schedule.dest}` : null,
          dep: schedule ? schedule.dep : null
        }
      });
    }

    // GET /api/staff/bus/:busId/dashboard
    if (
      method === 'GET' &&
      parts[0] === 'api' &&
      parts[1] === 'staff' &&
      parts[2] === 'bus' &&
      parts[4] === 'dashboard'
    ) {
      const db = load();
      const busId = parts[3];
      const schedule = db.schedules.find((s) => s.id === busId);
      if (!schedule) return send(res, 404, { ok: false, error: 'Bus not found' });
      const all = db.bookings.filter((b) => b.bus === busId);
      const active = all.filter((b) => b.status === 'upcoming');
      const boarded = active.filter((b) => b.boarded);
      const notBoarded = active.filter((b) => !b.boarded);
      const cancelled = all.filter((b) => b.status === 'cancelled');
      const capacity = schedule.capacity || 40;
      const seatMap = {};
      active.forEach((b) => {
        parseSeats(b.seat).forEach((seat) => {
          seatMap[seat] = {
            bookingId: b.id,
            ref: b.ref,
            passenger: b.passenger,
            boarded: !!b.boarded,
            pickup: b.pickup || b.origin,
            dropoff: b.dropoff || b.dest,
            status: b.status
          };
        });
      });
      const occupiedList = db.occupied[busId] || [];
      const rows = Math.ceil(capacity / 4);
      const seats = [];
      for (let r = 1; r <= rows; r++) {
        for (const col of ['A', 'B', 'C', 'D']) {
          const id = `${r}${col}`;
          const info = seatMap[id];
          let state = 'available';
          if (info) state = info.boarded ? 'boarded' : 'booked';
          else if (occupiedList.includes(id)) state = 'blocked';
          seats.push({ id, state, booking: info || null });
        }
      }
      return send(res, 200, {
        ok: true,
        data: {
          bus: busId,
          route: `${schedule.origin} → ${schedule.dest}`,
          dep: schedule.dep,
          arr: schedule.arr,
          capacity,
          stats: {
            capacity,
            booked: active.length,
            available: Math.max(0, capacity - active.length),
            boarded: boarded.length,
            notBoarded: notBoarded.length,
            cancelled: cancelled.length
          },
          seats,
          trip: db.trips[busId] || { status: 'idle', startedAt: null },
          stops: db.routeStops[busId] || []
        }
      });
    }

    // GET /api/staff/bus/:busId/manifest
    if (
      method === 'GET' &&
      parts[0] === 'api' &&
      parts[1] === 'staff' &&
      parts[2] === 'bus' &&
      parts[4] === 'manifest'
    ) {
      const db = load();
      const busId = parts[3];
      let list = db.bookings.filter((b) => b.bus === busId);
      if (query.status === 'upcoming' || query.status === 'cancelled' || query.status === 'completed') {
        list = list.filter((b) => b.status === query.status);
      } else {
        list = list.filter((b) => b.status === 'upcoming' || b.status === 'cancelled');
      }
      if (query.boarding === 'boarded') list = list.filter((b) => b.status === 'upcoming' && b.boarded);
      if (query.boarding === 'not-boarded') list = list.filter((b) => b.status === 'upcoming' && !b.boarded);
      if (query.boarding === 'cancelled') list = list.filter((b) => b.status === 'cancelled');
      if (query.q) {
        const q = query.q.toLowerCase();
        list = list.filter(
          (b) =>
            (b.passenger || '').toLowerCase().includes(q) ||
            (b.ref || '').toLowerCase().includes(q) ||
            (b.seat || '').toLowerCase().includes(q)
        );
      }
      list.sort((a, b) => {
        if (a.status === 'cancelled' && b.status !== 'cancelled') return 1;
        if (b.status === 'cancelled' && a.status !== 'cancelled') return -1;
        if (!!a.boarded !== !!b.boarded) return a.boarded ? 1 : -1;
        return String(a.seat || '').localeCompare(String(b.seat || ''));
      });
      return send(res, 200, {
        ok: true,
        data: list.map((b) => ({
          id: b.id,
          ref: b.ref,
          passenger: b.passenger,
          seat: b.seat,
          pickup: b.pickup || b.origin,
          dropoff: b.dropoff || b.dest,
          bookingStatus: b.status === 'upcoming' ? 'Confirmed' : b.status,
          boardingStatus:
            b.status === 'cancelled' ? 'Cancelled' : b.boarded ? 'Boarded' : 'Not Yet Boarded',
          boarded: !!b.boarded,
          status: b.status,
          phone: b.phone || ''
        }))
      });
    }

    // POST /api/staff/validate-ticket
    if (method === 'POST' && parts[0] === 'api' && parts[1] === 'staff' && parts[2] === 'validate-ticket') {
      const body = await readBody(req);
      const { ref, bus } = body;
      if (!ref && !bus) {
        return send(res, 400, { ok: false, error: 'Provide ticket ref and/or bus id' });
      }
      const db = load();
      let booking = null;
      if (ref) {
        booking = db.bookings.find((b) => b.ref.toUpperCase() === String(ref).toUpperCase());
      } else if (bus) {
        booking = db.bookings.find((b) => b.bus === bus && b.status === 'upcoming' && !b.boarded);
      }
      if (!booking) {
        return send(res, 404, { ok: false, error: 'Ticket not found', code: 'NOT_FOUND' });
      }
      if (bus && booking.bus !== bus) {
        return send(res, 400, {
          ok: false,
          error: `Ticket is for bus ${booking.bus}, not ${bus}`,
          code: 'WRONG_BUS'
        });
      }
      if (booking.status === 'cancelled') {
        return send(res, 400, { ok: false, error: 'This booking was cancelled', code: 'CANCELLED' });
      }
      if (booking.status === 'completed') {
        return send(res, 400, { ok: false, error: 'Trip already completed', code: 'COMPLETED' });
      }
      if (booking.boarded) {
        return send(res, 409, {
          ok: false,
          error: 'Ticket already used (already boarded)',
          code: 'ALREADY_BOARDED',
          data: bookingView(booking)
        });
      }
      booking.boarded = true;
      booking.boardedAt = new Date().toISOString();
      save(db);
      return send(res, 200, {
        ok: true,
        message: 'Ticket valid — passenger boarded',
        data: bookingView(booking)
      });
    }

    // POST /api/staff/bus/:busId/trip
    if (
      method === 'POST' &&
      parts[0] === 'api' &&
      parts[1] === 'staff' &&
      parts[2] === 'bus' &&
      parts[4] === 'trip'
    ) {
      const body = await readBody(req);
      const busId = parts[3];
      const { action } = body;
      const allowed = ['start', 'pause', 'resume', 'end'];
      if (!allowed.includes(action)) {
        return send(res, 400, {
          ok: false,
          error: `action must be one of: ${allowed.join(', ')}`
        });
      }
      const db = load();
      if (!db.trips[busId]) db.trips[busId] = { status: 'idle', startedAt: null };
      const trip = db.trips[busId];
      if (action === 'start') {
        if (trip.status === 'active') {
          return send(res, 400, { ok: false, error: 'Trip already active' });
        }
        trip.status = 'active';
        trip.startedAt = new Date().toISOString();
      } else if (action === 'pause') {
        if (trip.status !== 'active') {
          return send(res, 400, { ok: false, error: 'Trip is not active' });
        }
        trip.status = 'paused';
      } else if (action === 'resume') {
        if (trip.status !== 'paused') {
          return send(res, 400, { ok: false, error: 'Trip is not paused' });
        }
        trip.status = 'active';
      } else if (action === 'end') {
        trip.status = 'ended';
        trip.endedAt = new Date().toISOString();
        db.bookings.forEach((b) => {
          if (b.bus === busId && b.status === 'upcoming') b.status = 'completed';
        });
      }
      save(db);
      return send(res, 200, { ok: true, data: trip });
    }

    // POST /api/staff/quick-reply
    if (method === 'POST' && parts[0] === 'api' && parts[1] === 'staff' && parts[2] === 'quick-reply') {
      const body = await readBody(req);
      const { message, bus } = body;
      if (!message) return send(res, 400, { ok: false, error: 'message required' });
      const db = load();
      db.messages.unshift({
        id: Date.now(),
        icon: 'blue',
        title: 'Staff Update' + (bus ? ` (${bus})` : ''),
        preview: String(message),
        time: 'Just now',
        unread: true
      });
      save(db);
      return send(res, 200, { ok: true, message: 'Quick reply sent (demo notification)' });
    }

    // GET /api/messages
    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'messages' && parts.length === 2) {
      const db = load();
      return send(res, 200, { ok: true, data: db.messages });
    }

    // POST /api/messages/read-all
    if (method === 'POST' && parts[0] === 'api' && parts[1] === 'messages' && parts[2] === 'read-all') {
      const db = load();
      db.messages.forEach((m) => {
        m.unread = false;
      });
      save(db);
      return send(res, 200, { ok: true, data: db.messages });
    }

    // GET /api/profile
    if (method === 'GET' && parts[0] === 'api' && parts[1] === 'profile' && parts.length === 2) {
      const db = load();
      return send(res, 200, { ok: true, data: db.profile });
    }

    // PUT /api/profile
    if (method === 'PUT' && parts[0] === 'api' && parts[1] === 'profile' && parts.length === 2) {
      const body = await readBody(req);
      const db = load();
      if (body.name !== undefined) db.profile.name = body.name;
      if (body.email !== undefined) db.profile.email = body.email;
      if (body.phone !== undefined) db.profile.phone = body.phone;
      if (body.prefs && typeof body.prefs === 'object') {
        db.profile.prefs = { ...db.profile.prefs, ...body.prefs };
      }
      save(db);
      return send(res, 200, { ok: true, data: db.profile });
    }

    return send(res, 404, { ok: false, error: `Route not found: ${method} /${parts.join('/')}` });
  } catch (err) {
    console.error(err);
    return send(res, 500, { ok: false, error: err.message || 'Internal server error' });
  }
}

const server = http.createServer(handler);
server.listen(PORT, () => {
  console.log('');
  console.log('  Bus Tracker API running (zero-dependency)');
  console.log(`  → http://localhost:${PORT}/api/health`);
  console.log('  Staff: GT-0042 / driver123  (GN-204)');
  console.log('        GT-0108 / conductor123  (GN-112)');
  console.log('');
});
