# RoomBook Backend — Technical Documentation

> **Project:** room-booking-backend (NBU RoomBook)
> **Stack:** Node.js · Express.js · TypeScript · Prisma ORM · PostgreSQL · JWT · bcryptjs · node-cron · qrcode · Zod
> **Version:** 1.0.0

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Folder Structure](#3-folder-structure)
4. [Database Schema](#4-database-schema)
5. [API Endpoints](#5-api-endpoints)
   - [5.1 Health Check](#51-health-check)
   - [5.2 Auth Module](#52-auth-module)
   - [5.3 Rooms Module](#53-rooms-module)
   - [5.4 Departments Module](#54-departments-module)
   - [5.5 Bookings Module](#55-bookings-module)
   - [5.6 QR Module](#56-qr-module)
6. [Business Logic](#6-business-logic)
   - [6.1 Conflict Detection](#61-booking-conflict-detection)
   - [6.2 Admin Force Override](#62-admin-force-override)
   - [6.3 Auto-Complete Cron Job](#63-auto-complete-past-bookings)
   - [6.4 QR Token Flow](#64-qr-token-flow)
   - [6.5 JWT Authentication Flow](#65-jwt-authentication-flow)
7. [Middleware](#7-middleware)
8. [Validation (Zod)](#8-validation-zod)
9. [Error Handling](#9-error-handling)
10. [Environment Variables](#10-environment-variables)
11. [Setup & Deployment](#11-setup--deployment)

---

## 1. Project Overview

**RoomBook** is a QR-based room booking REST API built for the **National Bank of Uzbekistan (NBU)**. It allows admins to manage meeting rooms and generate unique QR codes for each room. Employees scan the QR code at the room entrance to open a booking form — no account or login is required for guests.

**End-to-end workflow:**

```
1. Admin creates a room via POST /api/rooms
2. Admin generates a QR code via POST /api/qr/generate/:roomId
3. QR code PNG is printed and placed at the room entrance
4. Employee scans QR → browser opens {FRONTEND_URL}/book?token={qrToken}
5. Frontend calls GET /api/bookings/room-by-token?token=... to get room info
6. Employee fills out the booking form → POST /api/bookings
7. System checks for conflicts → creates booking with status ACTIVE
8. Admin monitors bookings via dashboard, can cancel or force-override
9. At midnight, cron job auto-completes all expired ACTIVE bookings
```

---

## 2. Architecture

### High-Level Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                       Client (Frontend)                      │
└────────────────────────────┬─────────────────────────────────┘
                             │ HTTP Requests
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                     Express.js Server                        │
│                                                              │
│  Global Middleware                                           │
│  ├─ CORS (origin: FRONTEND_URL, credentials: true)          │
│  ├─ JSON body parser                                         │
│  ├─ URL-encoded body parser                                  │
│  ├─ Cookie parser                                            │
│  └─ Static file serving (/public → ./public)                 │
│                                                              │
│  API Routes                                                  │
│  ├─ /api/health                                              │
│  ├─ /api/auth      (public + authMiddleware on some routes)  │
│  ├─ /api/rooms     (authMiddleware + adminOnly)              │
│  ├─ /api/departments (mixed public/admin)                    │
│  ├─ /api/bookings  (mixed public/admin)                      │
│  └─ /api/qr        (mixed public/admin)                      │
│                                                              │
│  Controllers → Services → Prisma ORM → PostgreSQL            │
│                                                              │
│  Global Error Handler (errorMiddleware)                      │
│                                                              │
│  Cron Job (node-cron) — midnight auto-complete               │
└──────────────────────────────────────────────────────────────┘
```

### Request Lifecycle

```
Incoming Request
  → CORS middleware
  → JSON / cookie parser
  → Route matching
  → [authMiddleware] — verifies Bearer JWT access token
  → [adminOnly] — checks req.admin is set
  → Controller — parses & validates request, calls service
  → Service — business logic, calls Prisma
  → Prisma — executes SQL on PostgreSQL
  → Controller — calls sendSuccess()
  → Response sent to client

On any thrown error:
  → Global errorMiddleware handles ZodError, PrismaClientKnownRequestError, or generic errors
```

---

## 3. Folder Structure

```
room-booking-backend/
├── prisma/
│   └── schema.prisma              # Database schema: models, enums, relations
├── public/
│   └── qrcodes/                   # QR code PNG files (auto-created; gitignored)
├── src/
│   ├── server.ts                  # Entry point: starts server + registers cron job
│   ├── app.ts                     # Express app: middleware, routes, error handler
│   ├── config/
│   │   └── db.ts                  # Exports PrismaClient singleton
│   ├── middlewares/
│   │   ├── auth.middleware.ts     # Verifies JWT access token; attaches req.admin
│   │   ├── role.middleware.ts     # Allows only if req.admin exists (admin-only guard)
│   │   └── error.middleware.ts    # Global error handler
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.service.ts    # register, login, refresh, logout, changePassword
│   │   │   ├── auth.controller.ts # HTTP request handlers for auth
│   │   │   └── auth.routes.ts     # Route definitions for /api/auth
│   │   ├── rooms/
│   │   │   ├── rooms.service.ts   # Room CRUD, toggleActive
│   │   │   ├── rooms.controller.ts
│   │   │   └── rooms.routes.ts    # All routes protected by authMiddleware + adminOnly
│   │   ├── departments/
│   │   │   ├── departments.service.ts
│   │   │   ├── departments.controller.ts
│   │   │   └── departments.routes.ts
│   │   ├── bookings/
│   │   │   ├── bookings.service.ts  # createBooking, adminCreateBooking, conflict detection,
│   │   │   │                        # getAllBookings, getStats, getRecentBookings, autoComplete
│   │   │   ├── bookings.controller.ts
│   │   │   └── bookings.routes.ts   # Mixed public + admin routes
│   │   └── qr/
│   │       ├── qr.service.ts      # generateQr, getQrImage
│   │       ├── qr.controller.ts
│   │       └── qr.routes.ts
│   ├── utils/
│   │   ├── jwt.ts                 # generateAccessToken, generateRefreshToken,
│   │   │                          # verifyAccessToken, verifyRefreshToken
│   │   └── response.ts            # sendSuccess(res, msg, data, status)
│   │                              # sendError(res, msg, status)
│   └── validators/
│       ├── booking.validator.ts   # createBookingSchema, adminCreateBookingSchema (Zod)
│       └── room.validator.ts      # createRoomSchema, updateRoomSchema (Zod)
├── .env                           # Gitignored — copy from .env.example
├── .env.example                   # Environment variable template
├── package.json
└── tsconfig.json
```

### Key File Descriptions

| File | Purpose |
|---|---|
| `server.ts` | Starts HTTP server on `PORT`. Registers `node-cron` job at `0 0 * * *` (midnight) |
| `app.ts` | Wires up all Express middleware, mounts route modules, registers `errorMiddleware` last |
| `config/db.ts` | Exports a single `PrismaClient` instance reused by all services |
| `utils/jwt.ts` | `generateAccessToken` (15 min), `generateRefreshToken` (7 days), plus verify variants |
| `utils/response.ts` | `sendSuccess` / `sendError` — enforces the standard JSON response envelope |
| `middlewares/auth.middleware.ts` | Reads `Authorization: Bearer <token>`, calls `verifyAccessToken`, attaches decoded payload to `req.admin` |
| `middlewares/role.middleware.ts` | Returns `403` if `req.admin` is not set |
| `middlewares/error.middleware.ts` | Handles `ZodError` → 400 with field errors; `PrismaClientKnownRequestError` → mapped HTTP errors; generic `Error` with `.statusCode` property |

---

## 4. Database Schema

### 4.1 Entity Relationship Diagram

```
┌───────────┐        ┌──────────────────┐        ┌─────────────────┐
│   Admin   │        │       Room        │        │   Department    │
├───────────┤        ├──────────────────┤        ├─────────────────┤
│ id (PK)   │        │ id (PK)           │        │ id (PK)         │
│ email     │        │ name (unique)     │        │ name (unique)   │
│ password  │        │ location?         │        │ isActive        │
│ Hash      │        │ capacity?         │        │ createdAt       │
│ createdAt │        │ isActive          │        └────────┬────────┘
└───────────┘        │ qrCodeUrl?        │                 │
   (standalone)      │ qrToken? (unique) │                 │ 1:N (optional)
                     │ createdAt         │                 │
                     └────────┬──────────┘                 │
                              │ 1:N                        │
                              ▼                            ▼
                     ┌────────────────────────────────────────────┐
                     │                  Booking                    │
                     ├────────────────────────────────────────────┤
                     │ id (PK)                                     │
                     │ roomId       FK → Room.id                   │
                     │ departmentId FK → Department.id (optional)  │
                     │ firstName                                   │
                     │ lastName                                    │
                     │ date                                        │
                     │ startTime                                   │
                     │ endTime                                     │
                     │ status  (ACTIVE | COMPLETED | CANCELLED)    │
                     │ createdAt                                   │
                     └────────────────────────────────────────────┘
```

### 4.2 Models

#### Admin

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | `String` | `@id @default(uuid())` | UUID primary key |
| `email` | `String` | `@unique` | Admin email address |
| `passwordHash` | `String` | — | bcrypt hash (12 salt rounds) |
| `createdAt` | `DateTime` | `@default(now())` | Record creation timestamp |

#### Room

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | `String` | `@id @default(uuid())` | UUID primary key |
| `name` | `String` | `@unique` | Room display name |
| `location` | `String?` | Optional | Physical location |
| `capacity` | `Int?` | Optional | Max seating capacity |
| `isActive` | `Boolean` | `@default(true)` | Accepts new bookings when `true` |
| `qrCodeUrl` | `String?` | Optional | Path to the generated QR PNG |
| `qrToken` | `String?` | `@unique` Optional | UUID embedded in QR code URL |
| `createdAt` | `DateTime` | `@default(now())` | Record creation timestamp |
| `bookings` | `Booking[]` | Relation | One-to-many to Booking |

#### Department

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | `String` | `@id @default(uuid())` | UUID primary key |
| `name` | `String` | `@unique` | Department name |
| `isActive` | `Boolean` | `@default(true)` | Whether department is active |
| `createdAt` | `DateTime` | `@default(now())` | Record creation timestamp |
| `bookings` | `Booking[]` | Relation | One-to-many to Booking |

#### Booking

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | `String` | `@id @default(uuid())` | UUID primary key |
| `roomId` | `String` | FK → `Room.id` | The booked room |
| `departmentId` | `String?` | FK → `Department.id`, Optional | Booker's department |
| `firstName` | `String` | — | Booker's first name |
| `lastName` | `String` | — | Booker's last name |
| `date` | `DateTime` | — | Booking date (midnight UTC) |
| `startTime` | `DateTime` | — | Booking start datetime |
| `endTime` | `DateTime` | — | Booking end datetime |
| `status` | `BookingStatus` | `@default(ACTIVE)` | Booking lifecycle state |
| `createdAt` | `DateTime` | `@default(now())` | Record creation timestamp |

### 4.3 BookingStatus Enum

| Value | Description |
|---|---|
| `ACTIVE` | Booking is upcoming or in-progress |
| `COMPLETED` | Booking time has elapsed (auto or manual) |
| `CANCELLED` | Booking was cancelled by admin or overridden |

### 4.4 Relationships Summary

| Relationship | Type | Note |
|---|---|---|
| `Room` → `Booking` | One-to-Many | Room can have many bookings |
| `Department` → `Booking` | One-to-Many (optional) | `departmentId` is nullable on Booking |
| `Admin` | Standalone | No foreign key relations; used only for authentication |

---

## 5. API Endpoints

### Standard Response Envelope

All endpoints return JSON in the following shape:

**Success:**
```json
{
  "success": true,
  "message": "Human-readable message",
  "data": { }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Human-readable error message",
  "statusCode": 400
}
```

**Validation Error (Zod):**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": ["fieldName: error description"],
  "statusCode": 400
}
```

---

### 5.1 Health Check

#### `GET /api/health`

| | |
|---|---|
| **Auth** | Public |
| **Status** | `200 OK` |

**Response:**
```json
{ "success": true, "message": "Server is running", "data": null }
```

---

### 5.2 Auth Module

**Base path:** `/api/auth`

---

#### `POST /api/auth/register`

Register a new admin account. Protected by `ADMIN_SECRET_KEY`.

| | |
|---|---|
| **Auth** | Public (requires `secretKey`) |
| **Status** | `201 Created` |

**Request Body:**
```json
{
  "email": "admin@nbu.uz",
  "password": "securePassword123",
  "secretKey": "your-ADMIN_SECRET_KEY-value"
}
```

**Success Response `201`:**
```json
{
  "success": true,
  "message": "Admin registered successfully",
  "data": {
    "id": "uuid",
    "email": "admin@nbu.uz",
    "createdAt": "2026-03-30T12:00:00.000Z"
  }
}
```

**Error Cases:**

| Status | Condition |
|---|---|
| `403` | `secretKey` does not match `ADMIN_SECRET_KEY` env variable |
| `409` | Admin with this email already exists |

**Business Logic:**
1. Validates `secretKey === process.env.ADMIN_SECRET_KEY` → `403` if mismatch
2. Checks for existing admin with same email → `409` if duplicate
3. Hashes password with `bcrypt.hash(password, 12)`
4. Creates admin record; returns it without `passwordHash`

---

#### `POST /api/auth/login`

Authenticate an admin and receive JWT tokens.

| | |
|---|---|
| **Auth** | Public |
| **Status** | `200 OK` |

**Request Body:**
```json
{
  "email": "admin@nbu.uz",
  "password": "securePassword123"
}
```

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "admin": {
      "id": "uuid",
      "email": "admin@nbu.uz"
    }
  }
}
```

**Cookie set on response:**
```
Set-Cookie: refreshToken=<token>; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800
(Secure flag added when NODE_ENV=production)
```

**Error Cases:**

| Status | Condition |
|---|---|
| `401` | Email not found or password is incorrect |

**Business Logic:**
1. Finds admin by email → `401` if not found
2. `bcrypt.compare(password, admin.passwordHash)` → `401` if mismatch
3. Generates access token (15 min) and refresh token (7 days)
4. Sets `refreshToken` as HTTP-only cookie
5. Returns both tokens and admin info

---

#### `POST /api/auth/refresh`

Exchange a valid refresh token for a new access token.

| | |
|---|---|
| **Auth** | Public (requires refresh token) |
| **Status** | `200 OK` |

**Token source (in order of preference):** `refreshToken` cookie → request body

**Request Body (if not using cookie):**
```json
{ "refreshToken": "eyJhbGciOiJIUzI1NiIs..." }
```

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Error Cases:**

| Status | Condition |
|---|---|
| `400` | No refresh token provided |
| `401` | Token was invalidated (logged out) |
| `401` | Token is invalid or expired |

**Business Logic:**
1. Reads token from `req.cookies.refreshToken` or `req.body.refreshToken` → `400` if absent
2. Checks against in-memory `invalidatedTokens` Set → `401` if found
3. Calls `verifyRefreshToken(token)` → `401` on failure
4. Generates and returns a new 15-min access token

---

#### `POST /api/auth/logout`

Invalidate a refresh token to terminate a session.

| | |
|---|---|
| **Auth** | Public (requires refresh token) |
| **Status** | `200 OK` |

**Token source:** `refreshToken` cookie or request body (same as `/refresh`)

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

**Business Logic:**
1. Reads refresh token → `400` if absent
2. Adds token to in-memory `invalidatedTokens` Set
3. Clears `refreshToken` cookie via `res.clearCookie()`

> **Note:** The invalidation set is in-memory and will reset on server restart. For production environments that require persistent logout across restarts, replace with Redis or a database blacklist.

---

#### `PATCH /api/auth/change-password`

Change the authenticated admin's password.

| | |
|---|---|
| **Auth** | `authMiddleware` (Bearer token required) |
| **Status** | `200 OK` |

**Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": null
}
```

**Error Cases:**

| Status | Condition |
|---|---|
| `400` | `currentPassword` is incorrect |
| `400` | `newPassword` is identical to the current password |
| `404` | Admin record not found (should not occur with valid token) |

**Business Logic:**
1. Looks up admin by `req.admin.adminId`
2. `bcrypt.compare(currentPassword, admin.passwordHash)` → `400` if wrong
3. `bcrypt.compare(newPassword, admin.passwordHash)` → `400` if same as current
4. `bcrypt.hash(newPassword, 12)` and updates `passwordHash`

---

### 5.3 Rooms Module

**Base path:** `/api/rooms`

All room endpoints require `authMiddleware` + `adminOnly` middleware (applied to the entire router).

---

#### `POST /api/rooms`

Create a new room.

| | |
|---|---|
| **Auth** | Admin only |
| **Validation** | Zod `createRoomSchema` |
| **Status** | `201 Created` |

**Request Body:**
```json
{
  "name": "Conference Room A",
  "location": "Building 1, Floor 2",
  "capacity": 20,
  "isActive": true
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `name` | string | Yes | 1–100 characters |
| `location` | string | No | Max 200 characters |
| `capacity` | number | No | Positive integer |
| `isActive` | boolean | No | Defaults to `true` |

**Success Response `201`:**
```json
{
  "success": true,
  "message": "Room created successfully",
  "data": {
    "id": "uuid",
    "name": "Conference Room A",
    "location": "Building 1, Floor 2",
    "capacity": 20,
    "isActive": true,
    "qrCodeUrl": null,
    "qrToken": null,
    "createdAt": "2026-03-30T12:00:00.000Z"
  }
}
```

---

#### `GET /api/rooms`

Get all rooms, newest first.

| | |
|---|---|
| **Auth** | Admin only |
| **Status** | `200 OK` |

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Rooms fetched successfully",
  "data": [
    {
      "id": "uuid",
      "name": "Conference Room A",
      "location": "Building 1, Floor 2",
      "capacity": 20,
      "isActive": true,
      "qrCodeUrl": "/public/qrcodes/uuid.png",
      "qrToken": "qr-token-uuid",
      "createdAt": "2026-03-30T12:00:00.000Z"
    }
  ]
}
```

---

#### `GET /api/rooms/:id`

Get a single room by ID, including its current ACTIVE bookings.

| | |
|---|---|
| **Auth** | Admin only |
| **Status** | `200 OK` |

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Room fetched successfully",
  "data": {
    "id": "uuid",
    "name": "Conference Room A",
    "location": "Building 1, Floor 2",
    "capacity": 20,
    "isActive": true,
    "qrCodeUrl": "/public/qrcodes/uuid.png",
    "qrToken": "qr-token-uuid",
    "createdAt": "2026-03-30T12:00:00.000Z",
    "bookings": [
      {
        "id": "booking-uuid",
        "firstName": "John",
        "lastName": "Doe",
        "date": "2026-04-01T00:00:00.000Z",
        "startTime": "2026-04-01T09:00:00.000Z",
        "endTime": "2026-04-01T10:00:00.000Z",
        "status": "ACTIVE",
        "createdAt": "2026-03-30T12:00:00.000Z",
        "departmentId": null
      }
    ]
  }
}
```

**Business Logic:** Includes only `ACTIVE` bookings, ordered by `startTime` ascending.

| Status | Condition |
|---|---|
| `404` | Room not found |

---

#### `PATCH /api/rooms/:id`

Partially update a room's details.

| | |
|---|---|
| **Auth** | Admin only |
| **Validation** | Zod `updateRoomSchema` |
| **Status** | `200 OK` |

**Request Body (all fields optional):**
```json
{
  "name": "Updated Name",
  "location": "New Location",
  "capacity": 30,
  "isActive": false
}
```

| Field | Type | Validation |
|---|---|---|
| `name` | string | 1–100 characters |
| `location` | string \| null | Max 200 chars, nullable |
| `capacity` | number \| null | Positive integer, nullable |
| `isActive` | boolean | — |

**Error Cases:** `404` room not found.

---

#### `DELETE /api/rooms/:id`

Permanently delete a room record.

| | |
|---|---|
| **Auth** | Admin only |
| **Status** | `200 OK` |

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Room deleted successfully",
  "data": null
}
```

> **Warning:** Fails with a Prisma foreign-key error if the room has existing booking records. Cancel or delete the bookings first.

---

#### `PATCH /api/rooms/:id/toggle-active`

Flip a room's `isActive` status between `true` and `false`.

| | |
|---|---|
| **Auth** | Admin only |
| **Status** | `200 OK` |

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Room activated successfully",
  "data": {
    "id": "uuid",
    "name": "Conference Room A",
    "isActive": true
  }
}
```

**Business Logic:** Reads the current `isActive` value and writes its boolean inverse.

---

### 5.4 Departments Module

**Base path:** `/api/departments`

---

#### `POST /api/departments`

Create a new department.

| | |
|---|---|
| **Auth** | Admin only |
| **Status** | `201 Created` |

**Request Body:**
```json
{ "name": "Engineering" }
```

**Error Cases:** `409` if a department with the same name already exists.

---

#### `GET /api/departments`

Get all departments.

| | |
|---|---|
| **Auth** | Public |
| **Status** | `200 OK` |

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `onlyActive` | `"true"` | When set, returns only departments with `isActive = true` |

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Departments fetched successfully",
  "data": [
    {
      "id": "uuid",
      "name": "Engineering",
      "isActive": true,
      "createdAt": "2026-03-30T12:00:00.000Z"
    }
  ]
}
```

**Business Logic:** Ordered by `createdAt` descending. Filter by `isActive` if `?onlyActive=true`.

---

#### `GET /api/departments/:id`

Get a single department by ID.

| | |
|---|---|
| **Auth** | Admin only |
| **Status** | `200 OK` |

**Error Cases:** `404` department not found.

---

#### `PATCH /api/departments/:id`

Update a department's name and/or active status.

| | |
|---|---|
| **Auth** | Admin only |
| **Status** | `200 OK` |

**Request Body:**
```json
{
  "name": "Updated Department Name",
  "isActive": false
}
```

**Business Logic:**
1. Validates department exists → `404` if not found
2. If `name` is changing, checks for duplicate name (excludes self) → `409` on conflict
3. Updates and returns the department

---

#### `DELETE /api/departments/:id`

Permanently delete a department.

| | |
|---|---|
| **Auth** | Admin only |
| **Status** | `200 OK` |

> **Warning:** Fails with a Prisma foreign-key error if any booking references this department. Update bookings' `departmentId` to null first.

---

### 5.5 Bookings Module

**Base path:** `/api/bookings`

Mixed public and admin-protected routes.

---

#### `GET /api/bookings/room-by-token`

Resolve a QR token to its room info. Called by the frontend immediately after a QR scan.

| | |
|---|---|
| **Auth** | Public |
| **Status** | `200 OK` |

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `token` | string | Yes | The UUID from the QR code URL (`?token=...`) |

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Room fetched successfully",
  "data": {
    "id": "room-uuid",
    "name": "Conference Room A",
    "location": "Building 1, Floor 2",
    "capacity": 20,
    "isActive": true
  }
}
```

**Error Cases:** `404` if no room has this `qrToken`.

---

#### `POST /api/bookings`

Create a booking via QR code (public — no authentication required).

| | |
|---|---|
| **Auth** | Public |
| **Validation** | Zod `createBookingSchema` |
| **Status** | `201 Created` |

**Request Body:**
```json
{
  "token": "qr-token-uuid",
  "firstName": "John",
  "lastName": "Doe",
  "departmentId": "department-uuid",
  "date": "2026-04-01T00:00:00.000Z",
  "startTime": "2026-04-01T09:00:00.000Z",
  "endTime": "2026-04-01T10:00:00.000Z"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `token` | string | Yes | Valid UUID |
| `firstName` | string | Yes | 1–100 characters |
| `lastName` | string | Yes | 1–100 characters |
| `departmentId` | string | No | Valid UUID |
| `date` | string | Yes | ISO 8601 date |
| `startTime` | string | Yes | ISO 8601 datetime; must be before `endTime` |
| `endTime` | string | Yes | ISO 8601 datetime; must be after `startTime` |

**Success Response `201`:**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "id": "booking-uuid",
    "roomId": "room-uuid",
    "firstName": "John",
    "lastName": "Doe",
    "date": "2026-04-01T00:00:00.000Z",
    "startTime": "2026-04-01T09:00:00.000Z",
    "endTime": "2026-04-01T10:00:00.000Z",
    "status": "ACTIVE",
    "createdAt": "...",
    "departmentId": "department-uuid",
    "room": { "id": "...", "name": "Conference Room A", "location": "..." },
    "department": { "id": "...", "name": "Engineering" }
  }
}
```

**Error Cases:**

| Status | Condition |
|---|---|
| `400` | Zod validation failure |
| `403` | Room is inactive (`isActive = false`) |
| `404` | No room found with this QR token |
| `409` | Time slot overlaps with an existing ACTIVE booking |

**Business Logic:** See [Section 6.1](#61-booking-conflict-detection).

---

#### `POST /api/bookings/admin-create`

Create a booking as an admin with optional force-override of conflicting bookings.

| | |
|---|---|
| **Auth** | Admin only |
| **Validation** | Zod `adminCreateBookingSchema` |
| **Status** | `201 Created` or `200 OK` (conflict) |

**Request Body:**
```json
{
  "roomId": "room-uuid",
  "firstName": "Jane",
  "lastName": "Smith",
  "departmentId": "department-uuid",
  "date": "2026-04-01T00:00:00.000Z",
  "startTime": "2026-04-01T09:00:00.000Z",
  "endTime": "2026-04-01T10:00:00.000Z",
  "forceOverride": false
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `roomId` | string | Yes | Valid UUID |
| `firstName` | string | Yes | 1–100 characters |
| `lastName` | string | Yes | 1–100 characters |
| `departmentId` | string | No | Valid UUID |
| `date` | string | Yes | ISO 8601 |
| `startTime` | string | Yes | ISO 8601; must be before `endTime` |
| `endTime` | string | Yes | ISO 8601; must be after `startTime` |
| `forceOverride` | boolean | No | Default `false`. If `true`, cancels conflicting bookings |

**Conflict Response `200` (when `forceOverride = false` and a conflict exists):**
```json
{
  "success": false,
  "message": "This time slot is already booked",
  "statusCode": 409,
  "data": {
    "conflict": true,
    "existingBooking": {
      "id": "existing-booking-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "startTime": "2026-04-01T09:00:00.000Z",
      "endTime": "2026-04-01T10:00:00.000Z",
      "department": { "name": "Engineering" }
    }
  }
}
```

**Success Response `201` (no conflict, or `forceOverride = true`):**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": { "conflict": false, "booking": { "..." } }
}
```

**Business Logic:** See [Section 6.2](#62-admin-force-override).

---

#### `GET /api/bookings`

Get all bookings with optional filters.

| | |
|---|---|
| **Auth** | Admin only |
| **Status** | `200 OK` |

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `roomId` | string | Filter by room UUID |
| `date` | string | Filter by exact date (ISO 8601) |
| `status` | `ACTIVE` \| `COMPLETED` \| `CANCELLED` | Filter by booking status |

**Business Logic:**
1. Before fetching, auto-completes all ACTIVE bookings where `endTime < now`
2. Applies filters
3. Returns ordered by `createdAt` descending with room and department relations included

---

#### `GET /api/bookings/stats`

Get dashboard statistics.

| | |
|---|---|
| **Auth** | Admin only |
| **Status** | `200 OK` |

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Booking stats fetched successfully",
  "data": {
    "totalRooms": 10,
    "activeBookings": 5,
    "completedBookings": 42,
    "inactiveRooms": 2
  }
}
```

**Business Logic:** Auto-completes expired bookings first, then counts via four parallel Prisma queries.

---

#### `GET /api/bookings/recent`

Get the N most recent bookings.

| | |
|---|---|
| **Auth** | Admin only |
| **Status** | `200 OK` |

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | number | `5` | Number of bookings to return |

**Business Logic:** Auto-completes expired bookings first, then returns the N most recent by `createdAt` descending.

---

#### `GET /api/bookings/:id`

Get a single booking by ID.

| | |
|---|---|
| **Auth** | Admin only |
| **Status** | `200 OK` |

**Error Cases:** `404` booking not found.

---

#### `DELETE /api/bookings/:id`

Cancel a booking (soft delete — sets status to `CANCELLED`, record is preserved).

| | |
|---|---|
| **Auth** | Admin only |
| **Status** | `200 OK` |

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "data": {
    "id": "...",
    "status": "CANCELLED",
    "room": { "id": "...", "name": "...", "location": "..." }
  }
}
```

**Error Cases:** `404` booking not found.

---

#### `PATCH /api/bookings/:id/complete`

Manually mark a booking as `COMPLETED`.

| | |
|---|---|
| **Auth** | Admin only |
| **Status** | `200 OK` |

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Booking completed successfully",
  "data": {
    "id": "...",
    "status": "COMPLETED",
    "room": { "id": "...", "name": "...", "location": "..." }
  }
}
```

**Error Cases:** `404` booking not found.

---

### 5.6 QR Module

**Base path:** `/api/qr`

---

#### `POST /api/qr/generate/:roomId`

Generate (or regenerate) a QR code PNG for a room.

| | |
|---|---|
| **Auth** | Admin only |
| **Status** | `201 Created` |

**URL Parameter:** `roomId` — UUID of the target room.

**Success Response `201`:**
```json
{
  "success": true,
  "message": "QR code generated successfully",
  "data": {
    "qrImageUrl": "/public/qrcodes/room-uuid.png",
    "bookingUrl": "https://yourdomain.com/book?token=qr-token-uuid",
    "qrToken": "qr-token-uuid"
  }
}
```

**Error Cases:** `404` room not found.

> **Warning:** Calling this endpoint again for the same room generates a **new** token and overwrites the PNG. Any previously printed QR codes for this room will no longer work.

**Business Logic:** See [Section 6.4](#64-qr-token-flow).

---

#### `GET /api/qr/image/:roomId`

Serve the QR code PNG image file directly.

| | |
|---|---|
| **Auth** | Public |
| **Content-Type** | `image/png` |

**URL Parameter:** `roomId` — UUID of the room.

**Response:** Sends the PNG file via `res.sendFile()`.

**Error Cases:**
- `404` — Room not found
- `404` — QR code not yet generated for this room

---

## 6. Business Logic

### 6.1 Booking Conflict Detection

The system prevents double-bookings using a time-overlap algorithm. Only `ACTIVE` bookings are checked; `COMPLETED` and `CANCELLED` bookings are ignored.

**Overlap condition:**

```
A conflict exists when ALL of the following are true:
  roomId matches
  date matches
  existing.startTime < new.endTime   (existing starts before new ends)
  existing.endTime   > new.startTime (existing ends after new starts)
```

**Prisma query (public booking):**
```typescript
const overlapping = await prisma.booking.findFirst({
  where: {
    roomId: room.id,
    status: BookingStatus.ACTIVE,
    date: bookingDate,
    startTime: { lt: endTime },
    endTime:   { gt: startTime },
  },
});
```

**Visual examples:**

```
Timeline:   8:00    9:00    10:00   11:00   12:00
            ├───────┼───────┼───────┼───────┤

CONFLICT ❌  — Partial overlap
  Existing: [████████████████████]         (9:00–11:00)
  New:              [████████████████]     (10:00–12:00)

CONFLICT ❌  — New is a subset
  Existing: [████████████████████]         (9:00–11:00)
  New:       [████████]                    (9:00–10:00)

NO CONFLICT ✅  — Adjacent (touching boundary)
  Existing: [████████████████████]         (9:00–11:00)
  New:                           [███████] (11:00–12:00)

NO CONFLICT ✅  — New ends at existing start
  Existing:         [████████████████]     (10:00–12:00)
  New:       [██████]                      (8:00–10:00)
```

---

### 6.2 Admin Force Override

The `POST /api/bookings/admin-create` endpoint supports a two-step conflict resolution flow that lets admins see what they would override before committing.

```
┌──────────────────────────────────────────────────────────────┐
│  Step 1 — forceOverride: false (default)                     │
│                                                              │
│  ├─ No conflict → booking created immediately ✅             │
│  └─ Conflict found → returns existing booking details        │
│                       so admin can review before overriding  │
│                                                              │
│  Step 2 — forceOverride: true (after reviewing conflict)     │
│                                                              │
│  ├─ All overlapping ACTIVE bookings → set to CANCELLED       │
│  └─ New booking created ✅                                   │
└──────────────────────────────────────────────────────────────┘
```

Key differences from public booking:

| | Public Booking | Admin Booking |
|---|---|---|
| Conflict → | `409` error, booking rejected | Returns conflict details with `conflict: true` |
| Override | Not possible | `forceOverride: true` cancels existing bookings |
| Room identified by | QR `token` | `roomId` (UUID) |

**Cancel query on override:**
```typescript
await prisma.booking.updateMany({
  where: { id: { in: overlapping.map((b) => b.id) } },
  data:  { status: BookingStatus.CANCELLED },
});
```

---

### 6.3 Auto-Complete Past Bookings

The system has two complementary mechanisms to keep booking statuses accurate:

#### Mechanism 1 — Midnight Cron Job (`server.ts`)

```
Cron expression: 0 0 * * *  (every day at 00:00:00)
```

```typescript
cron.schedule('0 0 * * *', async () => {
  const count = await bookingsService.autoCompletePastBookings();
  console.log(`[CRON] Auto-completed ${count} past booking(s)`);
});
```

Runs `UPDATE booking SET status = 'COMPLETED' WHERE status = 'ACTIVE' AND endTime < NOW()`.

#### Mechanism 2 — On-Demand (before data reads)

Three service methods auto-complete expired bookings before querying, ensuring real-time accuracy regardless of when the cron last ran:

| Method | When triggered |
|---|---|
| `getAllBookings()` | `GET /api/bookings` |
| `getStats()` | `GET /api/bookings/stats` |
| `getRecentBookings()` | `GET /api/bookings/recent` |

All three run the same `updateMany` query before their main `findMany`/`count` calls.

---

### 6.4 QR Token Flow

#### Generation (`POST /api/qr/generate/:roomId`)

```
1. Verify room exists (404 if not)
2. Generate UUID: qrToken = crypto.randomUUID()
3. Build booking URL: {FRONTEND_URL}/book?token={qrToken}
4. Ensure public/qrcodes/ directory exists (mkdirSync if needed)
5. Write QR PNG: QRCode.toFile('public/qrcodes/{roomId}.png', bookingUrl, {
     width: 400, margin: 2,
     color: { dark: '#000000', light: '#FFFFFF' }
   })
6. Update Room: { qrCodeUrl: '/public/qrcodes/{roomId}.png', qrToken }
7. Return: { qrImageUrl, bookingUrl, qrToken }
```

#### User Booking Flow

```
User scans QR → opens {FRONTEND_URL}/book?token={qrToken}
  Frontend: GET /api/bookings/room-by-token?token={qrToken}
    → finds Room by qrToken field
    → returns room info (id, name, location, capacity, isActive)
  User fills form → POST /api/bookings { token, firstName, lastName, ... }
    → conflict check → booking created ✅
```

---

### 6.5 JWT Authentication Flow

```
                  POST /api/auth/login
                 ┌─────────────────────────────────┐
                 │ email + password                 │
                 └────────────────┬────────────────┘
                                  ▼
                         bcrypt.compare()
                                  │
              ┌───────────────────┴───────────────────┐
              │ Valid                                  │ Invalid
              ▼                                        ▼
   ┌─────────────────────┐                      401 Unauthorized
   │ generateAccessToken │  (15 min, HS256)
   │ generateRefreshToken│  (7 days, HS256)
   └──────────┬──────────┘
              │ Response body: { accessToken, refreshToken, admin }
              │ Set-Cookie: refreshToken=...; HttpOnly; SameSite=Strict
              ▼

   Client stores accessToken (memory/localStorage)
   Client stores refreshToken (via HTTP-only cookie — automatic)

              │ All admin API requests:
              │ Authorization: Bearer {accessToken}
              ▼
   authMiddleware: verifyAccessToken(token)
              │ Valid → req.admin = { adminId, email }
              │ Invalid/expired → 401

              │ When accessToken expires:
              ▼
   POST /api/auth/refresh
   Cookie: refreshToken=... (sent automatically by browser)
              │
              ▼ New accessToken returned

   POST /api/auth/logout
              │ refreshToken added to invalidatedTokens Set
              │ Cookie cleared
              ▼ Session terminated
```

**Token configuration:**

| Token | Expiry | Algorithm | Stored in |
|---|---|---|---|
| Access Token | 15 minutes | HS256 | Response body (client memory) |
| Refresh Token | 7 days | HS256 | HTTP-only cookie + response body |

---

## 7. Middleware

| Middleware | File | Applied To | Purpose |
|---|---|---|---|
| CORS | `app.ts` | All routes | Allows requests from `FRONTEND_URL` with credentials |
| JSON parser | `app.ts` | All routes | Parses `application/json` bodies |
| URL-encoded parser | `app.ts` | All routes | Parses form-encoded bodies |
| Cookie parser | `app.ts` | All routes | Parses `Cookie` header; populates `req.cookies` |
| Static files | `app.ts` | `/public/*` | Serves QR code images from `./public/` |
| `authMiddleware` | `auth.middleware.ts` | Protected routes | Verifies Bearer JWT; sets `req.admin` |
| `adminOnly` | `role.middleware.ts` | Admin routes | Returns `403` if `req.admin` is not set |
| `errorMiddleware` | `error.middleware.ts` | All routes (last) | Catches all thrown errors |

### Error Middleware Behavior

| Error Type | Mapped Response |
|---|---|
| `ZodError` | `400` with `errors` array of field-level messages |
| `PrismaClientKnownRequestError P2002` | `409` Unique constraint violation |
| `PrismaClientKnownRequestError P2025` | `404` Record not found |
| `Error` with `.statusCode` property | HTTP status from `.statusCode` |
| Any other `Error` | `500` Internal server error |

---

## 8. Validation (Zod)

Validation schemas are defined in `src/validators/` and applied in controllers before calling services.

### `createRoomSchema` (`room.validator.ts`)

```typescript
{
  name:     z.string().min(1).max(100),
  location: z.string().max(200).optional(),
  capacity: z.number().int().positive().optional(),
  isActive: z.boolean().optional()
}
```

### `updateRoomSchema` (`room.validator.ts`)

Same as `createRoomSchema` but all fields optional; `location` and `capacity` also accept `null`.

### `createBookingSchema` (`booking.validator.ts`)

```typescript
{
  token:        z.string().uuid(),
  firstName:    z.string().min(1).max(100),
  lastName:     z.string().min(1).max(100),
  departmentId: z.string().uuid().optional(),
  date:         z.string() [ISO 8601 refine],
  startTime:    z.string() [ISO 8601 refine],
  endTime:      z.string() [ISO 8601 refine]
} + .refine(startTime < endTime)
```

### `adminCreateBookingSchema` (`booking.validator.ts`)

```typescript
{
  roomId:        z.string().uuid(),
  firstName:     z.string().min(1).max(100),
  lastName:      z.string().min(1).max(100),
  departmentId:  z.string().uuid().optional(),
  date:          z.string() [ISO 8601 refine],
  startTime:     z.string() [ISO 8601 refine],
  endTime:       z.string() [ISO 8601 refine],
  forceOverride: z.boolean().optional().default(false)
} + .refine(startTime < endTime)
```

---

## 9. Error Handling

### Throwing Errors in Services

Services throw typed errors with an attached `.statusCode`:

```typescript
throw Object.assign(new Error('Human-readable message'), { statusCode: 404 });
```

The `errorMiddleware` reads `.statusCode` and uses it as the HTTP response status.

### HTTP Status Codes Used

| Code | Meaning | Common Causes |
|---|---|---|
| `200` | OK | Successful read/update/delete |
| `201` | Created | Successful resource creation |
| `400` | Bad Request | Validation failure, wrong current password, missing token |
| `401` | Unauthorized | Invalid/expired JWT, wrong email/password |
| `403` | Forbidden | Invalid `ADMIN_SECRET_KEY`, booking inactive room, missing admin role |
| `404` | Not Found | Room, department, booking not found |
| `409` | Conflict | Duplicate email/name, time-slot already booked |
| `500` | Internal Server Error | Unexpected server error |

---

## 10. Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Yes | `"default-access-secret"` | Signs access tokens (use strong random string in production) |
| `JWT_REFRESH_SECRET` | Yes | `"default-refresh-secret"` | Signs refresh tokens (use strong random string in production) |
| `PORT` | No | `3000` | HTTP server port |
| `FRONTEND_URL` | Yes | `"http://localhost:5173"` | Used for CORS and QR booking URL generation |
| `ADMIN_SECRET_KEY` | Yes | — | Protects `POST /api/auth/register` |
| `NODE_ENV` | No | — | Set to `"production"` to enable `Secure` flag on cookies |

**`.env` example:**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/room_booking?schema=public"
JWT_ACCESS_SECRET="change-me-use-64+-random-chars"
JWT_REFRESH_SECRET="change-me-use-64+-random-chars"
PORT=3000
FRONTEND_URL="https://roombook.nbu.uz"
ADMIN_SECRET_KEY="another-long-random-secret"
```

---

## 11. Setup & Deployment

### 11.1 Prerequisites

- Node.js ≥ 18.x
- npm ≥ 9.x
- PostgreSQL ≥ 14.x

### 11.2 Local Development

```bash
# 1. Clone repository
git clone <repository-url>
cd room-booking-backend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your values

# 4. Generate Prisma client
npx prisma generate

# 5. Create database tables
npx prisma db push

# 6. Start dev server (hot-reload via nodemon)
npm run dev
# → http://localhost:3000

# Verify
curl http://localhost:3000/api/health
```

### 11.3 NPM Scripts

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `nodemon --exec ts-node src/server.ts` | Dev server with hot-reload |
| `npm run build` | `tsc` | Compile TypeScript → `dist/` |
| `npm start` | `node dist/server.js` | Run compiled production build |
| `npm run prisma:generate` | `prisma generate` | Regenerate Prisma client |
| `npm run prisma:push` | `prisma db push` | Apply schema to database |
| `npm run prisma:studio` | `prisma studio` | Open Prisma Studio GUI |

### 11.4 Production Deployment (Linux + systemd + Nginx)

#### Step 1 — Server Setup

```bash
# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib
```

#### Step 2 — PostgreSQL

```sql
sudo -u postgres psql
CREATE DATABASE room_booking;
CREATE USER room_user WITH ENCRYPTED PASSWORD 'strong-password';
GRANT ALL PRIVILEGES ON DATABASE room_booking TO room_user;
\q
```

#### Step 3 — Application

```bash
git clone <repository-url> /opt/room-booking
cd /opt/room-booking
npm install
cp .env.example .env && nano .env   # fill production values
npx prisma generate
npx prisma db push
npm run build
mkdir -p public/qrcodes
```

#### Step 4 — systemd Service

```ini
# /etc/systemd/system/room-booking.service
[Unit]
Description=RoomBook API Server
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/room-booking
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable room-booking
sudo systemctl start room-booking
sudo systemctl status room-booking
```

#### Step 5 — Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/room-booking
server {
    listen 80;
    server_name roombook.nbu.uz;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/room-booking /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 6 — SSL (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d roombook.nbu.uz
```

#### Step 7 — File Permissions

```bash
sudo chown -R www-data:www-data /opt/room-booking/public/qrcodes
```

### 11.5 Production Checklist

| Item | Action |
|---|---|
| JWT secrets | Use cryptographically random strings (≥ 64 characters) |
| `ADMIN_SECRET_KEY` | Rotate after all admins are registered |
| `NODE_ENV=production` | Enables `Secure` flag on refresh token cookies (requires HTTPS) |
| HTTPS | Required before going live |
| `public/qrcodes/` | Must be writable by the process user |
| Token blacklist | Current implementation uses in-memory Set; replace with Redis for production persistence across restarts |
| Database backups | Schedule regular `pg_dump` snapshots |
| Prisma migrations | Use `prisma migrate deploy` instead of `prisma db push` for production schema changes |
