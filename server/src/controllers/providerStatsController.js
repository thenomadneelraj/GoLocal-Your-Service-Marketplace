// server/src/controllers/providerStatsController.js
const Booking = require("../models/Booking");
const Provider = require("../models/Provider");
const Payout = require("../models/Payout");
const Review = require("../models/Review");
const PlatformSetting = require("../models/PlatformSetting");
const {
  BOOKING_STATUS,
  normalizeBookingStatus,
} = require("../utils/bookingStatus");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const toNumber = (value) => Number(value || 0);

const getDayKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const getMonthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const isSameLocalDay = (left, right) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const build7DaySeries = (payouts = []) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return {
      key: getDayKey(date),
      label: date.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      amount: 0,
    };
  });

  const seriesMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  payouts.forEach((payout) => {
    const createdAt = new Date(payout.createdAt);
    createdAt.setHours(0, 0, 0, 0);
    const key = getDayKey(createdAt);
    const bucket = seriesMap.get(key);
    if (bucket) {
      bucket.amount += toNumber(payout.netAmount);
    }
  });

  return buckets.map(({ label, amount }) => ({ label, amount }));
};

const build6MonthSeries = (payouts = []) => {
  const now = new Date();
  const buckets = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: getMonthKey(date),
      label: MONTHS[date.getMonth()],
      amount: 0,
    };
  });

  const seriesMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  payouts.forEach((payout) => {
    const createdAt = new Date(payout.createdAt);
    const key = getMonthKey(createdAt);
    const bucket = seriesMap.get(key);
    if (bucket) {
      bucket.amount += toNumber(payout.netAmount);
    }
  });

  return buckets.map(({ label, amount }) => ({ label, amount }));
};

const buildEmptyDashboard = (currency = "INR") => ({
  summary: {
    appointmentsBooked: 0,
    pendingRequests: 0,
    totalIncome: 0,
    totalClients: 0,
  },
  earnings7d: build7DaySeries(),
  earnings6m: build6MonthSeries(),
  todaySchedule: [],
  recentAppointments: [],
  topServices: [],
  currency,
});

const sortBookingsByDate = (left, right) => {
  const leftDate = new Date(left.bookingDate || left.createdAt || 0).getTime();
  const rightDate = new Date(right.bookingDate || right.createdAt || 0).getTime();

  if (leftDate !== rightDate) {
    return leftDate - rightDate;
  }

  return String(left.timeSlot || "").localeCompare(String(right.timeSlot || ""));
};

const serializeBooking = (booking) => ({
  id: booking._id,
  clientName: booking.clientId?.name || "Client",
  clientAvatar: booking.clientId?.profileImage || null,
  serviceTitle: booking.serviceId?.title || booking.serviceId?.name || "Service",
  status: normalizeBookingStatus(booking.status),
  bookingDate: booking.bookingDate ? booking.bookingDate.toISOString() : null,
  timeSlot: booking.timeSlot || "",
  amount: toNumber(booking.price),
});

