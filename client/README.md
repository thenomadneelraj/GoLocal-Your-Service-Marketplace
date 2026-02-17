# 🌍 GoLocal – Complete System Explained (With Admin + Worker Status)

## 1️⃣ What Is GoLocal? (Final Definition)

**GoLocal** is a **3-role service marketplace platform** where:

* 👤 **Users** book services
* 🧑‍🔧 **Providers (Workers)** deliver services
* 🛡️ **Admins** control, verify, and manage the platform

It handles:

* Authentication
* Booking lifecycle
* Worker availability
* Role-based dashboards
* Admin moderation

---

## 2️⃣ Roles in the System (VERY IMPORTANT)

### 👤 USER (Customer)

A normal customer who wants work done.

Can:

* Browse services
* View providers
* Book services
* Track booking status
* Cancel bookings (if allowed)
* Leave reviews

❌ Cannot:

* Accept bookings
* Change availability
* Manage platform data

---

### 🧑‍🔧 PROVIDER / WORKER

A service professional.

Can:

* Create provider profile
* Set availability
* Accept / reject bookings
* Change work status
* Track earnings
* Complete bookings

❌ Cannot:

* Book services
* Access admin tools

---

### 🛡️ ADMIN

Platform owner / moderator.

Can:

* Approve or reject providers
* Manage users
* Manage services & categories
* View all bookings
* Ban users/providers
* Resolve disputes

❌ Cannot:

* Book services
* Act as provider

---

## 3️⃣ Worker Status System (CORE FEATURE)

Each **provider** has a **live status**.

### 🔄 Provider Status Values

| Status            | Meaning                  |
| ----------------- | ------------------------ |
| `available`       | Can accept new bookings  |
| `booking_pending` | Booking request received |
| `busy`            | Currently working        |
| `offline`         | Not accepting work       |

📌 Status changes **automatically + manually**.

---

### 🔁 Status Transition Flow

```text
available
   ↓ (booking request)
booking_pending
   ↓ (accept)
busy
   ↓ (job completed)
available
```

OR

```text
booking_pending
   ↓ (reject)
available
```

OR

```text
available
   ↓ (manual toggle)
offline
```

---

## 4️⃣ Booking Status System

Each **booking** has its own status.

| Booking Status | Description                   |
| -------------- | ----------------------------- |
| `pending`      | Waiting for provider response |
| `accepted`     | Provider accepted             |
| `rejected`     | Provider rejected             |
| `in_progress`  | Work started                  |
| `completed`    | Job finished                  |
| `cancelled`    | Cancelled by user/admin       |

---

## 5️⃣ How the Project Works – END TO END FLOW

---

## 🟢 PHASE 1: USER FLOW (From Visit to Booking)

### Step 1: User Visits Landing Page

* No login required
* Sees services
* Clicks “Book Now”

---

### Step 2: Authentication

* If not logged in → redirected to login/signup
* After login → redirected back

---

### Step 3: Browse Services

User:

* Filters services
* Selects category
* Views providers

Frontend shows:

* Provider rating
* Provider status (available/busy)

---

### Step 4: Provider Profile Page

User sees:

* Provider details
* Availability
* Current status
* Reviews

📌 If provider is `busy` → booking disabled
📌 If `available` → booking allowed

---

### Step 5: Booking Creation

User submits:

* Date
* Time
* Address

Backend:

* Creates booking with status = `pending`
* Updates provider status → `booking_pending`

---

## 🟡 PHASE 2: PROVIDER FLOW

### Step 6: Provider Receives Request

Provider dashboard shows:

* New booking request
* Booking details
* Accept / Reject buttons

---

### Step 7: Provider Action

#### If ACCEPT:

* Booking → `accepted`
* Provider → `busy`
* User notified

#### If REJECT:

* Booking → `rejected`
* Provider → `available`
* User notified

---

### Step 8: Job Execution

When provider starts work:

* Booking → `in_progress`

When job completed:

* Booking → `completed`
* Provider → `available`

---

## 🔵 PHASE 3: USER AFTER BOOKING

User dashboard:

* Sees booking status updates
* Receives notifications
* Leaves review after completion

---

## 🔴 PHASE 4: ADMIN FLOW (CONTROL CENTER)

### Admin Dashboard Capabilities

#### 👥 User Management

* View users
* Ban users
* Reset accounts

---

#### 🧑‍🔧 Provider Management

* Approve provider registration
* Disable provider
* Force status change
* View provider performance

---

#### 🧾 Booking Management

* View all bookings
* Change booking status (if dispute)
* Cancel fraudulent bookings

---

#### 🛠️ Service Management

* Add/edit/remove services
* Manage categories
* Control pricing

---

## 6️⃣ Backend Data Models (Updated)

### User Model

```js
{
  name,
  email,
  password,
  role: "user" | "provider" | "admin",
  isActive
}
```

---

### Provider Model

```js
{
  userId,
  services[],
  availability[],
  status: "available" | "busy" | "booking_pending" | "offline",
  rating,
  earnings,
  isApproved
}
```

---

### Booking Model

```js
{
  userId,
  providerId,
  serviceId,
  date,
  time,
  address,
  status,
  createdAt
}
```

---

### Service Model

```js
{
  name,
  category,
  icon,
  basePrice,
  isActive
}
```

---

## 7️⃣ Authorization Rules (VERY IMPORTANT)

| Action               | Role     |
| -------------------- | -------- |
| Book service         | User     |
| Accept booking       | Provider |
| Change availability  | Provider |
| Approve provider     | Admin    |
| Manage services      | Admin    |
| View admin dashboard | Admin    |

Middleware checks:

* JWT token
* User role
* Resource ownership

---

## 8️⃣ Frontend State Management Logic

Frontend tracks:

* Auth state
* Booking state
* Provider status
* Loading states
* Error states

Uses:

* Context API
* Custom hooks

---

## 9️⃣ Edge Cases (Real World)

Handled properly:

* Double booking prevention
* Provider offline during booking
* User cancels last minute
* Provider rejects after delay
* Admin intervention
* Network failures

---

## 🔐 Security Considerations

* Password hashing
* JWT expiration
* Role-based access
* Admin-only routes
* Rate limiting (future)

---

## 🚀 Scalability & Future Scope

You can later add:

* Payments
* Real-time socket updates
* Chat between user & provider
* Maps & live tracking
* Reviews moderation
* Subscription plans

---

## 🧠 FINAL MENTAL MODEL (IMPORTANT)

Think of GoLocal as:

> **STATE MANAGEMENT SYSTEM + ROLE-BASED WORKFLOW**

Every action:

* Changes **booking state**
* Changes **provider state**
* Triggers **permissions**

---

## ✅ Why This Is a STRONG Project

✔ Real-world logic
✔ Admin control
✔ Multi-role system
✔ Status-driven workflow
✔ Interview-ready
✔ Startup-grade architecture

---
