# 📋 Room Booking System — Backend Documentation

> **Project:** room-booking (Backend)
> **Tech Stack:** Node.js · Express.js · TypeScript · Prisma ORM · PostgreSQL · JWT Auth · bcrypt · node-cron · qrcode · Zod
> **Version:** 1.0.0

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Folder Structure](#2-folder-structure)
3. [Database Schema](#3-database-schema)
4. [API Endpoints](#4-api-endpoints)
   - [Auth](#41-auth-module)
   - [Rooms](#42-rooms-module)
   - [Departments](#43-departments-module)
   - [Bookings](#44-bookings-module)
   - [QR](#45-qr-module)
5. [Business Logic](#5-business-logic)
6. [Environment Variables](#6-environment-variables)
7. [Setup & Deployment](#7-setup--deployment)

---

## 1. Project Overview

### What This Project Does

**Room Booking System** is a QR-Based Room Booking backend API that enables organizations to manage meeting rooms and allow users to book them by scanning QR codes.

**Core workflow:**
1. An **admin** creates rooms and generates unique QR codes for each room.
2. QR codes are printed and placed at each room's entrance.
3. **Users** scan a QR code, which opens a booking form in the frontend.
4. Users fill in their details and select an available time slot to create a booking.
5. The system automatically detects scheduling conflicts and prevents double-booking.
6. Admins can manage bookings, override conflicting slots, and view dashboard statistics.

### Architecture Overview

The project follows a **modular MVC-like architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────┐
│                    Client (Frontend)                │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP Requests
                       ▼
┌─────────────────────────────────────────────────────┐
│                  Express.js Server                  │
│  ┌───────────────────────────────────────────────┐  │
│  │            Global Middleware                   │  │
│  │  (CORS, JSON Parser, Cookie Parser, Static)   │  │
│  └───────────────────────────────────────────────┘  │
│                       │                              │
│  ┌───────────────────────────────────────────────┐  │
│  │          Route-Level Middleware               │  │
│  │  (authMiddleware → adminOnly)                 │  │
│  └───────────────────────────────────────────────┘  │
│                       │                              │
│  ┌───────────────────────────────────────────────┐  │
│  │              API Routes                       │  │
│  │  /api/auth   /api/rooms   /api/bookings       │  │
│  │  /api/qr     /api/departments                 │  │
│  └───────────────────────────────────────────────┘  │
│                       │                              │
│  ┌───────────────────────────────────────────────┐  │
│  │           Controllers                         │  │
│  │  (Request parsing, validation, response)      │  │
│  └───────────────────────────────────────────────┘  │
│                       │                              │
│  ┌───────────────────────────────────────────────┐  │
│  │            Services                           │  │
│  │  (Business logic, DB operations)              │  │
│  └───────────────────────────────────────────────┘  │
│                       │                              │
│  ┌───────────────────────────────────────────────┐  │
│  │         Prisma ORM → PostgreSQL               │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │         Global Error Handler                  │  │
│  │  (Zod, Prisma, generic error handling)        │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │         Cron Job (node-cron)                  │  │
│  │  Auto-complete past bookings at midnight      │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Request Processing Flow:**
```
Request → CORS → JSON Parser → Cookie Parser → Route Matching
       → [authMiddleware] → [adminOnly] → Controller → Service → Prisma → DB
       → Response (or Global Error Handler if error thrown)
```

---

## 2. Folder Structure

```
room-booking/
├── prisma/
│   ├── schema.prisma           # Prisma database schema (models, enums, relations)
│   └── migrations/             # Auto-generated database migration files
├── public/
│   └── qrcodes/                # Generated QR code PNG images (gitignored)
├── src/
│   ├── server.ts               # Entry point: starts HTTP server + cron job
│   ├── app.ts                  # Express app setup: middleware, routes, error handler
│   ├── config/
│   │   └── db.ts               # PrismaClient singleton instance
│   ├── middlewares/
│   │   ├── auth.middleware.ts   # JWT access token verification middleware
│   │   ├── role.middleware.ts   # Admin-only access guard middleware
│   │   └── error.middleware.ts  # Global error handler (Zod, Prisma, generic)
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.service.ts      # Registration, login, token refresh, logout logic
│   │   │   ├── auth.controller.ts   # Auth request handlers
│   │   │   └── auth.routes.ts       # Auth route definitions
│   │   ├── rooms/
│   │   │   ├── rooms.service.ts     # Room CRUD operations
│   │   │   ├── rooms.controller.ts  # Room request handlers
│   │   │   └── rooms.routes.ts      # Room route definitions (all admin-only)
│   │   ├── departments/
│   │   │   ├── departments.service.ts     # Department CRUD operations
│   │   │   ├── departments.controller.ts  # Department request handlers
│   │   │   └── departments.routes.ts      # Department route definitions
│   │   ├── bookings/
│   │   │   ├── bookings.service.ts      # Booking CRUD, conflict detection, stats, auto-complete
│   │   │   ├── bookings.controller.ts   # Booking request handlers
│   │   │   └── bookings.routes.ts       # Booking route definitions (public + admin)
│   │   └── qr/
│   │       ├── qr.service.ts       # QR code generation and image retrieval
│   │       ├── qr.controller.ts    # QR request handlers
│   │       └── qr.routes.ts        # QR route definitions
│   ├── utils/
│   │   ├── jwt.ts               # JWT token generation and verification helpers
│   │   └── response.ts          # Standardized API response helpers (sendSuccess, sendError)
│   └── validators/
│       ├── booking.validator.ts # Zod schemas for booking creation (public + admin)
│       └── room.validator.ts    # Zod schemas for room creation and update
├── .env                        # Environment variables (gitignored)
├── .env.example                # Environment variable template
├── .gitignore                  # Git ignore rules
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript compiler configuration
└── package-lock.json           # Locked dependency versions
```

### Key File Descriptions

| File | Purpose |
|------|---------|
| `server.ts` | Application entry point — starts the Express server on the configured port and registers the midnight cron job for auto-completing past bookings |
| `app.ts` | Configures the Express application — sets up CORS, JSON parsing, cookie parser, static file serving, all API routes, and the global error handler |
| `config/db.ts` | Exports a singleton `PrismaClient` instance used by all services |
| `utils/jwt.ts` | Provides `generateAccessToken` (15 min), `generateRefreshToken` (7 days), `verifyAccessToken`, and `verifyRefreshToken` functions |
| `utils/response.ts` | Provides `sendSuccess(res, message, data, statusCode)` and `sendError(res, message, statusCode)` for consistent API responses |

---

## 3. Database Schema

### 3.1 Entity Relationship Diagram

```
┌──────────┐       ┌──────────────┐       ┌──────────────┐
│  Admin   │       │     Room     │       │  Department  │
├──────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)  │       │ id (PK)      │       │ id (PK)      │
│ email    │       │ name         │       │ name         │
│ password │       │ location     │       │ isActive     │
│ Hash     │       │ capacity     │       │ createdAt    │
│ createdAt│       │ isActive     │       └──────┬───────┘
└──────────┘       │ qrCodeUrl   │              │
                   │ qrToken     │              │ 1:N (optional)
                   │ createdAt   │              │
                   └──────┬──────┘              │
                          │ 1:N                 │
                          │                     │
                   ┌──────▼─────────────────────▼──┐
                   │           Booking             │
                   ├───────────────────────────────┤
                   │ id (PK)                       │
                   │ roomId (FK → Room)             │
                   │ departmentId (FK → Department) │
                   │ firstName                      │
                   │ lastName                       │
                   │ date                           │
                   │ startTime                      │
                   │ endTime                        │
                   │ status (BookingStatus enum)     │
                   │ createdAt                      │
                   └───────────────────────────────┘
```

### 3.2 Models

#### Admin

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(uuid())` | Primary key, auto-generated UUID |
| `email` | `String` | `@unique` | Admin email address |
| `passwordHash` | `String` | — | bcrypt-hashed password (12 salt rounds) |
| `createdAt` | `DateTime` | `@default(now())` | Record creation timestamp |

#### Room

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(uuid())` | Primary key, auto-generated UUID |
| `name` | `String` | `@unique` | Room name (unique identifier) |
| `location` | `String?` | Optional | Physical location description |
| `capacity` | `Int?` | Optional | Maximum seating capacity |
| `isActive` | `Boolean` | `@default(true)` | Whether room accepts bookings |
| `qrCodeUrl` | `String?` | Optional | Path to generated QR code image |
| `qrToken` | `String?` | `@unique` | Unique token embedded in QR code |
| `createdAt` | `DateTime` | `@default(now())` | Record creation timestamp |
| `bookings` | `Booking[]` | Relation | One-to-many relation to Booking |

#### Department

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(uuid())` | Primary key, auto-generated UUID |
| `name` | `String` | `@unique` | Department name (unique) |
| `isActive` | `Boolean` | `@default(true)` | Whether department is active |
| `createdAt` | `DateTime` | `@default(now())` | Record creation timestamp |
| `bookings` | `Booking[]` | Relation | One-to-many relation to Booking |

#### Booking

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(uuid())` | Primary key, auto-generated UUID |
| `roomId` | `String` | FK → `Room.id` | Reference to the booked room |
| `room` | `Room` | `@relation` | Room relation |
| `firstName` | `String` | — | Booker's first name |
| `lastName` | `String` | — | Booker's last name |
| `date` | `DateTime` | — | Booking date |
| `startTime` | `DateTime` | — | Booking start time |
| `endTime` | `DateTime` | — | Booking end time |
| `status` | `BookingStatus` | `@default(ACTIVE)` | Booking status enum |
| `createdAt` | `DateTime` | `@default(now())` | Record creation timestamp |
| `departmentId` | `String?` | FK → `Department.id`, Optional | Reference to department |
| `department` | `Department?` | `@relation` | Department relation (optional) |

### 3.3 Enums

#### BookingStatus

| Value | Description |
|-------|-------------|
| `ACTIVE` | Booking is currently active and upcoming |
| `COMPLETED` | Booking time has passed or manually completed |
| `CANCELLED` | Booking was cancelled by admin or overridden |

### 3.4 Relationships

| Relationship | Type | Description |
|---|---|---|
| `Room` → `Booking` | One-to-Many | A room can have many bookings |
| `Department` → `Booking` | One-to-Many (Optional) | A department can have many bookings; `departmentId` is optional |
| `Admin` | Standalone | No direct relation to other models; used only for authentication |

---

## 4. API Endpoints

### Standard Response Format

All endpoints return responses in a consistent JSON format:

**Success Response:**
```json
{
  "success": true,
  "message": "Descriptive success message",
  "data": { }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Descriptive error message",
  "statusCode": 400
}
```

**Validation Error Response (Zod):**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": ["field.path: Error message"],
  "statusCode": 400
}
```

---

### 4.1 Auth Module

**Base Path:** `/api/auth`

All auth endpoints are **public** (no authentication required).

---

#### `POST /api/auth/register`

Register a new admin account. Requires a secret key for security.

| Item | Detail |
|------|--------|
| **Auth** | 🔓 Public (but requires `ADMIN_SECRET_KEY`) |
| **Status** | `201 Created` |

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "securePassword123",
  "secretKey": "your-admin-secret-key-here"
}
```

**Success Response `201`:**
```json
{
  "success": true,
  "message": "Admin registered successfully",
  "data": {
    "id": "uuid",
    "email": "admin@example.com",
    "createdAt": "2026-02-26T12:00:00.000Z"
  }
}
```

**Business Logic:**
1. Validates that `secretKey` matches `ADMIN_SECRET_KEY` env variable → `403` if invalid
2. Checks if admin with this email already exists → `409` if duplicate
3. Hashes password with bcrypt (12 salt rounds)
4. Creates admin record in database
5. Returns admin info (**without** password hash)

---

#### `POST /api/auth/login`

Authenticate and receive JWT tokens.

| Item | Detail |
|------|--------|
| **Auth** | 🔓 Public |
| **Status** | `200 OK` |

**Request Body:**
```json
{
  "email": "admin@example.com",
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
      "email": "admin@example.com"
    }
  }
}
```

**Business Logic:**
1. Finds admin by email → `401` if not found
2. Compares password with stored hash using bcrypt → `401` if invalid
3. Generates access token (expires in **15 minutes**)
4. Generates refresh token (expires in **7 days**)
5. Sets `refreshToken` as an **HttpOnly, Secure, SameSite=Strict** cookie (7-day expiry)
6. Returns both tokens and admin info in response body

---

#### `POST /api/auth/refresh`

Refresh an expired access token.

| Item | Detail |
|------|--------|
| **Auth** | 🔓 Public (requires valid refresh token) |
| **Status** | `200 OK` |

**Request Body (or Cookie):**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

> The refresh token can be provided either via the `refreshToken` cookie or in the request body.

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

**Business Logic:**
1. Reads `refreshToken` from cookies or request body → `400` if missing
2. Checks if token has been invalidated (logged out) → `401` if invalidated
3. Verifies the refresh token signature and expiry → `401` if invalid or expired
4. Generates a new access token (15 min)
5. Returns the new access token

---

#### `POST /api/auth/logout`

Invalidate a refresh token to log out.

| Item | Detail |
|------|--------|
| **Auth** | 🔓 Public (requires valid refresh token) |
| **Status** | `200 OK` |

**Request Body (or Cookie):**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

**Business Logic:**
1. Reads `refreshToken` from cookies or request body → `400` if missing
2. Adds the token to an in-memory invalidation set
3. Clears the `refreshToken` cookie
4. Returns success message

> ⚠️ **Note:** Token invalidation uses an in-memory `Set`. This means invalidated tokens are lost on server restart.

---

### 4.2 Rooms Module

**Base Path:** `/api/rooms`

All room endpoints require **admin authentication** (`authMiddleware` + `adminOnly` applied to entire router).

---

#### `POST /api/rooms`

Create a new room.

| Item | Detail |
|------|--------|
| **Auth** | 🔒 Admin Only |
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
|-------|------|----------|------------|
| `name` | `string` | ✅ Yes | 1–100 characters |
| `location` | `string` | ❌ No | Max 200 characters |
| `capacity` | `number` | ❌ No | Positive integer |
| `isActive` | `boolean` | ❌ No | Default: `true` |

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
    "createdAt": "2026-02-26T12:00:00.000Z"
  }
}
```

---

#### `GET /api/rooms`

Get all rooms.

| Item | Detail |
|------|--------|
| **Auth** | 🔒 Admin Only |
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
      "qrToken": "uuid-token",
      "createdAt": "2026-02-26T12:00:00.000Z"
    }
  ]
}
```

**Business Logic:** Returns all rooms ordered by `createdAt` descending (newest first).

---

#### `GET /api/rooms/:id`

Get a single room by ID, including its **active** bookings.

| Item | Detail |
|------|--------|
| **Auth** | 🔒 Admin Only |
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
    "qrToken": "uuid-token",
    "createdAt": "2026-02-26T12:00:00.000Z",
    "bookings": [
      {
        "id": "booking-uuid",
        "roomId": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "date": "2026-02-27T00:00:00.000Z",
        "startTime": "2026-02-27T09:00:00.000Z",
        "endTime": "2026-02-27T10:00:00.000Z",
        "status": "ACTIVE",
        "createdAt": "2026-02-26T12:00:00.000Z",
        "departmentId": null
      }
    ]
  }
}
```

**Business Logic:** Includes only `ACTIVE` bookings, ordered by `startTime` ascending.

---

#### `PATCH /api/rooms/:id`

Update a room's details.

| Item | Detail |
|------|--------|
| **Auth** | 🔒 Admin Only |
| **Validation** | Zod `updateRoomSchema` |
| **Status** | `200 OK` |

**Request Body (partial update):**
```json
{
  "name": "Updated Room Name",
  "location": "New Location",
  "capacity": 30,
  "isActive": false
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | `string` | ❌ No | 1–100 characters |
| `location` | `string \| null` | ❌ No | Max 200 characters, nullable |
| `capacity` | `number \| null` | ❌ No | Positive integer, nullable |
| `isActive` | `boolean` | ❌ No | — |

---

#### `DELETE /api/rooms/:id`

Delete a room permanently.

| Item | Detail |
|------|--------|
| **Auth** | 🔒 Admin Only |
| **Status** | `200 OK` |

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Room deleted successfully",
  "data": null
}
```

> ⚠️ This will fail if the room has existing bookings (foreign key constraint).

---

#### `PATCH /api/rooms/:id/toggle-active`

Toggle a room's `isActive` status.

| Item | Detail |
|------|--------|
| **Auth** | 🔒 Admin Only |
| **Status** | `200 OK` |

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Room activated successfully",
  "data": {
    "id": "uuid",
    "name": "Conference Room A",
    "isActive": true,
    "..."
  }
}
```

**Business Logic:** Reads the room's current `isActive` value and flips it to the opposite.

---

### 4.3 Departments Module

**Base Path:** `/api/departments`

---

#### `POST /api/departments`

Create a new department.

| Item | Detail |
|------|--------|
| **Auth** | 🔒 Admin Only |
| **Status** | `201 Created` |

**Request Body:**
```json
{
  "name": "Engineering"
}
```

**Business Logic:**
1. Checks if department with the same name exists → `409` if duplicate
2. Creates the department and returns it

---

#### `GET /api/departments`

Get all departments.

| Item | Detail |
|------|--------|
| **Auth** | 🔓 Public |
| **Status** | `200 OK` |

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `onlyActive` | `string` | ❌ No | Set to `"true"` to filter only active departments |

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
      "createdAt": "2026-02-26T12:00:00.000Z"
    }
  ]
}
```

**Business Logic:** Returns departments ordered by `createdAt` descending. If `onlyActive=true`, filters to only active departments.

---

#### `GET /api/departments/:id`

Get a single department by ID.

| Item | Detail |
|------|--------|
| **Auth** | 🔒 Admin Only |
| **Status** | `200 OK` |

---

#### `PATCH /api/departments/:id`

Update a department.

| Item | Detail |
|------|--------|
| **Auth** | 🔒 Admin Only |
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
2. If `name` is being changed, checks for duplicate name → `409` if conflict (excludes self)
3. Updates and returns the department

---

#### `DELETE /api/departments/:id`

Delete a department permanently.

| Item | Detail |
|------|--------|
| **Auth** | 🔒 Admin Only |
| **Status** | `200 OK` |

> ⚠️ This will fail if the department has existing bookings (foreign key constraint).

---

### 4.4 Bookings Module

**Base Path:** `/api/bookings`

This module has both **public** (no auth) and **admin-only** (auth required) endpoints.

---

#### `GET /api/bookings/room-by-token`

Look up a room by its QR token. Used by the frontend when a user scans a QR code.

| Item | Detail |
|------|--------|
| **Auth** | 🔓 Public |
| **Status** | `200 OK` |

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | `string` | ✅ Yes | The QR token (UUID) from the scanned QR code |

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
    "isActive": true
  }
}
```

**Business Logic:** Finds a room by its unique `qrToken` field → `404` if no room matches.

---

#### `POST /api/bookings`

Create a new booking (public — via QR code scan).

| Item | Detail |
|------|--------|
| **Auth** | 🔓 Public |
| **Validation** | Zod `createBookingSchema` |
| **Status** | `201 Created` |

**Request Body:**
```json
{
  "token": "qr-token-uuid",
  "firstName": "John",
  "lastName": "Doe",
  "departmentId": "department-uuid",
  "date": "2026-02-27T00:00:00.000Z",
  "startTime": "2026-02-27T09:00:00.000Z",
  "endTime": "2026-02-27T10:00:00.000Z"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `token` | `string` | ✅ Yes | Valid UUID (QR token) |
| `firstName` | `string` | ✅ Yes | 1–100 characters |
| `lastName` | `string` | ✅ Yes | 1–100 characters |
| `departmentId` | `string` | ❌ No | Valid UUID |
| `date` | `string` | ✅ Yes | ISO 8601 date format |
| `startTime` | `string` | ✅ Yes | ISO 8601 datetime, must be before `endTime` |
| `endTime` | `string` | ✅ Yes | ISO 8601 datetime, must be after `startTime` |

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
    "date": "2026-02-27T00:00:00.000Z",
    "startTime": "2026-02-27T09:00:00.000Z",
    "endTime": "2026-02-27T10:00:00.000Z",
    "status": "ACTIVE",
    "createdAt": "...",
    "departmentId": "department-uuid",
    "room": { "id": "...", "name": "Conference Room A", "location": "..." },
    "department": { "id": "...", "name": "Engineering" }
  }
}
```

**Business Logic:**
1. Finds room by QR token → `404` if not found
2. Checks room is active → `403` if inactive
3. Checks for overlapping **ACTIVE** bookings on the same room, same date, and overlapping time range → `409` if conflict exists
4. Creates the booking with status `ACTIVE`
5. Returns booking with room and department info included

---

#### `POST /api/bookings/admin-create`

Create a booking as an admin with override capability.

| Item | Detail |
|------|--------|
| **Auth** | 🔒 Admin Only |
| **Validation** | Zod `adminCreateBookingSchema` |
| **Status** | `201 Created` or `409 Conflict` |

**Request Body:**
```json
{
  "roomId": "room-uuid",
  "firstName": "Jane",
  "lastName": "Smith",
  "departmentId": "department-uuid",
  "date": "2026-02-27T00:00:00.000Z",
  "startTime": "2026-02-27T09:00:00.000Z",
  "endTime": "2026-02-27T10:00:00.000Z",
  "forceOverride": false
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `roomId` | `string` | ✅ Yes | Valid UUID |
| `firstName` | `string` | ✅ Yes | 1–100 characters |
| `lastName` | `string` | ✅ Yes | 1–100 characters |
| `departmentId` | `string` | ❌ No | Valid UUID |
| `date` | `string` | ✅ Yes | ISO 8601 |
| `startTime` | `string` | ✅ Yes | ISO 8601, must be before `endTime` |
| `endTime` | `string` | ✅ Yes | ISO 8601, must be after `startTime` |
| `forceOverride` | `boolean` | ❌ No | Default: `false`. If `true`, cancels conflicting bookings |

**Conflict Response `409` (when `forceOverride = false` and conflict exists):**
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
      "startTime": "2026-02-27T09:00:00.000Z",
      "endTime": "2026-02-27T10:00:00.000Z",
      "department": { "name": "Engineering" }
    }
  }
}
```

**Success Response `201` (when no conflict, or `forceOverride = true`):**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": { "..." }
}
```

**Business Logic (see [Section 5.2](#52-admin-override-booking-forceoverride) for detail):**
1. Finds room by `roomId` → `404` if not found
2. Checks room is active → `403` if inactive
3. Finds all overlapping ACTIVE bookings
4. If conflict exists and `forceOverride = false` → returns `409` with existing booking details
5. If conflict exists and `forceOverride = true` → cancels all overlapping bookings (sets status to `CANCELLED`)
6. Creates the new booking and returns it

---

#### `GET /api/bookings`

Get all bookings with optional filters.

| Item | Detail |
|------|--------|
| **Auth** | 🔒 Admin Only |
| **Status** | `200 OK` |

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `roomId` | `string` | ❌ No | Filter by room UUID |
| `date` | `string` | ❌ No | Filter by exact date (ISO 8601) |
| `status` | `string` | ❌ No | Filter by status: `ACTIVE`, `COMPLETED`, or `CANCELLED` |

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Bookings fetched successfully",
  "data": [
    {
      "id": "booking-uuid",
      "roomId": "room-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "date": "...",
      "startTime": "...",
      "endTime": "...",
      "status": "ACTIVE",
      "createdAt": "...",
      "departmentId": "...",
      "room": { "id": "...", "name": "...", "location": "..." },
      "department": { "id": "...", "name": "..." }
    }
  ]
}
```

**Business Logic:**
1. **Before fetching:** auto-completes any ACTIVE bookings whose `endTime < now` (sets to `COMPLETED`)
2. Applies optional filters (roomId, date, status)
3. Returns bookings ordered by `createdAt` descending, including room and department info

---

#### `GET /api/bookings/stats`

Get dashboard statistics.

| Item | Detail |
|------|--------|
| **Auth** | 🔒 Admin Only |
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

**Business Logic:**
1. Auto-completes expired ACTIVE bookings before counting
2. Returns counts for: total rooms, active bookings, completed bookings, inactive rooms

---

#### `GET /api/bookings/recent`

Get the most recent bookings.

| Item | Detail |
|------|--------|
| **Auth** | 🔒 Admin Only |
| **Status** | `200 OK` |

**Query Parameters:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `limit` | `number` | ❌ No | `5` | Number of recent bookings to return |

**Business Logic:**
1. Auto-completes expired ACTIVE bookings
2. Returns the N most recent bookings (by `createdAt` desc) with room name and department info

---

#### `PATCH /api/bookings/:id/complete`

Manually mark a booking as completed.

| Item | Detail |
|------|--------|
| **Auth** | 🔒 Admin Only |
| **Status** | `200 OK` |

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Booking completed successfully",
  "data": {
    "id": "...",
    "status": "COMPLETED",
    "room": { "id": "...", "name": "...", "location": "..." },
    "..."
  }
}
```

---

#### `DELETE /api/bookings/:id`

Cancel a booking (sets status to `CANCELLED`, does not delete the record).

| Item | Detail |
|------|--------|
| **Auth** | 🔒 Admin Only |
| **Status** | `200 OK` |

**Success Response `200`:**
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "data": {
    "id": "...",
    "status": "CANCELLED",
    "room": { "id": "...", "name": "...", "location": "..." },
    "..."
  }
}
```

**Business Logic:** This is a **soft delete** — the booking record is preserved with status changed to `CANCELLED`.

---

### 4.5 QR Module

**Base Path:** `/api/qr`

---

#### `POST /api/qr/generate/:roomId`

Generate a QR code for a room.

| Item | Detail |
|------|--------|
| **Auth** | 🔒 Admin Only |
| **Status** | `201 Created` |

**URL Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `roomId` | `string` | UUID of the room to generate QR for |

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

**Business Logic (see [Section 5.4](#54-qr-token-generation-flow) for detail):**
1. Finds room by ID → `404` if not found
2. Generates a random UUID as the QR token
3. Constructs the booking URL: `{FRONTEND_URL}/book?token={qrToken}`
4. Creates `public/qrcodes/` directory if it doesn't exist
5. Generates a 400×400px PNG QR code image and saves it as `public/qrcodes/{roomId}.png`
6. Updates the room record with `qrCodeUrl` and `qrToken`
7. Returns the image URL, booking URL, and token

> ⚠️ **Note:** Regenerating a QR code for a room replaces the previous token, invalidating any previously printed QR codes for that room.

---

#### `GET /api/qr/image/:roomId`

Retrieve the QR code image file for a room.

| Item | Detail |
|------|--------|
| **Auth** | 🔓 Public |
| **Content-Type** | `image/png` |

**URL Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `roomId` | `string` | UUID of the room |

**Response:** Sends the QR code PNG file directly (not JSON).

**Error Cases:**
- `404` — Room not found
- `404` — QR code image not yet generated

---

## 5. Business Logic

### 5.1 Booking Conflict Detection

The system prevents double-bookings by checking for time overlaps. Only **ACTIVE** bookings are considered (completed and cancelled bookings are ignored).

**Overlap Detection Algorithm:**

```
Conflict exists when:
  Same Room AND
  Same Date AND
  Existing booking startTime < New booking endTime AND
  Existing booking endTime > New booking startTime
```

**Prisma Query:**
```typescript
const overlapping = await prisma.booking.findFirst({
  where: {
    roomId: room.id,
    status: BookingStatus.ACTIVE,
    date: bookingDate,
    startTime: { lt: endTime },   // existing starts before new ends
    endTime: { gt: startTime },   // existing ends after new starts
  },
});
```

**Visual Examples:**

```
Timeline:  8:00    9:00    10:00   11:00   12:00
           ├───────┼───────┼───────┼───────┤

Case 1: CONFLICT ❌
Existing:  [██████████████████]          (9:00 – 11:00)
New:              [████████████████]     (10:00 – 12:00)

Case 2: CONFLICT ❌
Existing:  [██████████████████]          (9:00 – 11:00)
New:       [████████]                    (9:00 – 10:00)

Case 3: NO CONFLICT ✅
Existing:  [██████████████████]          (9:00 – 11:00)
New:                           [████████] (11:00 – 12:00)

Case 4: NO CONFLICT ✅
Existing:         [████████████████]     (10:00 – 12:00)
New:       [██████]                      (8:00 – 10:00)
```

---

### 5.2 Admin Override Booking (forceOverride)

The admin booking endpoint (`POST /api/bookings/admin-create`) supports a **two-step conflict resolution** flow:

```
┌──────────────────────────────────────────────────────────┐
│  Step 1: Admin submits booking (forceOverride = false)   │
│                                                          │
│  ┌─ No conflict → Booking created ✅                     │
│  └─ Conflict found → Returns 409 with existing booking  │
│                        details for admin to review       │
│                                                          │
│  Step 2: Admin confirms override (forceOverride = true)  │
│                                                          │
│  ┌─ All overlapping ACTIVE bookings are CANCELLED        │
│  └─ New booking is created ✅                            │
└──────────────────────────────────────────────────────────┘
```

**Key Difference from Public Booking:**
- Public booking: simply returns `409` error on conflict (no override option)
- Admin booking: returns conflict details and allows force-override to cancel existing bookings

---

### 5.3 Auto-Complete Past Bookings (Cron Job)

The system has **two mechanisms** to auto-complete past bookings:

#### Mechanism 1: Cron Job (Midnight)

Configured in `server.ts` using `node-cron`:

```
Schedule: 0 0 * * * (every day at midnight)
```

Updates all ACTIVE bookings where `endTime < now` to `COMPLETED`.

#### Mechanism 2: On-Demand (Before Data Reads)

The following service methods auto-complete expired bookings before returning data:
- `getAllBookings()` — ensures accurate status when admin views all bookings
- `getStats()` — ensures accurate statistics
- `getRecentBookings()` — ensures accurate recent bookings list

This dual approach ensures data is always up-to-date regardless of when the cron job last ran.

---

### 5.4 QR Token Generation Flow

```
┌────────────────────────────────────────────────────────────┐
│  1. Admin calls POST /api/qr/generate/:roomId              │
│                                                            │
│  2. System generates random UUID token                     │
│     └─ crypto.randomUUID()                                 │
│                                                            │
│  3. Constructs booking URL                                 │
│     └─ {FRONTEND_URL}/book?token={qrToken}                 │
│                                                            │
│  4. Generates QR code PNG image (400x400px)                │
│     └─ Saved to: public/qrcodes/{roomId}.png               │
│                                                            │
│  5. Updates Room record in database                        │
│     ├─ qrCodeUrl = /public/qrcodes/{roomId}.png            │
│     └─ qrToken = generated UUID                            │
│                                                            │
│  6. Returns: qrImageUrl, bookingUrl, qrToken               │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  User Flow (after QR is generated and printed):            │
│                                                            │
│  1. User scans QR code at room entrance                    │
│  2. Opens: https://yourdomain.com/book?token=qr-token      │
│  3. Frontend calls GET /api/bookings/room-by-token?token=  │
│  4. Gets room info → shows booking form                    │
│  5. User fills form → POST /api/bookings                   │
│  6. Booking created ✅                                     │
└────────────────────────────────────────────────────────────┘
```

---

## 6. Environment Variables

Create a `.env` file in the project root. Reference: `.env.example`

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ Yes | — | PostgreSQL connection string. Format: `postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?schema=public` |
| `JWT_ACCESS_SECRET` | ✅ Yes | `"default-access-secret"` | Secret key for signing JWT access tokens. Use a strong random string in production |
| `JWT_REFRESH_SECRET` | ✅ Yes | `"default-refresh-secret"` | Secret key for signing JWT refresh tokens. Use a strong random string in production |
| `PORT` | ❌ No | `3000` | Port number the server listens on |
| `FRONTEND_URL` | ✅ Yes | `"http://localhost:5173"` | Frontend application URL. Used for CORS config and QR code booking URL generation |
| `ADMIN_SECRET_KEY` | ✅ Yes | — | Secret key required during admin registration to prevent unauthorized account creation |
| `NODE_ENV` | ❌ No | — | Set to `"production"` to enable secure (HTTPS-only) cookies for refresh tokens |

**Example `.env` file:**

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/room_booking?schema=public"

# JWT Secrets
JWT_ACCESS_SECRET="your-access-secret-key-here"
JWT_REFRESH_SECRET="your-refresh-secret-key-here"

# Server
PORT=3000

# Frontend URL (used in QR code generation and CORS)
FRONTEND_URL="https://yourdomain.com"

# Admin Registration Secret Key
ADMIN_SECRET_KEY="your-admin-secret-key-here"
```

---

## 7. Setup & Deployment

### 7.1 Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **PostgreSQL** ≥ 14.x
- **TypeScript** ≥ 5.x (installed as devDependency)

### 7.2 Local Development Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd room-booking

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env
# Edit .env with your database credentials and secrets

# 4. Generate Prisma client
npx prisma generate

# 5. Push schema to database (creates tables)
npx prisma db push

# 6. Start development server (with hot-reload)
npm run dev
```

The server will start at `http://localhost:3000` (or your configured `PORT`).

**Verify it's running:**
```bash
curl http://localhost:3000/api/health
# Response: { "success": true, "message": "Server is running", "data": null }
```

### 7.3 Available NPM Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev` | `nodemon --exec ts-node src/server.ts` | Start dev server with hot-reload |
| `npm run build` | `tsc` | Compile TypeScript to JavaScript (`dist/`) |
| `npm start` | `node dist/server.js` | Start production server from compiled code |
| `npm run prisma:generate` | `prisma generate` | Regenerate Prisma client after schema changes |
| `npm run prisma:push` | `prisma db push` | Push schema changes to database |
| `npm run prisma:studio` | `prisma studio` | Open Prisma Studio GUI for database browsing |

### 7.4 Linux Server Deployment

#### Step 1: Prepare the Server

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+ (using NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Verify installations
node -v    # should be ≥ 18.x
npm -v     # should be ≥ 9.x
psql --version
```

#### Step 2: Configure PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE room_booking;
CREATE USER room_user WITH ENCRYPTED PASSWORD 'your-strong-password';
GRANT ALL PRIVILEGES ON DATABASE room_booking TO room_user;
\q
```

#### Step 3: Deploy the Application

```bash
# Clone the repository
git clone <repository-url> /opt/room-booking
cd /opt/room-booking

# Install production dependencies
npm install

# Create and configure .env
cp .env.example .env
nano .env  # Edit with production values

# Generate Prisma client and push schema
npx prisma generate
npx prisma db push

# Build the TypeScript project
npm run build

# Test that it starts correctly
npm start
```

#### Step 4: Create a systemd Service

```bash
sudo nano /etc/systemd/system/room-booking.service
```

```ini
[Unit]
Description=Room Booking API Server
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
# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable room-booking
sudo systemctl start room-booking

# Check status
sudo systemctl status room-booking

# View logs
sudo journalctl -u room-booking -f
```

#### Step 5: Set Up Nginx Reverse Proxy

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/room-booking
```

```nginx
server {
    listen 80;
    server_name yourdomain.com;

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
# Enable the site
sudo ln -s /etc/nginx/sites-available/room-booking /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 6: SSL Certificate (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

#### Step 7: Ensure `public/qrcodes/` Directory

```bash
mkdir -p /opt/room-booking/public/qrcodes
chown www-data:www-data /opt/room-booking/public/qrcodes
```

---

## Appendix

### A. Authentication Flow Diagram

```
┌──────────┐     POST /auth/register         ┌──────────────┐
│  Admin   │  ─────────────────────────────►  │   Database   │
│ (Client) │  (email, password, secretKey)    │  (Admin tbl) │
└──────────┘                                  └──────────────┘
      │
      │  POST /auth/login
      │  (email, password)
      ▼
┌──────────────┐    Access Token (15 min)     ┌──────────────┐
│  Auth Service│  ─────────────────────────►  │   Client     │
│              │    Refresh Token (7 days)     │  (stored)    │
│              │   + HttpOnly Cookie           │              │
└──────────────┘                              └──────────────┘
      │                                              │
      │  POST /auth/refresh                          │
      │  (refreshToken cookie/body)                  │
      ▼                                              │
┌──────────────┐    New Access Token          ┌──────┴───────┐
│  Auth Service│  ─────────────────────────►  │   Client     │
└──────────────┘                              └──────────────┘
```

### B. Middleware Stack

| Middleware | File | Applied To | Purpose |
|------------|------|------------|---------|
| `cors` | Built-in | Global | CORS with frontend URL, credentials enabled |
| `express.json()` | Built-in | Global | Parse JSON request bodies |
| `express.urlencoded()` | Built-in | Global | Parse URL-encoded bodies |
| `cookieParser` | Built-in | Global | Parse cookies (for refresh token) |
| `express.static` | Built-in | `/public` path | Serve static files (QR code images) |
| `authMiddleware` | `auth.middleware.ts` | Protected routes | Verify JWT access token from `Authorization: Bearer <token>` header |
| `adminOnly` | `role.middleware.ts` | Admin routes | Verify `req.admin` exists (set by authMiddleware) |
| `errorMiddleware` | `error.middleware.ts` | Global (last) | Catch and format all errors |

### C. Error Status Codes Reference

| Code | Meaning | When Used |
|------|---------|-----------|
| `400` | Bad Request | Missing required fields, validation errors |
| `401` | Unauthorized | Invalid/expired JWT, wrong email/password |
| `403` | Forbidden | Invalid admin secret key, room inactive, admin access required |
| `404` | Not Found | Room/booking/department/QR not found |
| `409` | Conflict | Duplicate email/room name/department name, booking time slot conflict |
| `500` | Internal Server Error | Unhandled errors |

---

*Documentation generated on 2026-02-26. Based on source code analysis of room-booking v1.0.0.*
