// server/src/controllers/clientStatsController.js
const Booking = require("../models/Booking");
const Transaction = require("../models/Transaction");
const Client = require("../models/Client");
const PlatformSetting = require("../models/PlatformSetting");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const normalizeStatus = (status = "") => String(status || "").trim().toLowerCase();
const toNumber = (value) => Number(value || 0);

const getDayKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const getMonthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const isFutureOrToday = (date) => {
  const compare = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  compare.setHours(0, 0, 0, 0);
  return compare >= today;
};

const sortBookingsBySchedule = (left, right) => {
  const leftDate = new Date(left.bookingDate || left.createdAt || 0).getTime();
  const rightDate = new Date(right.bookingDate || right.createdAt || 0).getTime();

  if (leftDate !== rightDate) {
    return leftDate - rightDate;
  }

  return String(left.timeSlot || "").localeCompare(String(right.timeSlot || ""));
};

const build6MonthOverview = (bookings = [], transactions = []) => {
  const now = new Date();
  const buckets = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: getMonthKey(date),
      label: MONTHS[date.getMonth()],
      bookings: 0,
      spend: 0,
    };
  });

  const seriesMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  bookings.forEach((booking) => {
    if (normalizeStatus(booking.status) === "cancelled") return;
    const bucket = seriesMap.get(getMonthKey(new Date(booking.createdAt)));
    if (bucket) bucket.bookings += 1;
  });

  transactions.forEach((transaction) => {
    if (normalizeStatus(transaction.status) !== "success") return;
    const bucket = seriesMap.get(getMonthKey(new Date(transaction.createdAt)));
    if (bucket) bucket.spend += toNumber(transaction.amount);
  });

  return buckets.map(({ label, bookings: bookingCount, spend }) => ({
    label,
    bookings: bookingCount,
    spend,
  }));
};

const build30DayOverview = (bookings = [], transactions = []) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets = Array.from({ length: 5 }, (_, index) => {
    const bucketStart = new Date(today);
    bucketStart.setDate(today.getDate() - (28 - index * 7));
    return {
      start: new Date(bucketStart),
      end: new Date(bucketStart.getFullYear(), bucketStart.getMonth(), bucketStart.getDate() + 6, 23, 59, 59, 999),
      label: bucketStart.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      bookings: 0,
      spend: 0,
    };
  });

  const findBucket = (value) =>
    buckets.find((bucket) => value >= bucket.start && value <= bucket.end);

  bookings.forEach((booking) => {
    if (normalizeStatus(booking.status) === "cancelled") return;
    const bucket = findBucket(new Date(booking.createdAt));
    if (bucket) bucket.bookings += 1;
  });

  transactions.forEach((transaction) => {
    if (normalizeStatus(transaction.status) !== "success") return;
    const bucket = findBucket(new Date(transaction.createdAt));
    if (bucket) bucket.spend += toNumber(transaction.amount);
  });

  return buckets.map(({ label, bookings: bookingCount, spend }) => ({
    label,
    bookings: bookingCount,
    spend,
  }));
};

const build7DayActivity = (bookings = []) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return {
      key: getDayKey(date),
      label: date.toLocaleDateString("en-IN", { weekday: "short" }),
      count: 0,
    };
  });

  const map = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  bookings.forEach((booking) => {
    if (normalizeStatus(booking.status) === "cancelled") return;
    const bucket = map.get(getDayKey(new Date(booking.createdAt)));
    if (bucket) bucket.count += 1;
  });

  return buckets.map(({ label, count }) => ({ label, count }));
};

const serializeBookingForClient = (booking) => ({
  id: booking._id,
  providerName: booking.providerId?.name || "Provider",
  providerId: booking.providerId?._id || null,
  serviceTitle: booking.serviceId?.title || booking.serviceId?.name || "Service",
  status: normalizeStatus(booking.status),
  bookingDate: booking.bookingDate ? booking.bookingDate.toISOString() : null,
  timeSlot: booking.timeSlot || "",
  amount: toNumber(booking.price),
});

const buildEmptyDashboard = (currency = "INR") => ({
  summary: {
    activeProviders: 0,
    ongoingProjects: 0,
    totalSpent: 0,
    upcomingMeetings: 0,
  },
  overview30d: build30DayOverview(),
  overview6m: build6MonthOverview(),
  taskOverview: [],
  recentProviders: [],
  activity7d: build7DayActivity(),
  upcomingMeetings: [],
  currency,
});

