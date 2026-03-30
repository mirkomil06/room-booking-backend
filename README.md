# RoomBook — Backend API

> QR-Based Room Booking System for the **National Bank of Uzbekistan (NBU)**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Overview

RoomBook is a RESTful backend API that enables organizations to manage meeting rooms and allow employees to book them simply by scanning a QR code. Each room has a unique QR code; scanning it opens a booking form on the frontend — no account required for guests.

**Core workflow:**

```
Admin creates room → Generates QR code → Prints & places it at room entrance
User scans QR code → Opens booking form → Selects time slot → Booking created
Admin monitors bookings → Views stats → Manages conflicts
```

---

## Features

**Authentication**
- Admin registration protected by `ADMIN_SECRET_KEY`
- JWT access tokens (15 min) + refresh tokens (7 days via HTTP-only cookie)
- Secure password hashing with bcrypt (12 salt rounds)
- Change password with current-password verification

**Room Management**
- Full CRUD for rooms (name, location, capacity)
- Toggle room active/inactive status
- QR code generation per room (400×400px PNG saved to `public/qrcodes/`)

**Department Management**
- Full CRUD for departments
- Toggle department active/inactive
- Optional association with bookings

**Booking System**
- Public booking creation via QR token (no login required)
- Admin booking with conflict visibility and force-override capability
- Booking conflict detection (time-overlap algorithm, only ACTIVE bookings considered)
- Cancel and manually complete bookings
- Soft delete — records preserved with status change

**Dashboard & Monitoring**
- Dashboard stats: total rooms, active bookings, completed bookings, inactive rooms
- Recent bookings list with configurable limit
- Paginated bookings list with filters (room, date, status)

**Automation**
- Cron job at midnight: auto-completes all expired ACTIVE bookings
- On-demand auto-complete before data reads (stats, all bookings, recent bookings)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express.js 4.x |
| Language | TypeScript 5.x |
| ORM | Prisma |
| Database | PostgreSQL 14+ |
| Auth | JSON Web Tokens (jsonwebtoken) |
| Password | bcryptjs (12 salt rounds) |
| Validation | Zod |
| Scheduling | node-cron |
| QR Generation | qrcode |
| Dev Server | nodemon + ts-node |

---

## Quick Start

### Prerequisites

- Node.js ≥ 18.x
- npm ≥ 9.x
- PostgreSQL ≥ 14.x running locally or remotely

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd room-booking-backend

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env
# Open .env and fill in your values (see Environment Variables section below)

# 4. Generate Prisma client
npx prisma generate

# 5. Push schema to database (creates all tables)
npx prisma db push

# 6. Start the development server
npm run dev
```

The server starts at **http://localhost:3000**

Verify it's running:
```bash
curl http://localhost:3000/api/health
# {"success":true,"message":"Server is running","data":null}
```

### Register the First Admin

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@nbu.uz",
    "password": "securePassword123",
    "secretKey": "your-ADMIN_SECRET_KEY-value"
  }'
```

---

## Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://user:password@localhost:5432/room_booking?schema=public"

# JWT secrets — use long random strings in production
JWT_ACCESS_SECRET="your-access-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret-key"

# Server port (default: 3000)
PORT=3000

# Frontend URL — used for CORS and QR booking URL generation
FRONTEND_URL="http://localhost:5173"

# Protects the /api/auth/register endpoint
ADMIN_SECRET_KEY="your-admin-secret-key"
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Yes | Signs 15-minute access tokens |
| `JWT_REFRESH_SECRET` | Yes | Signs 7-day refresh tokens |
| `PORT` | No (default `3000`) | HTTP server port |
| `FRONTEND_URL` | Yes | CORS origin + QR code URL base |
| `ADMIN_SECRET_KEY` | Yes | Guards admin registration |

---

## NPM Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server with hot-reload (nodemon + ts-node) |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run compiled production build (`dist/server.js`) |
| `npm run prisma:generate` | Regenerate Prisma client after schema changes |
| `npm run prisma:push` | Push schema changes to the database |
| `npm run prisma:studio` | Open Prisma Studio database GUI |

---

## Folder Structure

```
room-booking-backend/
├── prisma/
│   └── schema.prisma            # Database schema (models, enums, relations)
├── public/
│   └── qrcodes/                 # Generated QR code PNG images (auto-created)
├── src/
│   ├── server.ts                # Entry point: HTTP server + cron job
│   ├── app.ts                   # Express setup: middleware, routes, error handler
│   ├── config/
│   │   └── db.ts                # Prisma client singleton
│   ├── middlewares/
│   │   ├── auth.middleware.ts   # JWT access token verification
│   │   ├── role.middleware.ts   # Admin-only access guard
│   │   └── error.middleware.ts  # Global error handler (Zod, Prisma, generic)
│   ├── modules/
│   │   ├── auth/                # Register, login, logout, refresh, change-password
│   │   ├── rooms/               # Room CRUD + toggle active
│   │   ├── departments/         # Department CRUD + toggle active
│   │   ├── bookings/            # Booking creation, management, stats, dashboard
│   │   └── qr/                  # QR code generation and image serving
│   ├── utils/
│   │   ├── jwt.ts               # Token generation and verification helpers
│   │   └── response.ts          # sendSuccess / sendError helpers
│   └── validators/
│       ├── booking.validator.ts # Zod schemas for public + admin booking creation
│       └── room.validator.ts    # Zod schemas for room create/update
├── .env                         # Environment variables (gitignored)
├── .env.example                 # Environment variable template
├── package.json
└── tsconfig.json
```

