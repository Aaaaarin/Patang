# Sports Facilities & Calendar Modules — Backend Implementation Guide

> **Project Stack:** MERN (MongoDB, Express.js, React, Node.js)
> **Package Manager:** pnpm (already initialized)
> **Scope:** Backend APIs only — tested via Postman
> **Shared/Common Code:** Already implemented (auth middleware, DB connection, user model, etc.)

---

## Table of Contents

1. [Module Overview](#1-module-overview)
2. [Functional Requirements](#2-functional-requirements)
3. [Database Design](#3-database-design)
4. [API Design](#4-api-design)
5. [Backend Structure](#5-backend-structure)
6. [Implementation Notes](#6-implementation-notes)
7. [Postman Testing](#7-postman-testing)

---

## 1. Module Overview

### 1.1 Sports Facilities Module

**Purpose:** Provide a centralized, fair-use booking system for campus sports facilities (Badminton, Tennis, Squash, Basketball, Table Tennis courts), along with long-term subscription management for the Gym and Swimming Pool.

**Core Capabilities:**
- Real-time slot availability viewing & booking (up to 3 days in advance)
- Fair-use quota enforcement (max 2 active slots per rolling 72-hour window)
- Group booking with auto-matching ("Look for Groups" feature)
- QR-code-based attendance tracking by Caretakers
- Gym/Swimming Pool subscription lifecycle (application → verification → digital pass)
- Automated penalty enforcement for no-shows and late cancellations

**System Interactions:**
| Interacting System | Interaction Type |
|---|---|
| **Auth/User Service** | RBAC — ensures only authenticated Students/Faculty can book; Caretakers manage attendance; Admins approve subscriptions |
| **Penalty Service** | Auto-suspends booking privileges after repeated violations |
| **Notification Service** | Sends alerts for confirmations, group completions, cancellations, and penalty warnings |
| **Calendar Module** | Approved sports events block facility slots; shared venue resources |

### 1.2 Calendar Module (Unified Gymkhana Dashboard)

**Purpose:** Serve as the single source of truth for all campus-wide activities — cultural, technical, sports events, and official notices. Supports decentralized event submission with centralized executive approval.

**Core Capabilities:**
- Public calendar view of all approved events
- Event submission by authorized Club Coordinators/Secretaries
- Executive moderation workflow (approve/reject/request changes)
- Filtering by category, date range, and organizing club
- Optional venue booking integration for approved events (e.g., Senate Hall, Auditorium)

**System Interactions:**
| Interacting System | Interaction Type |
|---|---|
| **Auth/User Service** | RBAC — Coordinators submit, Executives moderate, Students view |
| **Sports Facilities Module** | Approved events may reserve facility time slots |
| **Notification Service** | Notifies coordinators of approval/rejection; notifies students of upcoming events |

---

## 2. Functional Requirements

### 2.1 Sports Facilities — Slot Booking

| ID | Requirement | Priority |
|---|---|---|
| **SFS-01** | Users can view real-time slot availability for any facility for the **next 3 days** | High |
| **SFS-02** | Users can book an available time slot for a specific facility | High |
| **SFS-03** | **Fair-use quota:** Maximum **2 active bookings** per user within a rolling **72-hour** window | High |
| **SFS-04** | Users can cancel a booking **up to 2 hours** before the slot start time without penalty | High |
| **SFS-05** | Cancellation within 2 hours of slot start counts as a **late cancellation** (penalty-eligible) | High |
| **SFS-06** | Users must check in via **QR code scan** (performed by Caretaker) within **15 minutes** of slot start | High |
| **SFS-07** | Failure to check in marks the booking as **No-Show** | High |
| **SFS-08** | **3 consecutive no-shows** or **2 late cancellations** within a month triggers a **7-day booking suspension** | Medium |
| **SFS-09** | Caretakers can mark facilities as **Out of Service / Maintenance** | Medium |
| **SFS-10** | Admins can configure facility metadata (operating hours, max players, slot duration) | Low |

### 2.2 Sports Facilities — Group Booking

| ID | Requirement | Priority |
|---|---|---|
| **SFG-01** | Larger courts (Tennis, Basketball) require a **minimum group size** to confirm | High |
| **SFG-02** | Users can create a group booking request ("Look for Groups" feature) | High |
| **SFG-03** | Other users can **join** an existing group booking | High |
| **SFG-04** | Group booking remains in **"Provisioned"** status until the minimum player count is met | High |
| **SFG-05** | If the minimum group size is **not met 4 hours before** slot start, the booking is **auto-cancelled** and the slot is released | High |
| **SFG-06** | When the minimum count is met, all group members are notified and the booking becomes **Confirmed** | Medium |

### 2.3 Sports Facilities — Gym & Swimming Subscriptions

| ID | Requirement | Priority |
|---|---|---|
| **SUB-01** | Users can apply for Gym or Swimming Pool subscription (Monthly / Semesterly / Yearly) | High |
| **SUB-02** | Application requires uploading a **medical fitness certificate** | High |
| **SUB-03** | Application requires uploading a **payment receipt** (SBI Collect or equivalent) | High |
| **SUB-04** | Admin reviews and **approves/rejects** the subscription application | High |
| **SUB-05** | Upon approval, a **Digital Access Pass** with a QR code is generated | High |
| **SUB-06** | Caretaker scans QR to **verify entry** at Gym/Pool | Medium |
| **SUB-07** | System tracks subscription **expiry** and notifies users before expiration | Medium |
| **SUB-08** | Admin can **revoke** a subscription for violations | Low |

### 2.4 Calendar — Event Management

| ID | Requirement | Priority |
|---|---|---|
| **CAL-01** | Public calendar view showing all **approved** events with category filters | High |
| **CAL-02** | Authorized Coordinators can **submit event proposals** with: Title, Description, Category, Date/Time, Venue, Registration Link | High |
| **CAL-03** | Gymkhana Executives can **view pending** event proposals | High |
| **CAL-04** | Executives can **approve, reject,** or **request changes** to event proposals | High |
| **CAL-05** | Approved events appear on the public calendar automatically | High |
| **CAL-06** | Users can filter events by **category** (Cultural, Technical, Sports, Notice) | Medium |
| **CAL-07** | Users can filter events by **date range** | Medium |
| **CAL-08** | Users can filter events by **organizing club** | Low |
| **CAL-09** | Event coordinators can **update** or **cancel** their approved events | Medium |
| **CAL-10** | Approved events optionally **reserve a venue slot** (e.g., Auditorium, Senate Hall) | Low |

---

## 3. Database Design

### 3.1 Collection: `facilities`

Stores metadata for all sports facilities and venues.

```javascript
const facilitySchema = new mongoose.Schema({
  name:          { type: String, required: true },           // "Badminton Court 1", "Gym", "Senate Hall"
  sportType:     { type: String, required: true,
                   enum: ['Badminton', 'Tennis', 'Squash', 'Basketball', 'TableTennis',
                          'Gym', 'SwimmingPool', 'Auditorium', 'Other'] },
  location:      { type: String, required: true },           // "New SAC Ground Floor"
  maxPlayers:    { type: Number, default: 2 },               // Max allowed per slot
  minGroupSize:  { type: Number, default: 2 },               // Min required for group booking
  slotDuration:  { type: Number, default: 60 },              // Duration in minutes
  operatingHours: {
    start:       { type: String, default: '06:00' },         // HH:mm format
    end:         { type: String, default: '22:00' }
  },
  isActive:      { type: Boolean, default: true },
  isBookable:    { type: Boolean, default: true },           // false for Gym/Pool (subscription-based)
}, { timestamps: true });

// Indexes
facilitySchema.index({ sportType: 1 });
facilitySchema.index({ isActive: 1, isBookable: 1 });
```

### 3.2 Collection: `timeslots`

Pre-generated or dynamically generated time slots for bookable facilities.

```javascript
const timeSlotSchema = new mongoose.Schema({
  facilityId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true },
  date:          { type: Date, required: true },             // Date portion only (YYYY-MM-DD)
  startTime:     { type: Date, required: true },             // Full datetime
  endTime:       { type: Date, required: true },             // Full datetime
  status:        { type: String, required: true,
                   enum: ['Available', 'Booked', 'Reserved', 'Maintenance'],
                   default: 'Available' },
}, { timestamps: true });

// Indexes
timeSlotSchema.index({ facilityId: 1, date: 1, status: 1 });
timeSlotSchema.index({ startTime: 1 });
```

### 3.3 Collection: `bookings`

Tracks all individual and group bookings.

```javascript
const bookingSchema = new mongoose.Schema({
  userId:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  facilityId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true },
  slotId:             { type: mongoose.Schema.Types.ObjectId, ref: 'TimeSlot', required: true },
  bookingDate:        { type: Date, required: true },        // The date the user made the booking
  slotDate:           { type: Date, required: true },        // The date of the actual slot
  status:             { type: String, required: true,
                        enum: ['Confirmed', 'Provisioned', 'Cancelled', 'LateCancelled',
                               'Attended', 'NoShow', 'AutoCancelled'],
                        default: 'Confirmed' },
  // Group booking fields
  isGroupBooking:     { type: Boolean, default: false },
  groupRequiredCount: { type: Number, default: 2 },
  joinedUsers:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Check-in tracking
  checkedInAt:        { type: Date, default: null },
  checkedInBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Caretaker
  // Cancellation tracking
  cancelledAt:        { type: Date, default: null },
  cancellationReason: { type: String, default: null },
}, { timestamps: true });

// Indexes
bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ slotId: 1 });
bookingSchema.index({ userId: 1, bookingDate: 1 });          // For fair-use quota check
bookingSchema.index({ isGroupBooking: 1, status: 1 });       // For group expiry cron
bookingSchema.index({ slotDate: 1, status: 1 });
```

### 3.4 Collection: `subscriptions`

Manages Gym and Swimming Pool memberships.

```javascript
const subscriptionSchema = new mongoose.Schema({
  userId:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  facilityType:       { type: String, required: true,
                        enum: ['Gym', 'SwimmingPool'] },
  plan:               { type: String, required: true,
                        enum: ['Monthly', 'Semesterly', 'Yearly'] },
  status:             { type: String, required: true,
                        enum: ['Pending', 'Approved', 'Rejected', 'Expired', 'Revoked'],
                        default: 'Pending' },
  startDate:          { type: Date, default: null },         // Set upon approval
  endDate:            { type: Date, default: null },         // Calculated from plan + startDate
  medicalCertUrl:     { type: String, required: true },      // Uploaded file URL
  paymentReceiptUrl:  { type: String, required: true },      // Uploaded file URL
  // QR Pass
  qrCode:             { type: String, default: null },       // Generated QR data/URL upon approval
  passId:             { type: String, default: null, unique: true, sparse: true },
  // Admin actions
  reviewedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt:         { type: Date, default: null },
  rejectionReason:    { type: String, default: null },
}, { timestamps: true });

// Indexes
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ facilityType: 1, status: 1 });
subscriptionSchema.index({ endDate: 1 });                    // For expiry cron
subscriptionSchema.index({ passId: 1 }, { unique: true, sparse: true });
```

### 3.5 Collection: `penalties`

Tracks user violations and suspension periods.

```javascript
const penaltySchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:          { type: String, required: true,
                   enum: ['NoShow', 'LateCancellation', 'Misuse'] },
  bookingId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  isActive:      { type: Boolean, default: true },
  suspendedUntil:{ type: Date, default: null },              // If this penalty triggered a suspension
  description:   { type: String, default: null },
}, { timestamps: true });

// Indexes
penaltySchema.index({ userId: 1, isActive: 1 });
penaltySchema.index({ userId: 1, type: 1, createdAt: -1 }); // For threshold checks
```

### 3.6 Collection: `events`

Stores calendar events with moderation workflow.

```javascript
const eventSchema = new mongoose.Schema({
  title:             { type: String, required: true },
  description:       { type: String, required: true },
  category:          { type: String, required: true,
                       enum: ['Cultural', 'Technical', 'Sports', 'Notice', 'Other'] },
  startTime:         { type: Date, required: true },
  endTime:           { type: Date, required: true },
  venue:             { type: String, default: null },        // Free-text venue name
  venueSlotId:       { type: mongoose.Schema.Types.ObjectId, ref: 'TimeSlot', default: null },
  organizingClub:    { type: String, required: true },
  registrationLink:  { type: String, default: null },
  posterUrl:         { type: String, default: null },
  status:            { type: String, required: true,
                       enum: ['Pending', 'Approved', 'Rejected', 'Cancelled', 'ChangesRequested'],
                       default: 'Pending' },
  // Moderation
  createdBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewedBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt:        { type: Date, default: null },
  rejectionReason:   { type: String, default: null },
  changeRequestNote: { type: String, default: null },
}, { timestamps: true });

// Indexes
eventSchema.index({ status: 1, startTime: 1 });             // Public calendar query
eventSchema.index({ category: 1, status: 1 });              // Category filter
eventSchema.index({ createdBy: 1 });                         // User's events
eventSchema.index({ startTime: 1, endTime: 1 });            // Date range filter
```

### 3.7 Entity Relationship Summary

```
Users (shared) ──┬── 1:N ──> Bookings
                  ├── 1:N ──> Subscriptions
                  ├── 1:N ──> Penalties
                  └── 1:N ──> Events (as creator)

Facilities ── 1:N ──> TimeSlots
TimeSlots  ── 1:1 ──> Bookings (one slot = one booking at a time)
Bookings   ── N:N ──> Users (via joinedUsers for group bookings)
Events     ── 0:1 ──> TimeSlots (optional venue reservation)
```

---

## 4. API Design

### 4.1 Sports Facilities APIs

#### `GET /api/facilities`
**Description:** List all active facilities.
**Auth:** Any authenticated user.
**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `sportType` | string | No | Filter by sport type (e.g., `Badminton`) |
| `isBookable` | boolean | No | Filter slot-bookable vs subscription-based |

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65af...",
      "name": "Badminton Court 1",
      "sportType": "Badminton",
      "location": "New SAC Ground Floor",
      "maxPlayers": 4,
      "minGroupSize": 2,
      "slotDuration": 60,
      "operatingHours": { "start": "06:00", "end": "22:00" },
      "isActive": true,
      "isBookable": true
    }
  ]
}
```

---

#### `GET /api/facilities/:facilityId/availability`
**Description:** Get available time slots for a specific facility.
**Auth:** Any authenticated user.
**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `date` | string (YYYY-MM-DD) | Yes | Date to check availability |

**Validation:**
- `date` must be today or within next 3 days.
- `facilityId` must exist and be active.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "facility": { "_id": "65af...", "name": "Badminton Court 1" },
    "date": "2026-03-16",
    "slots": [
      {
        "_id": "65bf...",
        "startTime": "2026-03-16T06:00:00.000Z",
        "endTime": "2026-03-16T07:00:00.000Z",
        "status": "Available"
      },
      {
        "_id": "65cf...",
        "startTime": "2026-03-16T07:00:00.000Z",
        "endTime": "2026-03-16T08:00:00.000Z",
        "status": "Booked"
      }
    ]
  }
}
```

**Error Responses:**
| Status | Description |
|---|---|
| 400 | Invalid date or date out of allowed range |
| 404 | Facility not found |

---

#### `POST /api/bookings`
**Description:** Create a new booking (individual or group).
**Auth:** Authenticated Student/Faculty.
**Request Body:**
```json
{
  "facilityId": "65af...",
  "slotId": "65bf...",
  "isGroupBooking": false
}
```

**Validation & Business Logic:**
1. Check user is not currently suspended (check `penalties` collection for active suspensions).
2. Check fair-use quota: count user's active bookings (status in `Confirmed` or `Provisioned`) made in last 72 hours. Must be < 2.
3. Check the slot status is `Available`.
4. Check the slot date is within the next 3 days.
5. Check no overlapping bookings for this user.
6. If `isGroupBooking: true`, set status to `Provisioned` and set `groupRequiredCount` from the facility's `minGroupSize`.
7. If `isGroupBooking: false`, set status to `Confirmed`.
8. Update slot status to `Booked` (or `Reserved` for group).

**Success Response (201):**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "_id": "65df...",
    "userId": "64ab...",
    "facilityId": "65af...",
    "slotId": "65bf...",
    "status": "Confirmed",
    "isGroupBooking": false,
    "bookingDate": "2026-03-14T07:00:00.000Z",
    "slotDate": "2026-03-16T06:00:00.000Z"
  }
}
```

**Error Responses:**
| Status | Code | Description |
|---|---|---|
| 400 | `QUOTA_EXCEEDED` | User already has 2 active bookings in 72h window |
| 400 | `SLOT_UNAVAILABLE` | Slot is not in Available status |
| 400 | `DATE_OUT_OF_RANGE` | Slot date is beyond the 3-day advance window |
| 403 | `USER_SUSPENDED` | User is currently under penalty suspension |
| 404 | `FACILITY_NOT_FOUND` | Invalid facilityId |
| 404 | `SLOT_NOT_FOUND` | Invalid slotId |
| 409 | `OVERLAPPING_BOOKING` | User already has a booking at this time |

---

#### `PATCH /api/bookings/:bookingId/join`
**Description:** Join an existing group booking.
**Auth:** Authenticated Student/Faculty.
**Request Body:** None.

**Validation & Business Logic:**
1. Booking must exist, be a group booking, and have status `Provisioned`.
2. User must not already be in `joinedUsers`.
3. Check user's fair-use quota (same as booking creation).
4. Add user to `joinedUsers` array.
5. If `joinedUsers.length + 1 (creator) >= groupRequiredCount`, update status to `Confirmed` and notify all members.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Successfully joined group booking",
  "data": {
    "_id": "65df...",
    "status": "Provisioned",
    "joinedUsers": ["64ab...", "64cd..."],
    "groupRequiredCount": 4
  }
}
```

**Error Responses:**
| Status | Code | Description |
|---|---|---|
| 400 | `NOT_GROUP_BOOKING` | Booking is not a group booking |
| 400 | `GROUP_FULL` | Group already has enough members |
| 400 | `ALREADY_JOINED` | User is already in this group |
| 400 | `QUOTA_EXCEEDED` | User's fair-use quota exceeded |
| 404 | `BOOKING_NOT_FOUND` | Invalid bookingId |

---

#### `DELETE /api/bookings/:bookingId`
**Description:** Cancel a booking.
**Auth:** Booking owner only.

**Validation & Business Logic:**
1. Booking must exist and belong to the authenticated user.
2. Booking status must be `Confirmed` or `Provisioned`.
3. Calculate time until slot start:
   - If **≥ 2 hours**: Set status to `Cancelled`. No penalty.
   - If **< 2 hours**: Set status to `LateCancelled`. Create a `LateCancellation` penalty record.
4. Release the time slot (set status back to `Available`).
5. If this was a group booking, notify remaining members.
6. Check if the user's penalty count triggers a suspension (2 late cancellations in 30 days → 7-day suspension).

**Success Response (200):**
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "data": {
    "status": "Cancelled",
    "penaltyApplied": false
  }
}
```

**Error Responses:**
| Status | Code | Description |
|---|---|---|
| 400 | `CANNOT_CANCEL` | Booking is not in a cancellable state |
| 403 | `NOT_OWNER` | User is not the booking owner |
| 404 | `BOOKING_NOT_FOUND` | Invalid bookingId |

---

#### `POST /api/bookings/:bookingId/check-in`
**Description:** Caretaker scans QR to mark a user as present.
**Auth:** Caretaker role only.
**Request Body:**
```json
{
  "qrToken": "encoded-booking-token-string"
}
```

**Validation & Business Logic:**
1. Decode QR token to get booking ID and user ID.
2. Booking must exist with status `Confirmed`.
3. Check current time is within **15 minutes** of slot `startTime`.
4. Update booking: set `status` to `Attended`, `checkedInAt` to now, `checkedInBy` to caretaker's user ID.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Check-in successful",
  "data": {
    "bookingId": "65df...",
    "status": "Attended",
    "checkedInAt": "2026-03-16T06:05:00.000Z"
  }
}
```

**Error Responses:**
| Status | Code | Description |
|---|---|---|
| 400 | `CHECK_IN_WINDOW_CLOSED` | More than 15 minutes past slot start |
| 400 | `INVALID_QR` | QR token is invalid or expired |
| 400 | `ALREADY_CHECKED_IN` | User has already checked in |
| 404 | `BOOKING_NOT_FOUND` | Invalid bookingId |

---

### 4.2 Subscription APIs (Gym / Swimming Pool)

#### `POST /api/subscriptions/apply`
**Description:** Submit a new subscription application.
**Auth:** Authenticated Student/Faculty.
**Content-Type:** `multipart/form-data`
**Request Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| `facilityType` | string | Yes | `Gym` or `SwimmingPool` |
| `plan` | string | Yes | `Monthly`, `Semesterly`, or `Yearly` |
| `medicalCert` | file | Yes | Medical fitness certificate (PDF/image) |
| `paymentReceipt` | file | Yes | Payment receipt (PDF/image) |

**Validation:**
1. No existing active (Pending/Approved) subscription for the same facility type.
2. File type validation (PDF, JPG, PNG only).
3. File size limit (5 MB per file).

**Success Response (201):**
```json
{
  "success": true,
  "message": "Subscription application submitted",
  "data": {
    "_id": "65ef...",
    "facilityType": "Gym",
    "plan": "Semesterly",
    "status": "Pending"
  }
}
```

**Error Responses:**
| Status | Code | Description |
|---|---|---|
| 400 | `INVALID_FILE_TYPE` | Unsupported file format |
| 400 | `FILE_TOO_LARGE` | File exceeds 5 MB limit |
| 409 | `ACTIVE_SUBSCRIPTION_EXISTS` | User already has an active subscription |

---

#### `GET /api/subscriptions/my`
**Description:** View current user's subscription(s) and digital pass.
**Auth:** Authenticated user (own subscriptions only).

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65ef...",
      "facilityType": "Gym",
      "plan": "Semesterly",
      "status": "Approved",
      "startDate": "2026-03-01",
      "endDate": "2026-08-31",
      "qrCode": "data:image/png;base64,...",
      "passId": "GYM-2026-001"
    }
  ]
}
```

---

#### `GET /api/admin/subscriptions`
**Description:** List subscription applications for review.
**Auth:** Admin role only.
**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `status` | string | No | Filter by status (default: `Pending`) |
| `facilityType` | string | No | Filter by `Gym` or `SwimmingPool` |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20) |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "subscriptions": [ /* array of subscription objects with populated user info */ ],
    "pagination": { "page": 1, "limit": 20, "total": 45, "pages": 3 }
  }
}
```

