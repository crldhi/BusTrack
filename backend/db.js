/**
 * Simple JSON file database for Bus Tracker API
 * Persists to data/db.json — suitable for capstone demo (no native SQLite required)
 */
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

const DEFAULT_DB = {
  staff: [
    { id: 'GT-0042', password: 'driver123', name: 'Juan Dela Cruz', role: 'Driver', bus: 'GN-204' },
    { id: 'GT-0108', password: 'conductor123', name: 'Maria Santos', role: 'Conductor', bus: 'GN-112' }
  ],
  schedules: [
    { id: 'GN-204', origin: 'Cubao', dest: 'Baguio City', dep: '2:00 PM', arr: '6:45 PM', fare: 695, seats: 30, status: 'On Route', filter: 'baguio', capacity: 40 },
    { id: 'GN-112', origin: 'Cubao', dest: 'Mariveles, Bataan', dep: '3:00 PM', arr: '6:30 PM', fare: 416, seats: 36, status: 'Scheduled', filter: 'bataan', capacity: 40 },
    { id: 'GN-308', origin: 'Cubao', dest: 'Clark Airport', dep: '3:30 PM', arr: '5:15 PM', fare: 310, seats: 22, status: 'Scheduled', filter: 'clark', capacity: 40 },
    { id: 'GN-221', origin: 'Cubao', dest: 'Baguio City', dep: '4:00 PM', arr: '8:45 PM', fare: 695, seats: 5, status: 'Scheduled', filter: 'baguio', capacity: 32 },
    { id: 'GN-045', origin: 'Cubao', dest: 'Baler, Aurora', dep: '4:30 PM', arr: '9:00 PM', fare: 520, seats: 18, status: 'Scheduled', filter: 'baler', capacity: 36 },
    { id: 'GN-178', origin: 'Cubao', dest: 'Balanga, Bataan', dep: '5:00 PM', arr: '7:30 PM', fare: 306, seats: 11, status: 'Scheduled', filter: 'bataan', capacity: 32 },
    { id: 'GN-092', origin: 'Pasay', dest: 'Mariveles, Bataan', dep: '5:30 PM', arr: '8:45 PM', fare: 416, seats: 9, status: 'Scheduled', filter: 'bataan', capacity: 32 },
    { id: 'GN-340', origin: 'Cubao', dest: 'Clark Airport', dep: '6:00 PM', arr: '7:45 PM', fare: 310, seats: 25, status: 'Scheduled', filter: 'clark', capacity: 40 }
  ],
  nearby: [
    { id: 'GN-204', route: 'Cubao → Baguio City', eta: '12 min', seats: 8, fare: 695, status: 'On route' },
    { id: 'GN-156', route: 'Cubao → Balanga, Bataan', eta: '8 min', seats: 15, fare: 306, status: 'On route' },
    { id: 'GN-089', route: 'Cubao → Clark Airport', eta: '18 min', seats: 22, fare: 310, status: 'Approaching' }
  ],
  bookings: [
    {
      id: 'BK-001', ref: 'GT-20261005-3192', bus: 'GN-112', origin: 'Cubao', dest: 'Mariveles, Bataan',
      pickup: 'Cubao Terminal', dropoff: 'Mariveles Terminal', date: 'Oct 7, 2026', dep: '3:00 PM',
      seat: '12A', status: 'upcoming', fare: 416, passenger: 'Juan Dela Cruz', phone: '09171234567', boarded: false
    },
    {
      id: 'BK-003', ref: 'GT-20261009-1001', bus: 'GN-204', origin: 'Cubao', dest: 'Baguio City',
      pickup: 'Cubao Terminal Gate 2', dropoff: 'Baguio City Terminal', date: 'Oct 9, 2026', dep: '2:00 PM',
      seat: '1A', status: 'upcoming', fare: 695, passenger: 'Ana Reyes', phone: '09181234501', boarded: false
    },
    {
      id: 'BK-004', ref: 'GT-20261009-1002', bus: 'GN-204', origin: 'Cubao', dest: 'Baguio City',
      pickup: 'Cubao Terminal Gate 2', dropoff: 'Baguio City Terminal', date: 'Oct 9, 2026', dep: '2:00 PM',
      seat: '1B', status: 'upcoming', fare: 695, passenger: 'Carlos Mendoza', phone: '09181234502', boarded: true
    },
    {
      id: 'BK-005', ref: 'GT-20261009-1003', bus: 'GN-204', origin: 'Cubao', dest: 'Baguio City',
      pickup: 'Balintawak Stop', dropoff: 'Tarlac Terminal', date: 'Oct 9, 2026', dep: '2:00 PM',
      seat: '3C', status: 'upcoming', fare: 695, passenger: 'Maria Santos', phone: '09181234503', boarded: false
    },
    {
      id: 'BK-006', ref: 'GT-20261009-1004', bus: 'GN-204', origin: 'Cubao', dest: 'Baguio City',
      pickup: 'Cubao Terminal Gate 3', dropoff: 'Baguio City Terminal', date: 'Oct 9, 2026', dep: '2:00 PM',
      seat: '4A', status: 'upcoming', fare: 695, passenger: 'Pedro Garcia', phone: '09181234504', boarded: false
    },
    {
      id: 'BK-007', ref: 'GT-20261009-1005', bus: 'GN-204', origin: 'Cubao', dest: 'Baguio City',
      pickup: 'Cubao Terminal', dropoff: 'Baguio City', date: 'Oct 9, 2026', dep: '2:00 PM',
      seat: '5D', status: 'upcoming', fare: 695, passenger: 'Lisa Tan', phone: '09181234505', boarded: true
    },
    {
      id: 'BK-008', ref: 'GT-20261009-1006', bus: 'GN-204', origin: 'Cubao', dest: 'Baguio City',
      pickup: 'Cubao Terminal Gate 1', dropoff: 'Baguio City Terminal', date: 'Oct 9, 2026', dep: '2:00 PM',
      seat: '6B', status: 'upcoming', fare: 695, passenger: 'Jose Ramirez', phone: '09181234506', boarded: false
    },
    {
      id: 'BK-009', ref: 'GT-20261009-1007', bus: 'GN-204', origin: 'Cubao', dest: 'Baguio City',
      pickup: 'Cubao Terminal', dropoff: 'Baguio City', date: 'Oct 9, 2026', dep: '2:00 PM',
      seat: '7A', status: 'upcoming', fare: 695, passenger: 'Sofia Cruz', phone: '09181234507', boarded: false
    },
    {
      id: 'BK-010', ref: 'GT-20261009-1008', bus: 'GN-204', origin: 'Cubao', dest: 'Baguio City',
      pickup: 'NLEX Exit Stop', dropoff: 'Baguio City Terminal', date: 'Oct 9, 2026', dep: '2:00 PM',
      seat: '8C', status: 'upcoming', fare: 695, passenger: 'Miguel Torres', phone: '09181234508', boarded: false
    },
    {
      id: 'BK-011', ref: 'GT-20261009-1009', bus: 'GN-204', origin: 'Cubao', dest: 'Baguio City',
      pickup: 'Cubao Terminal Gate 2', dropoff: 'Baguio City', date: 'Oct 9, 2026', dep: '2:00 PM',
      seat: '9B', status: 'upcoming', fare: 695, passenger: 'Elena Vargas', phone: '09181234509', boarded: false
    },
    {
      id: 'BK-012', ref: 'GT-20261009-1010', bus: 'GN-204', origin: 'Cubao', dest: 'Baguio City',
      pickup: 'Cubao Terminal', dropoff: 'Baguio City Terminal', date: 'Oct 9, 2026', dep: '2:00 PM',
      seat: '10A', status: 'upcoming', fare: 695, passenger: 'Rico Aquino', phone: '09181234510', boarded: false
    },
    {
      id: 'BK-013', ref: 'GT-20261007-2001', bus: 'GN-112', origin: 'Cubao', dest: 'Mariveles, Bataan',
      pickup: 'Cubao Terminal', dropoff: 'Mariveles Terminal', date: 'Oct 7, 2026', dep: '3:00 PM',
      seat: '1A', status: 'upcoming', fare: 416, passenger: 'Grace Lim', phone: '09181234511', boarded: false
    },
    {
      id: 'BK-014', ref: 'GT-20261007-2002', bus: 'GN-112', origin: 'Cubao', dest: 'Mariveles, Bataan',
      pickup: 'Cubao Terminal Gate 4', dropoff: 'Mariveles, Bataan', date: 'Oct 7, 2026', dep: '3:00 PM',
      seat: '2B', status: 'upcoming', fare: 416, passenger: 'Marco Diaz', phone: '09181234512', boarded: true
    },
    {
      id: 'BK-015', ref: 'GT-20261007-2003', bus: 'GN-112', origin: 'Cubao', dest: 'Mariveles, Bataan',
      pickup: 'Cubao Terminal', dropoff: 'Balanga Stop', date: 'Oct 7, 2026', dep: '3:00 PM',
      seat: '5B', status: 'upcoming', fare: 416, passenger: 'Nina Flores', phone: '09181234513', boarded: false
    },
    {
      id: 'BK-002', ref: 'GT-20260928-8841', bus: 'GN-204', origin: 'Cubao', dest: 'Baguio City',
      pickup: 'Cubao Terminal', dropoff: 'Baguio City', date: 'Sep 28, 2026', dep: '2:00 PM',
      seat: '5B', status: 'completed', fare: 695, passenger: 'Juan Dela Cruz', phone: '09171234567', boarded: true
    }
  ],
  occupied: {
    'GN-204': ['1A', '1B', '3C', '4A', '5D', '6B', '7A', '8C', '9B', '10A'],
    'GN-112': ['1A', '2B', '3A', '4C', '5B', '6D', '7C', '8A', '9D', '10B', '11A', '12C'],
    'GN-308': ['1C', '2A', '3B', '4D', '5A'],
    'GN-221': ['1A', '1B', '1C', '1D', '2A', '2B', '2C', '2D', '3A', '3B', '3C', '3D', '4A', '4B', '4C', '4D', '5A', '5B', '5C'],
    'GN-045': ['1A', '2C', '3B', '4A', '5D', '6B'],
    'GN-178': ['1B', '2A', '3C', '4D', '5A', '6C', '7B', '8D', '9A', '10C', '11B'],
    'GN-092': ['1A', '2B', '3C', '4A', '5B', '6C', '7A', '8B', '9C'],
    'GN-340': ['1A', '2B', '3A']
  },
  messages: [
    { id: 1, icon: 'blue', title: 'Bus Approaching', preview: 'Bus GN-204 is now approaching your pickup point.', time: '2 min ago', unread: true },
    { id: 2, icon: 'green', title: 'Reservation Confirmed', preview: 'Your reservation for GN-112 has been confirmed.', time: '1 hour ago', unread: true },
    { id: 3, icon: 'orange', title: 'Route Update', preview: 'Route update: Expect delays due to traffic on NLEX.', time: '3 hours ago', unread: false },
    { id: 4, icon: 'blue', title: 'Departure Reminder', preview: 'Your scheduled trip is departing soon (GN-308).', time: 'Yesterday', unread: false },
    { id: 5, icon: 'green', title: 'Seat Available', preview: 'Additional seats opened for Cubao–Baguio 4:00 PM.', time: 'Yesterday', unread: false }
  ],
  profile: {
    name: 'Juan Dela Cruz',
    email: 'juan.delacruz@email.com',
    phone: '09171234567',
    prefs: { arrival: true, booking: true, delay: true, promo: false }
  },
  trips: {
    'GN-204': { status: 'idle', startedAt: null },
    'GN-112': { status: 'idle', startedAt: null }
  },
  routeStops: {
    'GN-204': [
      { name: 'Cubao Terminal', time: '2:00 PM', status: 'passed' },
      { name: 'Balintawak', time: '2:25 PM', status: 'passed' },
      { name: 'NLEX Toll', time: '2:45 PM', status: 'current' },
      { name: 'SCTEX Exit', time: '4:00 PM', status: 'upcoming' },
      { name: 'Tarlac', time: '4:40 PM', status: 'upcoming' },
      { name: 'Baguio City', time: '6:45 PM', status: 'upcoming' }
    ]
  }
};

function ensureDataDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function load() {
  ensureDataDir();
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2));
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (e) {
    console.warn('DB corrupt, reseeding:', e.message);
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2));
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
}

function save(db) {
  ensureDataDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function reset() {
  ensureDataDir();
  const data = JSON.parse(JSON.stringify(DEFAULT_DB));
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  return data;
}

module.exports = { load, save, reset, DEFAULT_DB, DB_PATH };