---

## API Overview

All endpoints are prefixed with `/api`. For full request/response documentation see [DOCUMENTATION.md](DOCUMENTATION.md).

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Server health check |

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public + Secret Key | Register a new admin |
| `POST` | `/api/auth/login` | Public | Login, receive tokens |
| `POST` | `/api/auth/refresh` | Public + Refresh Token | Refresh access token |
| `POST` | `/api/auth/logout` | Public + Refresh Token | Invalidate refresh token |
| `PATCH` | `/api/auth/change-password` | Admin | Change admin password |

### Rooms — `/api/rooms`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/rooms` | Admin | List all rooms |
| `POST` | `/api/rooms` | Admin | Create a room |
| `GET` | `/api/rooms/:id` | Admin | Get room with active bookings |
| `PATCH` | `/api/rooms/:id` | Admin | Update room details |
| `DELETE` | `/api/rooms/:id` | Admin | Delete a room |
| `PATCH` | `/api/rooms/:id/toggle-active` | Admin | Toggle active status |

### Departments — `/api/departments`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/departments` | Public | List departments (filter: `?onlyActive=true`) |
| `POST` | `/api/departments` | Admin | Create a department |
| `GET` | `/api/departments/:id` | Admin | Get a department by ID |
| `PATCH` | `/api/departments/:id` | Admin | Update a department |
| `DELETE` | `/api/departments/:id` | Admin | Delete a department |

### Bookings — `/api/bookings`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/bookings/room-by-token` | Public | Get room info by QR token |
| `POST` | `/api/bookings` | Public | Create booking via QR token |
| `POST` | `/api/bookings/admin-create` | Admin | Create booking with force-override |
| `GET` | `/api/bookings` | Admin | List all bookings (with filters) |
| `GET` | `/api/bookings/stats` | Admin | Dashboard statistics |
| `GET` | `/api/bookings/recent` | Admin | Recent bookings list |
| `GET` | `/api/bookings/:id` | Admin | Get booking by ID |
| `DELETE` | `/api/bookings/:id` | Admin | Cancel a booking (soft delete) |
| `PATCH` | `/api/bookings/:id/complete` | Admin | Manually complete a booking |

### QR — `/api/qr`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/qr/generate/:roomId` | Admin | Generate QR code PNG for a room |
| `GET` | `/api/qr/image/:roomId` | Public | Download QR code PNG image |

---

## Deployment

### Build for Production

```bash
npm run build        # compiles TypeScript → dist/
NODE_ENV=production npm start
```

Setting `NODE_ENV=production` enables the `Secure` flag on refresh token cookies (requires HTTPS).

### Linux + systemd + Nginx

See [DOCUMENTATION.md — Setup & Deployment](DOCUMENTATION.md#7-setup--deployment) for a complete step-by-step guide covering:

- PostgreSQL setup
- systemd service file
- Nginx reverse proxy configuration
- SSL certificate via Let's Encrypt

### Key Production Considerations

| Item | Note |
|---|---|
| **JWT secrets** | Use cryptographically random strings (≥ 64 chars) |
| **ADMIN_SECRET_KEY** | Rotate after registering all admin accounts |
| **HTTPS** | Required for `Secure` cookie flag on refresh tokens |
| **`public/qrcodes/`** | Ensure write permission for the process user |
| **Token invalidation** | Logout uses an in-memory Set — cleared on restart; upgrade to Redis for production persistence |
| **Database backups** | Schedule regular PostgreSQL dumps |

---

## Database Schema (Summary)

| Model | Key Fields |
|---|---|
| `Admin` | `id`, `email`, `passwordHash`, `createdAt` |
| `Room` | `id`, `name`, `location`, `capacity`, `isActive`, `qrCodeUrl`, `qrToken` |
| `Department` | `id`, `name`, `isActive`, `createdAt` |
| `Booking` | `id`, `roomId`, `departmentId`, `firstName`, `lastName`, `date`, `startTime`, `endTime`, `status` |

**Booking statuses:** `ACTIVE` → `COMPLETED` (auto or manual) / `CANCELLED`

---

## License

MIT © National Bank of Uzbekistan