---

#### `PATCH /api/admin/subscriptions/:subscriptionId`
**Description:** Approve or reject a subscription application.
**Auth:** Admin role only.
**Request Body:**
```json
{
  "action": "approve",
  "rejectionReason": null
}
```
- `action`: `"approve"` or `"reject"` (required)
- `rejectionReason`: string (required if action is `reject`)

**Business Logic on Approve:**
1. Set `status` to `Approved`.
2. Calculate `startDate` (today) and `endDate` based on plan.
3. Generate a unique `passId` (e.g., `GYM-2026-001`).
4. Generate QR code containing passId and userId.
5. Set `reviewedBy` and `reviewedAt`.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Subscription approved",
  "data": {
    "status": "Approved",
    "startDate": "2026-03-14",
    "endDate": "2026-08-31",
    "passId": "GYM-2026-001"
  }
}
```

---

#### `POST /api/subscriptions/verify-entry`
**Description:** Caretaker scans QR to verify Gym/Pool entry.
**Auth:** Caretaker role only.
**Request Body:**
```json
{
  "passId": "GYM-2026-001"
}
```

**Validation:**
1. Subscription must exist and have `status: Approved`.
2. Current date must be between `startDate` and `endDate`.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Entry verified",
  "data": {
    "userName": "John Doe",
    "facilityType": "Gym",
    "validUntil": "2026-08-31"
  }
}
```

