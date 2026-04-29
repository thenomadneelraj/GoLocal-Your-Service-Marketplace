# GoLocal — Codebase Overview (Production Architecture & Workflow)

## Summary

GoLocal is a role-driven marketplace that connects **clients** with **providers** for service bookings, with **admin-only governance** (user approval, platform settings, dispute and financial oversight). The backend is an Express + Mongoose API that enforces marketplace invariants—especially approval gating and booking state transitions—while real-time updates are delivered through a separate Socket.IO microservice (`web-socket/`). The frontend is a Vite + React SPA that supports **mock + real coexistence** by routing non-admin API calls through a mock-aware axios wrapper and by disabling “real booking” UI flows for mock providers.

## Architecture

**Primary architectural style:** layered web API (Express routers → controllers → Mongoose models/utilities) + event-driven realtime updates via a Socket.IO microservice.

### Major subsystems

1. **Backend API (server/**
   - Auth: JWT-based (`server/src/middleware/auth.js` + `server/src/controllers/authController.js`)
   - Marketplace: providers, services, bookings, transactions, disputes, messages, notifications
   - Admin: admin workspace endpoints (dashboard, approvals, settings, exports, security)
2. **Realtime microservice (web-socket/**
   - Socket.IO server that manages rooms and online presence
   - HTTP `/emit` bridge used by the backend to broadcast events
3. **Frontend SPA (client/**
   - React Router-based role shells for client/provider/admin dashboards
   - Axios wrapper that decides between real backend and mock API

### Technology stack

- Backend: Node.js (CommonJS), Express 5, Mongoose 9, JWT, socket.io (server-side only in microservice)
- Frontend: React 18, Vite, React Router, Axios, socket.io-client
- Realtime: Socket.IO over WebSocket/long-polling; HTTP bridge for emits

### Execution start (backend)

1. `server/src/server.js` loads env, tries to connect to MongoDB, bootstraps admin user, ensures verification upload directory, then starts `server/src/app.js`.
2. `server/src/app.js` mounts route groups:
   - `/api/auth`, `/api/admin`, `/api/public`, `/api/providers`, `/api/services`, `/api/bookings`, `/api/clients`, `/api/disputes`, `/api/messages`, `/api/notifications`, `/api/transactions`.

## Directory Structure

```txt
project-root/
├── server/                      # Express + Mongoose backend
│   └── src/
│       ├── app.js              # Express app + route mounting
│       ├── server.js           # Bootstrapping + startup
│       ├── controllers/       # Request handlers
│       ├── routes/            # Express route definitions
│       ├── middleware/        # JWT auth, approval/access gating, maintenance
│       ├── models/           # Mongoose schemas (User, Booking, Transaction, ...)
│       ├── services/         # Platform settings, notifications, admin bootstrap, etc.
│       └── utils/            # Domain helpers (booking status, payment breakdown, socket events)
│
├── web-socket/                  # Socket.IO microservice
│   └── src/
│       ├── server.js          # Socket server + HTTP /emit bridge
│       └── auth.js            # Socket JWT auth middleware
│
└── client/                      # Vite + React SPA
    └── src/
        ├── App.jsx            # Route tree + protected role shells
        ├── lib/               # API wrappers, access helpers
        ├── components/       # Role workspaces and UI components
        └── mock/             # Mock DB + mock API layer + mock websocket simulation
```

## Key Abstractions

### 1) JWT Authentication Middleware

- **File**: `server/src/middleware/auth.js`
- **Responsibility**: Validates `Authorization: Bearer <jwt>` and attaches `req.user` (Mongoose user document without password) to the request.
- **Interface**:
  - `authenticate(req,res,next)`: required JWT
  - `optionalAuth(req,res,next)`: attempts JWT, but doesn’t fail
  - `authorize(...roles)`: role authorization using `req.user.role`
- **Lifecycle**: Called per request in protected routes.

**Used by**: `server/src/routes/*` route guards, including admin and marketplace routes.

---

### 2) Approval / Access Gating

- **File**: `server/src/middleware/accountAccess.js`
- **Responsibility**: Converts persisted user fields (`status`, `approvalStatus`, `isActive`) into a derived access model used by booking and other actions.
- **Interface**:
  - `buildAccountAccessState(user)`: produces:
    - `restricted`, `pendingApproval`, `approvalStatus`, `canCreateBookings`, `canRespondToBookings`
  - `attachAccountAccessState(req,res,next)`: sets `req.accountAccess`
  - `enforceAccountAccess(req,res,next)`: blocks restricted accounts (403)
- **Important behavior**:
  - **ADMIN bypasses restrictions** (always unrestricted in this layer).
  - **Clients/Providers require approval** (`pending` blocks booking creation/acceptance).
  - **Disabled/suspended/rejected** states fully restrict booking actions.

**Used by**: `server/src/routes/booking.js`, `server/src/routes/transaction.js`, provider stats endpoints, dispute/message/notification routes.

---

### 3) Platform Maintenance Gate

- **File**: `server/src/middleware/maintenance.js`
- **Responsibility**: Blocks client/provider access when `maintenanceMode` is enabled.
- **Interface**:
  - `enforceMaintenanceMode(req,res,next)` returns HTTP 503 for non-admin users.

**Used by**: Most marketplace/admin routes.

---

### 4) Booking Domain Model + State Machine

- **File**: `server/src/models/Booking.js` and `server/src/utils/bookingStatus.js`
- **Responsibility**:
  - Stores booking request including a **selectedServices snapshot** (multi-service support).
  - Enforces booking status normalization and status transitions via controller logic.
- **Interface / key fields**:
  - `selectedServices[]`: each item stores `title/category/price/duration/locationType`
  - `status`: `pending_payment | pending | accepted | rejected | completed | cancelled`
  - `paymentStatus`: `pending | paid | failed`
  - `paymentMethod`: `upi | cod`
- **Normalization helpers**:
  - `normalizeBookingStatus` maps legacy aliases like `confirmed -> accepted`.

**Used by**: booking controller for creation, payment confirmation, status updates, reviews, and disputes.

---

### 5) Transaction + Fee Breakdown Snapshot

- **File**: `server/src/models/Transaction.js`, `server/src/utils/payment.js`, `server/src/controllers/bookingController.js`
- **Responsibility**:
  - Captures pricing and fees at the time of booking completion/payment confirmation using `serviceSnapshot` and payment snapshots.
- **Interface / key fields**:
  - `serviceSnapshot`: stores multi-service breakdown at creation
  - `clientPaymentSnapshot`, `providerPaymentSnapshot`: bank/upi snapshots
  - `status`: stored via `toTransactionPersistenceStatus`
  - `paymentMethod`: persisted as normalized `upi | cod`
- **Fee logic**:
  - `calculateTransactionBreakdown()` computes client/platform/provider fees and net to provider.

**Used by**: booking payment confirmation and admin/provider finance reporting.

---

### 6) Realtime Socket Event Emitter Bridge

- **File**: `server/src/utils/socketEvents.js`
- **Responsibility**: Sends events to the websocket microservice by HTTP POST to `/emit`.
- **Interface**:
  - `emitSocketEvent({ userIds, bookingIds, rooms, room, eventName, payload })`
  - Supports legacy event aliases for backward compatibility.
- **Behavior**:
  - Events are best-effort: errors are logged, not thrown.

**Used by**: booking/message/notification/dispute flows in controllers.

---

### 7) Socket.IO Microservice Room Model

- **File**: `web-socket/src/server.js`
- **Responsibility**:
  - Authenticates sockets via JWT (`io.use(authenticateSocket)`).
  - Joins sockets into rooms:
    - per-user room: `user_<id>`
    - per-role room: `role_<role>`
    - per-notification room: `notifications_<userId>`
    - per-booking room: `booking_<bookingScope>`
  - Exposes HTTP `/emit` to broadcast events to rooms.

**Used by**: backend’s `/emit` bridge and frontend socket subscriptions.

---

### 8) Mock + Real Coexistence (Frontend)

- **File**: `client/src/lib/api.js`, `client/src/mock/mockApi.js`, `client/src/lib/dataLayering.js`
- **Responsibility**:
  - Determines mock usage (`VITE_USE_MOCK_API` or no `VITE_API_URL`).
  - Avoids mock for **admin endpoints** (explicit admin request detection).
  - Provides a “data layering” model to merge real + mock records and label mock origin.
- **Important UI behavior**:
  - Provider profile and cards treat `provider.isMock` specially (disable booking/messaging for mock providers).

---

## Data Flow

### A) Client booking workflow (draft → payment → provider request)

1. **Client browses providers**
   - `GET /api/providers` (real backend) or mock layer equivalents in `client/src/lib/api.js`.
2. **Client opens provider profile**
   - `GET /api/providers/:id`
3. **Client creates booking draft**
   - `POST /api/bookings`
   - `bookingController.createBooking()`:
     - blocks if `req.accountAccess.restricted` (middleware layer)
     - requires client approval (`isUserApproved(client)`)
     - checks provider availability:
       - account active + provider approval + availability flag + address matching
       - conflicts by `providerId + bookingDate + timeSlot`
     - resolves multi-service snapshot using `Service` records
     - creates `Booking` with:
       - `selectedServices[]` snapshot
       - `status = pending_payment`
       - `paymentMethod` defaults to `"upi"` for the draft
4. **Client confirms payment / sends request**
   - `PATCH /api/bookings/:id/payment`
   - `bookingController.confirmBookingPayment()`:
     - validates requester is booking client
     - re-checks approval and provider availability
     - prevents duplicate transaction records (`Transaction.findOne({ bookingId })`)
     - updates booking:
       - `status = pending`
       - `paymentMethod` = normalized `upi | cod`
       - `paymentStatus` = `paid` for UPI, `pending` for COD
     - creates `Transaction` record with fees + snapshots
     - emits realtime events:
       - booking_created
       - transaction_created
       - payment_completed (only when transaction status is paid; COD remains pending)

### B) Provider accept/reject and job completion

5. **Provider updates booking status**
   - `PATCH /api/bookings/:id/status`
   - `bookingController.updateBookingStatus()`:
     - provider can only update their own bookings
     - provider cannot respond if `req.accountAccess.canRespondToBookings` is false (approval pending/rejected blocks)
     - enforces status transitions using `BOOKING_STATUS_TRANSITIONS`
     - when `COMPLETED` and `paymentMethod === "cod"`:
       - sets booking `paymentStatus = paid`
       - updates `Transaction.status = PAID`
     - sends booking_updated socket event to both sides and notifies recipients

### C) Messaging + notifications + disputes

6. **Chat threads**
   - `GET /api/messages/` lists conversations based on `Message` documents.
   - `GET /api/messages/booking/:bookingId` returns thread if user is client/provider of that booking.
   - `POST /api/messages/` creates Message and creates a Notification for the receiver.
   - `PUT /api/messages/booking/:bookingId/read` marks receiver messages as read and emits message_read.
7. **Disputes**
   - `POST /api/disputes` creates disputes with:
     - `threadKey` grouping for booking or platform support
     - notification to the target user and all admins
   - `GET /api/disputes` lists disputes and can group into threads.

## Non-Obvious Behaviors & Design Decisions

### 1) Admin is “environment bootstrapped” and not stored in mock

- **How it works**:
  - `server/src/services/adminBootstrapService.js` deletes legacy `role:"ADMIN"` records and ensures exactly one `role:"admin"` user.
  - If missing, it creates the admin user from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in environment variables.
- **Meaning**:
  - This hard aligns with “admin never stored in mock data”; the mock API layer explicitly blocks admin endpoints.

### 2) Approval gating is enforced both in middleware and controller logic

- Middleware (`accountAccess`) blocks restricted users at route level, but controllers also validate critical conditions:
  - `bookingController.createBooking()` requires `isUserApproved(client)`
  - `updateBookingStatus()` checks `req.accountAccess.canRespondToBookings`
- **Why it matters**:
  - This closes the “bypass frontend approval” edge case by relying on backend enforcement.

### 3) Booking multi-service snapshots are the source of truth for later pricing/fees

- When a booking is created, each selected service stores:
  - title, category, price, duration, locationType
- When transactions are created, `serviceSnapshot` and payment snapshots are embedded into the transaction record.
- **Meaning**:
  - Provider price/service changes after booking won’t corrupt financial records; invoices and admin reporting use snapshots.

### 4) Realtime architecture is microservice-based, but the frontend websocket connection is currently disabled

- Backend emits events via HTTP `/emit` (`server/src/utils/socketEvents.js`).
- The websocket microservice authenticates sockets and broadcasts into rooms.
- However, `client/src/components/contexts/WebSocketContext.jsx` has:
  - `connect()` and `disconnect()` that log “disabled for debugging” and never actually connect.
- **Why this is surprising**:
  - In the current code, realtime subscription hooks may not work unless debugging stubs are removed or changed.

### 5) Mock + real coexistence is implemented at the API wrapper and at the UI action level

- API wrapper:
  - chooses mock for non-admin endpoints when mock is enabled
- UI enforcement:
  - booking/messaging buttons are disabled when `provider.isMock` is true
- **Meaning**:
  - This matches the recommended “demo booking only” approach (mock providers are visible but won’t be used for real booking flows).

### 6) COD vs UPI settlement is handled by status synchronization between Booking and Transaction

- Draft payment:
  - COD sets `booking.paymentStatus = pending` (transaction status pending)
- Completion:
  - when provider marks booking `completed` and COD was chosen:
    - booking `paymentStatus` becomes `paid`
    - transaction becomes `PAID`
- **Meaning**:
  - Admin/provider earnings rely on transaction paid status, not only booking completion.

## Module Reference (Significant Files)

| File                                                  | Purpose                                                           |
| ----------------------------------------------------- | ----------------------------------------------------------------- |
| `server/src/server.js`                                | Bootstraps DB/admin and starts Express                            |
| `server/src/app.js`                                   | Route mounting for auth/admin/marketplace                         |
| `server/src/middleware/auth.js`                       | JWT auth + role authorization                                     |
| `server/src/middleware/accountAccess.js`              | Approval gating and booking action permissions                    |
| `server/src/middleware/maintenance.js`                | Maintenance mode pause for non-admin                              |
| `server/src/controllers/authController.js`            | Registration/login/profile/verification                           |
| `server/src/routes/booking.js`                        | Booking lifecycle endpoints (draft/payment/status/review/dispute) |
| `server/src/controllers/bookingController.js`         | Booking state machine + transaction creation + socket emits       |
| `server/src/controllers/providerController.js`        | Provider browsing/profile visibility and availability computation |
| `server/src/controllers/transactionController.js`     | Client transaction listing + exports + invoices                   |
| `server/src/controllers/adminWorkspaceController.js`  | Admin workspace (approvals/settings/exports/security dashboards)  |
| `server/src/utils/socketEvents.js`                    | Backend → websocket bridge                                        |
| `web-socket/src/server.js`                            | Socket.IO service + `/emit` broadcasting + room model             |
| `client/src/lib/api.js`                               | Mock-aware API wrapper that blocks admin mock                     |
| `client/src/mock/mockApi.js`                          | Mock data simulator for non-admin endpoints                       |
| `client/src/lib/dataLayering.js`                      | Merge real and mock data with origin labeling                     |
| `client/src/components/providers/ProviderProfile.jsx` | Disables booking/messaging when `isMock`                          |

## Suggested Reading Order

1. `server/src/server.js` — boot + admin bootstrap + startup sequence
2. `server/src/app.js` — route groups to understand “what APIs exist”
3. `server/src/middleware/accountAccess.js` — approval gating invariants (most important)
4. `server/src/controllers/bookingController.js` — booking/payment/status state machine + snapshots + socket emits
5. `server/src/utils/socketEvents.js` + `web-socket/src/server.js` — realtime event pipeline and room model
6. `client/src/lib/api.js` + `client/src/mock/mockApi.js` + `client/src/components/providers/ProviderProfile.jsx` — mock/real coexistence and demo booking UX constraints
7. `server/src/controllers/adminWorkspaceController.js` — admin governance + exports/financial oversight