const getClientDashboard = async (req, res) => {
  try {
    const client = await Client.findOne({ userId: req.user._id });
    const settings = await PlatformSetting.findOne().lean();
    const currency = settings?.currency || "INR";

    if (!client) {
      return res.json({ success: true, data: buildEmptyDashboard(currency) });
    }

    const [bookings, transactions] = await Promise.all([
      Booking.find({ clientId: client._id })
        .populate("providerId", "name")
        .populate("serviceId", "title category price")
        .sort({ createdAt: -1 })
        .lean(),
      Transaction.find({ clientId: client._id }).sort({ createdAt: 1 }).lean(),
    ]);

    const activeBookings = bookings.filter(
      (booking) => normalizeStatus(booking.status) !== "cancelled"
    );

    const activeProviders = new Set(
      activeBookings
        .map((booking) => booking.providerId?._id?.toString() || booking.providerId?.toString())
        .filter(Boolean)
    );

    const futureBookings = activeBookings
      .filter((booking) => booking.bookingDate && isFutureOrToday(new Date(booking.bookingDate)))
      .sort(sortBookingsBySchedule);

    const recentProviders = [...bookings]
      .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
      .slice(0, 5)
      .map(serializeBookingForClient);

    const upcomingMeetings = futureBookings.slice(0, 3).map(serializeBookingForClient);

    res.json({
      success: true,
      data: {
        summary: {
          activeProviders: activeProviders.size,
          ongoingProjects: activeBookings.filter(
            (booking) => normalizeStatus(booking.status) === "confirmed"
          ).length,
          totalSpent: transactions.reduce((total, transaction) => {
            return normalizeStatus(transaction.status) === "success"
              ? total + toNumber(transaction.amount)
              : total;
          }, 0),
          upcomingMeetings: futureBookings.length,
        },
        overview30d: build30DayOverview(bookings, transactions),
        overview6m: build6MonthOverview(bookings, transactions),
        taskOverview: upcomingMeetings,
        recentProviders,
        activity7d: build7DayActivity(bookings),
        upcomingMeetings,
        currency,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBookingsStats = async (req, res) => {
  try {
    const client = await Client.findOne({ userId: req.user._id });
    if (!client) return res.json({ success: true, data: [{ month: "No Data", bookings: 0 }], upcomingCount: 0 });

    const bookings = await Booking.find({ clientId: client._id });
    
    // Monthly trend
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const jobsByMonth = {};
    
    let upcomingCount = 0;
    
    bookings.forEach(b => {
      if (b.status !== "cancelled" && b.status !== "CANCELLED") {
        const m = months[b.createdAt.getMonth()];
        jobsByMonth[m] = (jobsByMonth[m] || 0) + 1;
      }
      if (b.status === "confirmed" || b.status === "CONFIRMED") upcomingCount++;
    });

    const data = Object.keys(jobsByMonth).map(m => ({
      month: m,
      bookings: jobsByMonth[m]
    }));

    res.json({ success: true, data: data.length ? data : [{ month: "No Data", bookings: 0 }], upcomingCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSpendingStats = async (req, res) => {
  try {
    const client = await Client.findOne({ userId: req.user._id });
    if (!client) return res.json({ success: true, data: [{ month: "No Data", spent: 0 }] });

    const transactions = await Transaction.find({ clientId: client._id, status: { $in: ["SUCCESS", "success"] } });
    
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const spendingByMonth = {};
    
    transactions.forEach(t => {
      const m = months[t.createdAt.getMonth()];
      spendingByMonth[m] = (spendingByMonth[m] || 0) + t.amount;
    });

    const data = Object.keys(spendingByMonth).map(m => ({
      month: m,
      spent: spendingByMonth[m]
    }));

    res.json({ success: true, data: data.length ? data : [{ month: "No Data", spent: 0 }] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCategoryStats = async (req, res) => {
  try {
    const client = await Client.findOne({ userId: req.user._id });
    if (!client) return res.json({ success: true, data: [{ name: "No Services", value: 1 }] });

    const bookings = await Booking.find({ clientId: client._id }).populate("serviceId");
    
    const categories = {};
    bookings.forEach(b => {
      if (b.serviceId && b.serviceId.category) {
        const cat = b.serviceId.category;
        categories[cat] = (categories[cat] || 0) + 1;
      } else {
        categories["Others"] = (categories["Others"] || 0) + 1;
      }
    });

    const data = Object.keys(categories).map(cat => ({
      name: cat,
      value: categories[cat]
    }));

    res.json({ success: true, data: data.length ? data : [{ name: "No Services", value: 1 }] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getClientDashboard,
  getBookingsStats,
  getSpendingStats,
  getCategoryStats,
};