**Error Responses:**
| Status | Code | Description |
|---|---|---|
| 400 | `SUBSCRIPTION_EXPIRED` | Subscription is past end date |
| 400 | `SUBSCRIPTION_NOT_ACTIVE` | Subscription is not in Approved status |
| 404 | `PASS_NOT_FOUND` | Invalid passId |

---

### 4.3 Calendar / Event APIs

#### `GET /api/events`
**Description:** Fetch approved events for the public calendar.
**Auth:** Any authenticated user.
**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `category` | string | No | Filter by event category |
| `startDate` | string (ISO) | No | Start of date range filter |
| `endDate` | string (ISO) | No | End of date range filter |
| `club` | string | No | Filter by organizing club |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20) |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "_id": "66af...",
        "title": "Inter-Hall Squash Tournament",
        "description": "Annual squash competition...",
        "category": "Sports",
        "startTime": "2026-04-10T10:00:00.000Z",
        "endTime": "2026-04-10T18:00:00.000Z",
        "venue": "New SAC Squash Courts",
        "organizingClub": "Squash Club",
        "registrationLink": "https://forms.gle/...",
        "posterUrl": "/uploads/posters/squash-tournament.jpg",
        "createdBy": { "_id": "64ab...", "name": "Alice" }
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 12, "pages": 1 }
  }
}
```

---

#### `POST /api/events`
**Description:** Submit a new event proposal for executive review.
**Auth:** Coordinator/Secretary role.
**Content-Type:** `multipart/form-data` (if poster upload) or `application/json`.
**Request Body:**
```json
{
  "title": "Inter-Hall Squash Tournament",
  "description": "Annual squash competition open to all students. Registration required.",
  "category": "Sports",
  "startTime": "2026-04-10T10:00:00.000Z",
  "endTime": "2026-04-10T18:00:00.000Z",
  "venue": "New SAC Squash Courts",
  "organizingClub": "Squash Club",
  "registrationLink": "https://forms.gle/example"
}
```

**Validation:**
1. `title` is required, max 200 characters.
2. `description` is required, max 2000 characters.
3. `category` must be one of the allowed enum values.
4. `startTime` must be in the future.
5. `endTime` must be after `startTime`.
6. `organizingClub` is required.
7. Poster file: max 5 MB, image only.

**Success Response (201):**
```json
{
  "success": true,
  "message": "Event proposal submitted for review",
  "data": {
    "_id": "66af...",
    "title": "Inter-Hall Squash Tournament",
    "status": "Pending"
  }
}
```

---

#### `GET /api/events/my`
**Description:** Fetch events created by the authenticated coordinator.
**Auth:** Coordinator/Secretary role.

**Success Response (200):**
```json
{
  "success": true,
  "data": [ /* array of event objects including Pending, Rejected, ChangesRequested */ ]
}
```

---

#### `PUT /api/events/:eventId`
**Description:** Update an existing event (only for owner, and only if status is `Pending` or `ChangesRequested`).
**Auth:** Event creator only.
**Request Body:** Same fields as `POST /api/events` (partial update allowed).

**Success Response (200):**
```json
{
  "success": true,
  "message": "Event updated successfully",
  "data": { /* updated event object */ }
}
```

**Error Responses:**
| Status | Code | Description |
|---|---|---|
| 400 | `CANNOT_EDIT` | Event is already Approved/Rejected/Cancelled |
| 403 | `NOT_OWNER` | User is not the event creator |
| 404 | `EVENT_NOT_FOUND` | Invalid eventId |

---

#### `DELETE /api/events/:eventId`
**Description:** Cancel an event.
**Auth:** Event creator or Executive/Admin.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Event cancelled",
  "data": { "status": "Cancelled" }
}
```