const getProviderDashboard = async (req, res) => {
  try {
    const provider = await Provider.findOne({ userId: req.user._id });
    const settings = await PlatformSetting.findOne().lean();
    const currency = settings?.currency || "INR";

    if (!provider) {
      return res.json({ success: true, data: buildEmptyDashboard(currency) });
    }

    const [bookings, payouts] = await Promise.all([
      Booking.find({ providerId: provider._id })
        .populate("clientId", "name profileImage")
        .populate("serviceId", "title category price")
        .sort({ createdAt: -1 })
        .lean(),
      Payout.find({ providerId: provider._id }).sort({ createdAt: 1 }).lean(),
    ]);

    const activeBookings = bookings.filter(
      (booking) =>
        ![BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED].includes(
          normalizeBookingStatus(booking.status)
        )
    );
    const distinctClients = new Set(
      activeBookings
        .map((booking) => booking.clientId?._id?.toString() || booking.clientId?.toString())
        .filter(Boolean)
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySchedule = activeBookings
      .filter((booking) => {
        if (!booking.bookingDate) return false;
        const bookingDate = new Date(booking.bookingDate);
        return isSameLocalDay(bookingDate, today);
      })
      .sort(sortBookingsByDate)
      .map(serializeBooking);

    const recentAppointments = [...bookings]
      .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
      .slice(0, 5)
      .map(serializeBooking);

    const serviceCounts = new Map();
    activeBookings.forEach((booking) => {
      const serviceId = booking.serviceId?._id?.toString() || booking.serviceId?.toString();
      const serviceTitle = booking.serviceId?.title || booking.serviceId?.name || "Service";

      if (!serviceId) return;

      const current = serviceCounts.get(serviceId) || {
        serviceId,
        serviceTitle,
        bookings: 0,
      };

      current.bookings += 1;
      serviceCounts.set(serviceId, current);
    });

    const topServices = [...serviceCounts.values()]
      .sort((left, right) => right.bookings - left.bookings)
      .slice(0, 4);

    const topServiceMax = topServices[0]?.bookings || 0;

    res.json({
      success: true,
      data: {
        summary: {
          appointmentsBooked: activeBookings.length,
          pendingRequests: bookings.filter(
            (booking) => normalizeBookingStatus(booking.status) === BOOKING_STATUS.PENDING
          ).length,
          totalIncome: payouts.reduce((total, payout) => total + toNumber(payout.netAmount), 0),
          totalClients: distinctClients.size,
        },
        earnings7d: build7DaySeries(payouts),
        earnings6m: build6MonthSeries(payouts),
        todaySchedule,
        recentAppointments,
        topServices: topServices.map((service) => ({
          ...service,
          share: topServiceMax ? Math.round((service.bookings / topServiceMax) * 100) : 0,
        })),
        currency,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getEarnings = async (req, res) => {
  try {
    const provider = await Provider.findOne({ userId: req.user._id });
    if (!provider) return res.json({ success: true, data: [] });

    const payouts = await Payout.find({ providerId: provider._id }).sort({ createdAt: 1 }).lean();
    const data = build6MonthSeries(payouts).map((item) => ({
      month: item.label,
      earnings: item.amount,
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBookingsTrend = async (req, res) => {
  try {
    const provider = await Provider.findOne({ userId: req.user._id });
    if (!provider) return res.json({ success: true, data: [] });

    const bookings = await Booking.find({ providerId: provider._id }).lean();
    const dataMap = new Map(
      Array.from({ length: 6 }, (_, index) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - index), 1);
        return [getMonthKey(date), { month: MONTHS[date.getMonth()], jobs: 0 }];
      })
    );

    bookings.forEach((booking) => {
      if (
        [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED].includes(
          normalizeBookingStatus(booking.status)
        )
      ) return;
      const key = getMonthKey(new Date(booking.createdAt));
      const bucket = dataMap.get(key);
      if (bucket) bucket.jobs += 1;
    });

    res.json({ success: true, data: [...dataMap.values()] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getServicePerformance = async (req, res) => {
  try {
    const provider = await Provider.findOne({ userId: req.user._id });
    if (!provider) return res.json({ success: true, data: [] });

    const reviews = await Review.find({ providerId: provider._id });
    
    const ratingCounts = { "5 Star": 0, "4 Star": 0, "3 Star": 0, "Below 3": 0 };
    reviews.forEach(r => {
      if (r.rating === 5) ratingCounts["5 Star"]++;
      else if (r.rating === 4) ratingCounts["4 Star"]++;
      else if (r.rating === 3) ratingCounts["3 Star"]++;
      else ratingCounts["Below 3"]++;
    });

    const data = Object.entries(ratingCounts)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({ name, value }));

    res.json({ success: true, data: data.length ? data : [{ name: "No Ratings", value: 1 }] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getProviderPayouts = async (req, res) => {
  try {
    const provider = await Provider.findOne({ userId: req.user._id });
    if (!provider) return res.json({ success: true, data: { items: [], total: 0, totalEarnings: 0, pendingAmount: 0 } });

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const [items, total, allPayouts] = await Promise.all([
      Payout.find({ providerId: provider._id })
        .populate({ path: "bookingId", select: "price bookingDate serviceId", populate: { path: "serviceId", select: "title" } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payout.countDocuments({ providerId: provider._id }),
      Payout.find({ providerId: provider._id }).lean(),
    ]);

    const totalEarnings = allPayouts.reduce((sum, p) => sum + toNumber(p.netAmount), 0);
    const pendingAmount = allPayouts.filter(p => p.status === "pending").reduce((sum, p) => sum + toNumber(p.netAmount), 0);
    const lastPaid = allPayouts.filter(p => p.status === "paid").sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

    const serialized = items.map((p) => ({
      id: p._id,
      amount: toNumber(p.amount),
      commission: toNumber(p.commission),
      netAmount: toNumber(p.netAmount),
      status: p.status,
      createdAt: p.createdAt,
      payoutDate: p.payoutDate,
      bookingId: p.bookingId?._id || p.bookingId,
      serviceTitle: p.bookingId?.serviceId?.title || "Service",
    }));

    res.json({
      success: true,
      data: {
        items: serialized,
        total,
        page,
        pages: Math.ceil(total / limit),
        totalEarnings,
        pendingAmount,
        lastPaidAmount: lastPaid ? toNumber(lastPaid.netAmount) : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProviderDashboard,
  getEarnings,
  getBookingsTrend,
  getServicePerformance,
  getProviderPayouts,
};
