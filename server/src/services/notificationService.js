const Notification = require("../models/Notification");
const {
  SOCKET_EVENTS,
  emitSocketEvent,
} = require("../utils/socketEvents");
const toObjectIdString = (value) => String(value || "");

const serializeNotification = (notification) => ({
  id: notification._id,
  title: notification.title,
  message: notification.message,
  type: notification.type || "general",
  actionUrl: notification.actionUrl || "",
  metadata: notification.metadata || {},
  read: Boolean(notification.read),
  createdAt: notification.createdAt,
  updatedAt: notification.updatedAt,
});

const getUnreadCount = async (userId) =>
  Notification.countDocuments({
    user: userId,
    read: false,
  });

const createNotification = async ({
  userId,
  title,
  message,
  type = "general",
  actionUrl = "",
  metadata = {},
}) => {
  const notification = await Notification.create({
    user: userId,
    title,
    message,
    type,
    actionUrl,
    metadata,
  });

  const unreadCount = await getUnreadCount(userId);

  emitSocketEvent({
    userIds: [userId],
    eventName: SOCKET_EVENTS.NOTIFICATION_CREATED,
    payload: {
      notification: serializeNotification(notification),
      unreadCount,
    },
  });

  return {
    notification,
    unreadCount,
  };
};

const markNotificationRead = async ({ userId, notificationId }) => {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      user: userId,
      read: false,
    },
    {
      $set: { read: true },
    },
    { new: true }
  ).lean();

  const unreadCount = await getUnreadCount(userId);

  if (notification) {
    emitSocketEvent({
      userIds: [userId],
      eventName: SOCKET_EVENTS.NOTIFICATION_READ,
      payload: {
        notificationIds: [toObjectIdString(notification._id)],
        unreadCount,
      },
    });
  }

  return {
    notification,
    unreadCount,
  };
};

const markNotificationsReadByFilter = async ({ userId, filter = {} }) => {
  const notifications = await Notification.find({
    user: userId,
    read: false,
    ...filter,
  })
    .select("_id")
    .lean();

  const notificationIds = notifications.map((notification) =>
    toObjectIdString(notification._id)
  );

  if (notificationIds.length) {
    await Notification.updateMany(
      {
        _id: { $in: notificationIds },
      },
      {
        $set: { read: true },
      }
    );
  }

  const unreadCount = await getUnreadCount(userId);

  emitSocketEvent({
    userIds: [userId],
    eventName: SOCKET_EVENTS.NOTIFICATION_READ,
    payload: {
      notificationIds,
      unreadCount,
    },
  });

  return {
    notificationIds,
    unreadCount,
  };
};

module.exports = {
  serializeNotification,
  getUnreadCount,
  createNotification,
  markNotificationRead,
  markNotificationsReadByFilter,
};