---

#### `GET /api/admin/events/pending`
**Description:** Get all events pending executive review.
**Auth:** Executive/Admin role.

**Success Response (200):**
```json
{
  "success": true,
  "data": [ /* array of pending event objects with creator info */ ]
}
```

---

#### `PATCH /api/admin/events/:eventId`
**Description:** Approve, reject, or request changes for an event.
**Auth:** Executive/Admin role.
**Request Body:**
```json
{
  "action": "approve",
  "rejectionReason": null,
  "changeRequestNote": null
}
```
- `action`: `"approve"`, `"reject"`, or `"requestChanges"` (required)
- `rejectionReason`: string (required if action is `reject`)
- `changeRequestNote`: string (required if action is `requestChanges`)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Event approved",
  "data": {
    "status": "Approved",
    "reviewedAt": "2026-03-14T12:00:00.000Z"
  }
}
```

---

### 4.4 Penalty APIs (Supporting)

#### `GET /api/penalties/my`
**Description:** View current user's penalty history.
**Auth:** Authenticated user.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "penalties": [
      {
        "_id": "67af...",
        "type": "NoShow",
        "createdAt": "2026-03-10T10:00:00.000Z",
        "isActive": true,
        "suspendedUntil": null
      }
    ],
    "activeSuspension": null,
    "noShowCount": 1,
    "lateCancelCount": 0
  }
}
```

