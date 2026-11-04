# Bus Tracker API

Backend REST API for the **Bus Tracker Prototype** capstone project  
*(Tap In, Track On: Real-Time GPS-Based Bus Tracking)*.

## Stack

- **Node.js** + **Express**
- **JSON file database** (`data/db.json`) — no SQLite install required
- **CORS** enabled for local frontend

## Quick start

```bash
cd backend
npm install
npm start
```

Server: **http://localhost:3000**

Health check: [http://localhost:3000/api/health](http://localhost:3000/api/health)

## Demo staff credentials

| Staff ID   | Password       | Role       | Bus    |
|-----------|----------------|------------|--------|
| `GT-0042` | `driver123`    | Driver     | GN-204 |
| `GT-0108` | `conductor123` | Conductor  | GN-112 |

## API endpoints

### General

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/reset` | Reset DB to seed data |

### Schedules & buses

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/schedules` | List schedules (`?filter=baguio&q=cubao`) |
| GET | `/api/schedules/:id` | Schedule detail + stops + occupied seats |
| GET | `/api/buses/nearby` | Nearby buses (home screen) |
| GET | `/api/buses/:busId/seats` | Seat availability map |

### Bookings (passenger)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/bookings` | List bookings (`?status=upcoming&bus=GN-204`) |
| GET | `/api/bookings/:id` | Booking by id or ref |
| POST | `/api/bookings` | Create booking |
| POST | `/api/bookings/:id/cancel` | Cancel booking & release seats |

**Create booking body:**
```json
{
  "bus": "GN-204",
  "seats": ["11A", "11B"],
  "passenger": "Juan Dela Cruz",
  "phone": "09171234567",
  "email": "juan@email.com",
  "date": "Oct 15, 2026",
  "payment": "GCash"
}
```

### Staff

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/staff/login` | Staff login |
| GET | `/api/staff/bus/:busId/dashboard` | Seat map + stats + trip status |
| GET | `/api/staff/bus/:busId/manifest` | Passenger list (`?boarding=not-boarded&q=ana`) |
| POST | `/api/staff/validate-ticket` | Scan / board passenger |
| POST | `/api/staff/bus/:busId/trip` | Trip control (`start` / `pause` / `resume` / `end`) |
| POST | `/api/staff/quick-reply` | Send demo notification |

**Login body:**
```json
{ "id": "GT-0042", "password": "driver123" }
```

**Validate ticket body:**
```json
{ "ref": "GT-20261009-1001", "bus": "GN-204" }
```

**Trip body:**
```json
{ "action": "start" }
```

### Messages & profile

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/messages` | Passenger notifications |
| POST | `/api/messages/read-all` | Mark all read |
| GET | `/api/profile` | Passenger profile |
| PUT | `/api/profile` | Update profile |

## Example curl tests

```bash
# Health
curl http://localhost:3000/api/health

# Schedules
curl http://localhost:3000/api/schedules

# Staff login
curl -X POST http://localhost:3000/api/staff/login \
  -H "Content-Type: application/json" \
  -d '{"id":"GT-0042","password":"driver123"}'

# Dashboard (seat map + stats)
curl http://localhost:3000/api/staff/bus/GN-204/dashboard

# Manifest
curl "http://localhost:3000/api/staff/bus/GN-204/manifest?boarding=not-boarded"

# Create booking
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"bus":"GN-204","seats":["12A"],"passenger":"Test User","phone":"09170000000"}'

# Validate ticket
curl -X POST http://localhost:3000/api/staff/validate-ticket \
  -H "Content-Type: application/json" \
  -d '{"ref":"GT-20261009-1001","bus":"GN-204"}'
```

## Connect to the frontend later

In your HTML/JS prototype, replace `localStorage` reads with `fetch`:

```js
const API = 'http://localhost:3000/api';

async function loadSchedules() {
  const res = await fetch(`${API}/schedules`);
  const json = await res.json();
  return json.data;
}

async function staffLogin(id, password) {
  const res = await fetch(`${API}/staff/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, password })
  });
  return res.json();
}
```

Open the HTML file via a local server (not `file://`) so browser CORS rules work with `localhost:3000`.

## Reset demo data

```bash
npm run seed
# or
curl -X POST http://localhost:3000/api/reset
```

## Notes for capstone

- This is a **prototype backend** (JSON file store). Production would use PostgreSQL/MySQL, real auth (JWT), and live GPS.
- Seat locking, boarding, and cancel flows match the existing prototype logic.
- GPS tracking remains simulated on the client unless you add a separate location service.
- Do not claim live transport-company integration in documentation.
