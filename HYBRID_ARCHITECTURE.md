# GoLocal Hybrid Data Architecture

## 1. Frontend Architecture

The frontend is split into stable layers:

- `src/mock`: local mock database, mock API, mock realtime simulation.
- `src/services`: API and hybrid data orchestration.
- `src/hooks`: reusable fetch/socket state hooks.
- `src/features`: feature-level UI and widgets.
- `src/shared`: contracts, normalizers, merge utilities, config, and UI primitives.

Existing pages can continue importing old modules while migrating toward `src/shared/data` and `src/services/hybridDataService`.

## 2. Backend Architecture

The backend keeps current routes/controllers and adds additive hybrid layers:

- `src/featureFlags`: backend feature flags.
- `src/layeredServices`: real/mock merge orchestration.
- `src/responseNormalizers`: shared response contracts and entity normalizers.
- `src/seeders`: canonical seeder entrypoints.
- `src/middleware/responseMeta.js`: adds `{ meta: { source } }` to successful responses.

## 3. Database Architecture

Primary collections remain:

- `users`
- `services`
- `bookings`
- `transactions`
- `disputes`
- `notifications`
- `messages`

The current app does not yet have a separate `conversations` collection; conversations are derived from `messages`. A future migration can persist conversation summaries without breaking message history.

## 4. Layered Data Utilities

Frontend:

- `client/src/shared/data/dataOrigin.js`
- `client/src/shared/data/normalizeEntity.js`
- `client/src/shared/data/mergeCollections.js`
- `client/src/shared/data/dataLayering.js`

Backend:

- `server/src/responseNormalizers/dataOrigin.js`
- `server/src/responseNormalizers/entityNormalizers.js`
- `server/src/layeredServices/mergeCollections.js`

## 5. Merge Utilities

`mergeLayeredCollections(real, mock, config)`:

- normalizes both sources
- real wins over mock
- mock fills empty fields
- duplicate IDs are merged into `dataOrigin: "hybrid"`
- mock-only items remain `dataOrigin: "mock"`
- real-only items remain `dataOrigin: "real"`

## 6. Hybrid Service Layer

Backend `resolveHybridCollection` returns:

```js
{
  items,
  source: "real" | "mock" | "hybrid"
}
```

Frontend `buildHybridCollection` does the same kind of merge for pages that still receive separate real and mock arrays.

## 7. Widget Architecture

Dashboards should migrate from monolithic fetches to widgets:

- `StatsGrid`
- `RevenueChart`
- `ApprovalQueue`
- `ActivityFeed`
- `RevenueBreakdown`
- `LiveBookings`
- `DisputeCenter`
- `SystemHealth`
- `MaintenanceStatus`
- `QuickActions`

Each widget owns its fetch, socket listener, memoized selectors, loading state, and error state.

## 8. Feature Flag System

Frontend flags:

- `VITE_USE_MOCK_FALLBACK`
- `VITE_USE_HYBRID_DATA`
- `VITE_SHOW_DATA_ORIGIN_BADGES`
- `VITE_SIMULATE_REALTIME`

Backend flags:

- `USE_MOCK_FALLBACK`
- `USE_HYBRID_DATA`
- `INCLUDE_DATA_ORIGIN`
- `SEED_MOCK_DATA_ON_START`

## 9. Mock Alignment System

Mock data must use the same normalized contracts:

- users use `works`
- bookings use `services`, `totalAmount`, `date`, `time`
- transactions use `clientFee`, `providerFee`, `totalPaid`, `providerEarn`
- seeded users are `isMock: true`
- admin is never seeded

## 10. Websocket Update Strategy

Realtime events should carry:

```js
{
  type,
  entity,
  entityId,
  dataOrigin,
  patch,
  eventId,
  emittedAt
}
```

Consumers should de-dupe by `eventId`, patch only affected widget state, and preserve `dataOrigin`.

## 11. Seed Strategy

Use:

```bash
cd server
npm run seed:mock
```

The seeder clears mock-owned records only and never deletes real users or the admin. Seeded providers are marked `isMock: true`.

## 12. Example Implementation Files

- `client/src/features/adminDashboard/widgets/StatsGrid.jsx`
- `client/src/features/adminDashboard/widgets/index.js`
- `client/src/services/hybridDataService.js`
- `server/src/layeredServices/hybridDataService.js`
- `server/src/responseNormalizers/apiResponse.js`

## 13. Optimized React Rendering Strategy

- Lazy-load widgets with `React.lazy`.
- Keep socket subscriptions inside widgets.
- Use memoized selectors around merged collections.
- Avoid dashboard-wide state for widget-local updates.
- Keep optimistic patches keyed by entity ID and preserve `dataOrigin`.

## 14. Realtime-Safe Dashboard Architecture

The dashboard shell should render widgets only. Widgets fetch and subscribe independently:

```jsx
<Dashboard>
  <StatsGrid />
  <RevenueChart />
  <ApprovalQueue />
  <LiveBookings />
  <DisputeCenter />
</Dashboard>
```

This avoids full dashboard rerenders when one booking, transaction, or notification changes.
