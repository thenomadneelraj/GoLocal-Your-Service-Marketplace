const MOCK_EXPORT_ROWS = {
  users: [
    {
      name: "Riya Sharma",
      email: "riya.sample@golocal.test",
      role: "provider",
      status: "active",
      approvalStatus: "approved",
      joinedAt: "4/9/2026, 1:50 PM",
      type: "mock",
      activityAt: "2026-04-09T08:20:00.000Z",
    },
    {
      name: "Kabir Patel",
      email: "kabir.sample@golocal.test",
      role: "provider",
      status: "pending",
      approvalStatus: "pending",
      joinedAt: "4/8/2026, 7:10 PM",
      type: "mock",
      activityAt: "2026-04-08T13:40:00.000Z",
    },
  ],
  bookings: [
    {
      service: "Deep Cleaning",
      client: "Arjun Mehta",
      provider: "Riya Sharma",
      schedule: "4/10/2026, 4:30 PM",
      status: "accepted",
      payment: "paid",
      amount: "INR 3,200",
      type: "mock",
      activityAt: "2026-04-09T08:10:00.000Z",
    },
    {
      service: "AC Maintenance",
      client: "Tanvi Gupta",
      provider: "Kabir Patel",
      schedule: "4/12/2026, 1:00 PM",
      status: "pending",
      payment: "pending",
      amount: "INR 1,850",
      type: "mock",
      activityAt: "2026-04-08T13:45:00.000Z",
    },
  ],
  transactions: [
    {
      reference: "TX-MOCK-3401",
      provider: "Riya Sharma",
      service: "Deep Cleaning",
      clientPaid: "INR 3,200",
      platformFee: "INR 320",
      status: "paid",
      createdAt: "4/9/2026, 1:40 PM",
      type: "mock",
      activityAt: "2026-04-09T08:10:00.000Z",
    },
    {
      reference: "TX-MOCK-3402",
      provider: "Kabir Patel",
      service: "AC Maintenance",
      clientPaid: "INR 1,850",
      platformFee: "INR 185",
      status: "pending",
      createdAt: "4/8/2026, 7:15 PM",
      type: "mock",
      activityAt: "2026-04-08T13:45:00.000Z",
    },
  ],
  disputes: [
    {
      booking: "#CK4201",
      client: "Arjun Mehta",
      provider: "Riya Sharma",
      reason: "Late Arrival",
      status: "under_review",
      createdAt: "4/9/2026, 2:50 PM",
      type: "mock",
      activityAt: "2026-04-09T09:20:00.000Z",
    },
    {
      booking: "Platform",
      client: "Nisha Rao",
      provider: "-",
      reason: "Platform Bug",
      status: "open",
      createdAt: "4/8/2026, 1:10 PM",
      type: "mock",
      activityAt: "2026-04-08T07:40:00.000Z",
    },
  ],
  compliance: [
    {
      metric: "Sample Dataset Included",
      value: "Yes",
      type: "mock",
      activityAt: "2026-04-09T08:00:00.000Z",
    },
    {
      metric: "Analytics Impact",
      value: "Excluded from live metrics",
      type: "mock",
      activityAt: "2026-04-08T08:00:00.000Z",
    },
  ],
};

const getTimestamp = (value) => {
  if (!value) return 0;
  const date = new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
};

const sortLayeredRows = (rows = []) =>
  [...rows].sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === "real" ? -1 : 1;
    }

    return getTimestamp(right.activityAt) - getTimestamp(left.activityAt);
  });

const mergeLayeredExportRows = (realRows = [], mockRows = []) =>
  sortLayeredRows([
    ...realRows.map((row) => ({
      ...row,
      type: row.type || "real",
    })),
    ...mockRows.map((row) => ({
      ...row,
      type: row.type || "mock",
    })),
  ]).map(({ activityAt, ...row }) => row);

const getMockAdminExportRows = (packageType = "") =>
  MOCK_EXPORT_ROWS[String(packageType || "").trim().toLowerCase()] || [];

module.exports = {
  getMockAdminExportRows,
  mergeLayeredExportRows,
};