---

## 5. Backend Structure

```
src/
├── config/
│   └── db.js                       # MongoDB connection (shared – likely exists)
│
├── models/
│   ├── Facility.js                  # Facility schema
│   ├── TimeSlot.js                  # TimeSlot schema
│   ├── Booking.js                   # Booking schema
│   ├── Subscription.js              # Subscription schema
│   ├── Penalty.js                   # Penalty schema
│   └── Event.js                     # Event schema
│
├── routes/
│   ├── facilityRoutes.js            # GET /api/facilities, GET /api/facilities/:id/availability
│   ├── bookingRoutes.js             # POST/DELETE /api/bookings, PATCH join, POST check-in
│   ├── subscriptionRoutes.js        # POST apply, GET my, POST verify-entry
│   ├── subscriptionAdminRoutes.js   # GET/PATCH admin subscription management
│   ├── eventRoutes.js               # GET/POST/PUT/DELETE /api/events
│   ├── eventAdminRoutes.js          # GET pending, PATCH approve/reject
│   └── penaltyRoutes.js            # GET /api/penalties/my
│
├── controllers/
│   ├── facilityController.js
│   ├── bookingController.js
│   ├── subscriptionController.js
│   ├── eventController.js
│   └── penaltyController.js
│
├── services/
│   ├── bookingService.js            # Fair-use quota checks, overlap detection, slot management
│   ├── penaltyService.js            # Penalty threshold checks, suspension logic
│   ├── groupBookingService.js       # Group matching, auto-cancel logic
│   ├── subscriptionService.js       # QR generation, pass ID generation, expiry calculation
│   ├── slotGeneratorService.js      # Generate time slots for facilities (cron or on-demand)
│   └── qrService.js                # QR code generation and decoding
│
├── middleware/
│   ├── auth.js                      # JWT authentication (shared – likely exists)
│   ├── rbac.js                      # Role-based access control (shared – likely exists)
│   ├── upload.js                    # Multer configuration for file uploads
│   └── validate.js                  # Request validation middleware (Joi or express-validator)
│
├── jobs/                            # Scheduled tasks (node-cron or agenda.js)
│   ├── groupExpiryJob.js            # Auto-cancel unfilled groups 4h before slot
│   ├── noShowJob.js                 # Mark unattended bookings as NoShow 15min after slot start
│   ├── subscriptionExpiryJob.js     # Mark expired subscriptions
│   └── slotGenerationJob.js         # Generate next day's slots nightly
│
├── utils/
│   ├── apiResponse.js               # Standardized response helpers
│   ├── apiError.js                  # Custom error class with error codes
│   └── dateUtils.js                 # Date arithmetic helpers (rolling window, cutoffs)
│
└── app.js                           # Express app setup & route mounting
```

