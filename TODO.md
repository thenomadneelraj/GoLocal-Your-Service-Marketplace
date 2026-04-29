**Current Task Progress**

# Fix Admin User Count + Action Consistency

✅ **Step 1 Complete**: Analyzed files, confirmed discrepancy (dashboard DB count=1 vs Users layered=3)

## TODO Steps:

### 1. ~~[x]~~ Create this TODO.md

### 2. [✅] Update AdminDashboard.jsx for consistent user count

- Import necessary: fetchAdminUsers, mockAdminUsers, mergeLayeredCollections, useSocketEvent
- Add [payload, setPayload] state for users
- loadUsers = async () => fetchAdminUsers({})
- Compute layeredItems, mockSummary, layeredSummary exactly like AdminUsers.jsx
- resolvedSummary.totalUsers = layeredSummary.totalUsers
- Add useSocketEvent('user_updated', () => loadUsers(true))
- pendingProviders from layeredSummary.pendingApproval

### 3. [✅] Verify AdminUsers.jsx actions propagate

- Already invalidates users cache → both pages refresh if using same fetch
- Add invalidateCache.dashboard() after success for safety

### 4. [ ] Test URLs

- http://localhost:5173/admin → totalUsers=3
- http://localhost:5173/admin/users → totalUsers=3 (stats + list)
- Approve/suspend → both pages update real-time
- Reject → user gone from both, no crash

### 5. [ ] [attempt_completion]
