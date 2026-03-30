const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const {
  serializeNotification,
  getUnreadCount,
  markNotificationRead,
  markNotificationsReadByFilter,
} = require("../services/notificationService");

const isValidObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(String(value || ""));

const listNotifications = async (req, res) => {
  try {
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      50
    );

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      getUnreadCount(req.user._id),
    ]);

    res.json({
      success: true,
      data: {
        items: notifications.map(serializeNotification),
        unreadCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const markSingleNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid notification." });
    }

    const { notification, unreadCount } = await markNotificationRead({
      userId: req.user._id,
      notificationId: id,
    });

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found." });
    }

    res.json({
      success: true,
      data: {
        notification: serializeNotification(notification),
        unreadCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await markNotificationsReadByFilter({
      userId: req.user._id,
      filter: {},
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  listNotifications,
  markSingleNotificationRead,
  markAllNotificationsRead,
};