---

## 6. Implementation Notes

### 6.1 Validation Requirements

| Area | Rules |
|---|---|
| **Booking date range** | Only allow slots within next 3 calendar days (inclusive of today) |
| **Fair-use quota** | Count bookings with status in `[Confirmed, Provisioned]` created in last 72 hours by the same user. Must be < 2. |
| **Cancellation cutoff** | Compare `Date.now()` with `slot.startTime - 2 hours`. Use UTC throughout. |
| **Check-in window** | Allow check-in from `slot.startTime` to `slot.startTime + 15 minutes` only. |
| **File uploads** | Accept PDF, JPG, PNG only. Max 5 MB per file. Use Multer with `diskStorage` or cloud storage (S3). |
| **Event dates** | `startTime` must be in the future. `endTime` must be after `startTime`. |
| **String lengths** | Event title: max 200 chars. Event description: max 2000 chars. |

### 6.2 Authentication & Authorization

| Role | Capabilities |
|---|---|
| **Student / Faculty** | View facilities, book slots, join groups, apply for subscriptions, view calendar, view own penalties |
| **Coordinator / Secretary** | All student capabilities + submit event proposals, manage own events |
| **Caretaker** | Check-in users (QR scan), verify subscription entry, mark facilities as out-of-service |
| **Executive** | Approve/reject events, view all pending events |
| **Admin** | Approve/reject subscriptions, manage facilities, view all penalties, all executive capabilities |

> **Assumption:** Auth middleware (`auth.js`) is already implemented and attaches `req.user` with `{ _id, role, name }`. RBAC middleware (`rbac.js`) accepts allowed roles: `rbac('admin', 'caretaker')`.

### 6.3 Edge Cases & Business Logic

1. **Concurrent Booking Race Condition:**
   Use MongoDB **optimistic concurrency** — update slot status from `Available` to `Booked` using `findOneAndUpdate` with a filter on `status: 'Available'`. If the update returns null, the slot was already taken.

2. **Group Booking Auto-Cancel (Cron Job):**
   Run every hour. Query: `{ isGroupBooking: true, status: 'Provisioned', slotDate: { $lte: now + 4h } }`. For each, if `joinedUsers.length + 1 < groupRequiredCount`, set status to `AutoCancelled` and release slot.

3. **No-Show Detection (Cron Job):**
   Run every 15 minutes. Query: `{ status: 'Confirmed', slot.startTime: { $lte: now - 15min } }`. Mark as `NoShow`, create penalty record, and check if suspension threshold is met.

4. **Penalty Suspension Logic:**
   ```
   noShowsInMonth = count penalties { userId, type: 'NoShow', createdAt >= 30 days ago }
   lateCancelsInMonth = count penalties { userId, type: 'LateCancellation', createdAt >= 30 days ago }

   if (noShowsInMonth >= 3 || lateCancelsInMonth >= 2) {
     create suspension penalty with suspendedUntil = now + 7 days
   }
   ```

5. **Subscription Expiry Calculation:**
   | Plan | Duration |
   |---|---|
   | Monthly | startDate + 30 days |
   | Semesterly | startDate + 180 days |
   | Yearly | startDate + 365 days |

6. **Slot Generation:**
   Generate slots for each facility daily (via cron at midnight). For each facility, create slots from `operatingHours.start` to `operatingHours.end` with `slotDuration` intervals for the next 3 days.

7. **Overlapping Booking Prevention:**
   Before creating a booking, query: `{ userId, status: { $in: ['Confirmed', 'Provisioned'] }, slotDate: same_date }` and check for time overlap with the requested slot.

8. **Event Venue Clash:**
   If an event specifies a venue that maps to a facility, check that no other event or booking occupies that venue during the requested timeframe.

### 6.4 Error Response Format (Standardized)

All error responses should follow this structure:

```json
{
  "success": false,
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "You have reached the maximum of 2 active bookings in a 72-hour window",
    "details": null
  }
}
```

### 6.5 Dependencies (npm packages)

| Package | Purpose |
|---|---|
| `express` | HTTP server framework |
| `mongoose` | MongoDB ODM |
| `jsonwebtoken` | JWT auth (likely shared) |
| `multer` | File upload handling |
| `qrcode` | QR code generation |
| `node-cron` | Scheduled job runner |
| `joi` or `express-validator` | Request validation |
| `uuid` | Unique pass ID generation |
| `dayjs` or `date-fns` | Date manipulation |

---

## 7. Postman Testing

### 7.1 Environment Variables

Set up a Postman environment with:
| Variable | Value |
|---|---|
| `base_url` | `http://localhost:5000` |
| `auth_token` | JWT token from login endpoint |
| `admin_token` | JWT token for admin user |
| `caretaker_token` | JWT token for caretaker user |
| `coordinator_token` | JWT token for coordinator user |
| `executive_token` | JWT token for executive user |

> **Header for all requests:** `Authorization: Bearer {{auth_token}}`

---

### 7.2 Sports Facilities — Example Requests

#### List All Facilities
```
GET {{base_url}}/api/facilities
Authorization: Bearer {{auth_token}}
```

#### Check Availability
```
GET {{base_url}}/api/facilities/65af.../availability?date=2026-03-16
Authorization: Bearer {{auth_token}}
```

#### Book a Slot (Individual)
```
POST {{base_url}}/api/bookings
Authorization: Bearer {{auth_token}}
Content-Type: application/json

{
  "facilityId": "{{facility_id}}",
  "slotId": "{{slot_id}}",
  "isGroupBooking": false
}
```

#### Book a Slot (Group)
```
POST {{base_url}}/api/bookings
Authorization: Bearer {{auth_token}}
Content-Type: application/json

{
  "facilityId": "{{facility_id}}",
  "slotId": "{{slot_id}}",
  "isGroupBooking": true
}
```

#### Join a Group Booking
```
PATCH {{base_url}}/api/bookings/{{booking_id}}/join
Authorization: Bearer {{auth_token}}
```

#### Cancel a Booking
```
DELETE {{base_url}}/api/bookings/{{booking_id}}
Authorization: Bearer {{auth_token}}
```

#### Check-In (Caretaker)
```
POST {{base_url}}/api/bookings/{{booking_id}}/check-in
Authorization: Bearer {{caretaker_token}}
Content-Type: application/json

{
  "qrToken": "eyJib29raW5nSWQiOiI2NWRmLi4uIiwidXNlcklkIjoiNjRhYi4uLiJ9"
}
```

---

### 7.3 Subscriptions — Example Requests

#### Apply for Gym Subscription
```
POST {{base_url}}/api/subscriptions/apply
Authorization: Bearer {{auth_token}}
Content-Type: multipart/form-data

Form fields:
  facilityType: Gym
  plan: Semesterly
  medicalCert: [file upload - medical_certificate.pdf]
  paymentReceipt: [file upload - sbi_receipt.pdf]
```

#### View My Subscriptions
```
GET {{base_url}}/api/subscriptions/my
Authorization: Bearer {{auth_token}}
```

#### Admin: List Pending Subscriptions
```
GET {{base_url}}/api/admin/subscriptions?status=Pending
Authorization: Bearer {{admin_token}}
```

#### Admin: Approve Subscription
```
PATCH {{base_url}}/api/admin/subscriptions/{{subscription_id}}
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "action": "approve"
}
```

#### Admin: Reject Subscription
```
PATCH {{base_url}}/api/admin/subscriptions/{{subscription_id}}
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "action": "reject",
  "rejectionReason": "Medical certificate is expired. Please upload a recent one."
}
```

#### Caretaker: Verify Gym Entry
```
POST {{base_url}}/api/subscriptions/verify-entry
Authorization: Bearer {{caretaker_token}}
Content-Type: application/json

{
  "passId": "GYM-2026-001"
}
```

---

### 7.4 Calendar Events — Example Requests

#### Get Public Calendar
```
GET {{base_url}}/api/events?category=Sports&startDate=2026-04-01&endDate=2026-04-30
Authorization: Bearer {{auth_token}}
```

#### Submit Event Proposal
```
POST {{base_url}}/api/events
Authorization: Bearer {{coordinator_token}}
Content-Type: application/json

{
  "title": "Inter-Hall Squash Tournament",
  "description": "Annual squash competition open to all students. Registration required.",
  "category": "Sports",
  "startTime": "2026-04-10T10:00:00.000Z",
  "endTime": "2026-04-10T18:00:00.000Z",
  "venue": "New SAC Squash Courts",
  "organizingClub": "Squash Club",
  "registrationLink": "https://forms.gle/example"
}
```

#### View My Submitted Events
```
GET {{base_url}}/api/events/my
Authorization: Bearer {{coordinator_token}}
```

#### Update Event (before approval)
```
PUT {{base_url}}/api/events/{{event_id}}
Authorization: Bearer {{coordinator_token}}
Content-Type: application/json

{
  "description": "Updated description: Open to all students and faculty members.",
  "registrationLink": "https://forms.gle/updated-link"
}
```

#### Cancel Event
```
DELETE {{base_url}}/api/events/{{event_id}}
Authorization: Bearer {{coordinator_token}}
```

#### Executive: View Pending Events
```
GET {{base_url}}/api/admin/events/pending
Authorization: Bearer {{executive_token}}
```

#### Executive: Approve Event
```
PATCH {{base_url}}/api/admin/events/{{event_id}}
Authorization: Bearer {{executive_token}}
Content-Type: application/json

{
  "action": "approve"
}
```

#### Executive: Reject Event
```
PATCH {{base_url}}/api/admin/events/{{event_id}}
Authorization: Bearer {{executive_token}}
Content-Type: application/json

{
  "action": "reject",
  "rejectionReason": "Venue conflict with another approved event on the same date."
}
```

#### Executive: Request Changes
```
PATCH {{base_url}}/api/admin/events/{{event_id}}
Authorization: Bearer {{executive_token}}
Content-Type: application/json

{
  "action": "requestChanges",
  "changeRequestNote": "Please provide a more detailed description and add the registration deadline."
}
```

---

### 7.5 Penalties — Example Requests

#### View My Penalties
```
GET {{base_url}}/api/penalties/my
Authorization: Bearer {{auth_token}}
```

---

### 7.6 Suggested Test Flow

Execute these requests in order for a complete integration test:

1. **Setup:** Login as Student → Save `auth_token`
2. **Facilities:** `GET /api/facilities` → Save a `facility_id`
3. **Availability:** `GET /api/facilities/:facilityId/availability?date=tomorrow` → Save a `slot_id`
4. **Book:** `POST /api/bookings` with `slot_id` → Save `booking_id`
5. **Book again:** Try a second booking → Verify it works (quota: 2)
6. **Book third:** Try a third booking → Expect `QUOTA_EXCEEDED` error
7. **Cancel:** `DELETE /api/bookings/:bookingId` → Verify cancellation
8. **Group Flow:** Create group booking → Login as another user → Join group → Verify status changes
9. **Check-in:** Login as Caretaker → `POST /check-in` → Verify attendance
10. **Subscription:** Apply → Login as Admin → Approve → Get digital pass → Verify entry
11. **Calendar:** Login as Coordinator → Submit event → Login as Executive → Approve → Verify public calendar
12. **Penalty:** Create booking → Don't check in → Run no-show job → Verify penalty created

---

*This document was extracted and structured from the Software Requirements Specification (SRS) and System Design Document for the Gymkhana Management System. It contains only information relevant to the Sports Facilities and Calendar modules.*
