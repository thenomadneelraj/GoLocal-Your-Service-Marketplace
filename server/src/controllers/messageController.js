const mongoose = require("mongoose");
const Message = require("../models/Message");
const Booking = require("../models/Booking");
const User = require("../models/User");
const {
  createNotification,
  markNotificationsReadByFilter,
} = require("../services/notificationService");
const { SOCKET_EVENTS, emitSocketEvent } = require("../utils/socketEvents");

const isValidObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(String(value || ""));

const toObjectIdString = (value) => String(value || "");

const serializeMessage = (message, currentUserId) => {
  const senderId = toObjectIdString(message.sender?._id || message.sender);
  const receiverId = toObjectIdString(
    message.receiver?._id || message.receiver,
  );

  return {
    _id: message._id,
    bookingId: message.bookingId,
    senderId,
    receiverId,
    content: message.content,
    read: message.read,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    isFromCurrentUser: senderId === currentUserId,
  };
};

const buildParticipantDirectory = async (userIds = []) => {
  const uniqueIds = [...new Set(userIds.map(toObjectIdString).filter(Boolean))];

  if (!uniqueIds.length) {
    return new Map();
  }

  const users = await User.find({ _id: { $in: uniqueIds } })
    .select(
      "email role name profileImage address location serviceType availability",
    )
    .lean();

  return new Map(
    users.map((user) => {
      const userId = toObjectIdString(user._id);
      return [
        userId,
        {
          userId,
          profileId: user._id,
          role: user.role,
          email: user.email,
          name: user.name || user.email?.split("@")[0] || "User",
          profilePhoto: user.profileImage || "",
          address: user.address || "",
          location: user.location || "",
          serviceType: user.serviceType || "",
          availability:
            typeof user.availability === "boolean"
              ? user.availability
              : undefined,
        },
      ];
    }),
  );
};

const ensureClientProviderPair = (currentUser, otherUser) => {
  const currentRole = String(currentUser?.role || "").toLowerCase();
  const otherRole = String(otherUser?.role || "").toLowerCase();
  const validRoles = ["client", "provider"];

  if (!validRoles.includes(currentRole) || !validRoles.includes(otherRole)) {
    return {
      ok: false,
      status: 403,
      message: "Messaging is only available between clients and providers.",
    };
  }

  if (currentRole === otherRole) {
    return {
      ok: false,
      status: 403,
      message: "Messaging is only available between clients and providers.",
    };
  }

  return { ok: true };
};

const findOtherUser = async (otherUserId) => {
  if (!isValidObjectId(otherUserId)) {
    return null;
  }

  return User.findById(otherUserId).select("email role").lean();
};

const buildConversationKey = (userIds = []) =>
  [...new Set(userIds.map(toObjectIdString).filter(Boolean))].sort().join(":");

const listConversations = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const messages = await Message.find({
      $or: [{ sender: currentUserId }, { receiver: currentUserId }],
    })
      .sort({ createdAt: -1 })
      .lean();

    const summaries = new Map();

    messages.forEach((message) => {
      const isOutgoing =
        toObjectIdString(message.sender) === toObjectIdString(currentUserId);
      const counterpartId = toObjectIdString(
        isOutgoing ? message.receiver : message.sender,
      );

      if (!counterpartId) {
        return;
      }

      if (!summaries.has(counterpartId)) {
        summaries.set(counterpartId, {
          counterpartId,
          bookingId: message.bookingId,
          lastMessage: serializeMessage(message, currentUserId),
          unreadCount: 0,
          lastMessageAt: message.createdAt,
        });
      }

      if (!isOutgoing && !message.read) {
        const current = summaries.get(counterpartId);
        current.unreadCount += 1;
      }
    });

    const participants = await buildParticipantDirectory([...summaries.keys()]);

    const conversations = [...summaries.values()]
      .map((summary) => ({
        participant: participants.get(summary.counterpartId) || {
          userId: summary.counterpartId,
          profileId: null,
          role: "user",
          email: "",
          name: "User",
          profilePhoto: "",
          address: "",
          location: "",
          serviceType: "",
        },
        unreadCount: summary.unreadCount,
        bookingId: summary.bookingId,
        lastMessage: summary.lastMessage,
        lastMessageAt: summary.lastMessageAt,
      }))
      .sort(
        (left, right) =>
          new Date(right.lastMessageAt || 0) -
          new Date(left.lastMessageAt || 0),
      );

    res.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getConversationThread = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { bookingId } = req.params;

    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    const booking = await Booking.findById(bookingId)
      .select("clientId providerId")
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    // Verify user is part of this booking
    if (
      booking.clientId.toString() !== currentUserId.toString() &&
      booking.providerId.toString() !== currentUserId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view messages for this booking.",
      });
    }

    const [messages, participants] = await Promise.all([
      Message.find({ bookingId }).sort({ createdAt: -1 }).lean(),
      buildParticipantDirectory([booking.clientId, booking.providerId]),
    ]);

    res.json({
      success: true,
      data: {
        bookingId: booking._id,
        participants: {
          client: participants.get(booking.clientId.toString()) || null,
          provider: participants.get(booking.providerId.toString()) || null,
        },
        messages: messages
          .map((message) => serializeMessage(message, currentUserId))
          .reverse(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMessageContact = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid contact target." });
    }

    if (toObjectIdString(req.user._id) === toObjectIdString(userId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot open a chat with yourself.",
      });
    }

    const otherUser = await findOtherUser(userId);
    if (!otherUser) {
      return res
        .status(404)
        .json({ success: false, message: "Contact not found." });
    }

    const pairCheck = ensureClientProviderPair(req.user, otherUser);
    if (!pairCheck.ok) {
      return res
        .status(pairCheck.status)
        .json({ success: false, message: pairCheck.message });
    }

    const participants = await buildParticipantDirectory([userId]);
    res.json({
      success: true,
      data: participants.get(toObjectIdString(userId)) || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { bookingId, content } = req.body;
    const trimmedContent = String(content || "").trim();

    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "A valid booking ID is required.",
      });
    }

    if (!trimmedContent) {
      return res.status(400).json({
        success: false,
        message: "Message content is required.",
      });
    }

    if (trimmedContent.length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Message content must be 2000 characters or less.",
      });
    }

    const booking = await Booking.findById(bookingId)
      .select("clientId providerId")
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    // Verify user is part of this booking
    if (
      booking.clientId.toString() !== senderId.toString() &&
      booking.providerId.toString() !== senderId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to send messages for this booking.",
      });
    }

    const receiverId =
      booking.clientId.toString() === senderId.toString()
        ? booking.providerId
        : booking.clientId;

    const message = await Message.create({
      bookingId,
      sender: senderId,
      receiver: receiverId,
      content: trimmedContent,
    });

    const [savedMessage, participants] = await Promise.all([
      Message.findById(message._id).lean(),
      buildParticipantDirectory([senderId, receiverId]),
    ]);

    const payload = {
      message: serializeMessage(savedMessage, senderId),
      bookingId: bookingId,
      receiver: participants.get(toObjectIdString(receiverId)) || null,
      sender: participants.get(toObjectIdString(senderId)) || null,
    };

    const senderProfile = participants.get(toObjectIdString(senderId));
    const receiverRoute =
      String(receiver.role || "").toLowerCase() === "provider"
        ? "/provider/chat"
        : "/client/chat";

    await createNotification({
      userId: receiverId,
      title: `New message from ${senderProfile?.name || "User"}`,
      message: trimmedContent,
      type: "message",
      actionUrl: `${receiverRoute}?booking=${toObjectIdString(bookingId)}`,
      metadata: {
        bookingId: toObjectIdString(bookingId),
        senderId: toObjectIdString(senderId),
      },
    });

    emitSocketEvent({
      userIds: [senderId, receiverId],
      bookingIds: [bookingId],
      eventName: SOCKET_EVENTS.MESSAGE_SENT,
      payload: {
        ...payload,
        bookingId: toObjectIdString(bookingId),
      },
    });

    res.status(201).json({
      success: true,
      message: "Message sent successfully.",
      data: payload,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const markConversationRead = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { bookingId } = req.params;

    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    const booking = await Booking.findById(bookingId)
      .select("clientId providerId")
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    // Verify user is part of this booking
    if (
      booking.clientId.toString() !== currentUserId.toString() &&
      booking.providerId.toString() !== currentUserId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to mark messages for this booking.",
      });
    }

    const otherUserId =
      booking.clientId.toString() === currentUserId.toString()
        ? booking.providerId
        : booking.clientId;

    const result = await Message.updateMany(
      {
        bookingId,
        receiver: currentUserId,
        read: false,
      },
      {
        $set: { read: true },
      },
    );

    await markNotificationsReadByFilter({
      userId: currentUserId,
      filter: {
        type: "message",
        "metadata.bookingId": toObjectIdString(bookingId),
      },
    });

    emitSocketEvent({
      userIds: [currentUserId, otherUserId],
      bookingIds: [bookingId],
      eventName: SOCKET_EVENTS.MESSAGE_READ,
      payload: {
        bookingId: toObjectIdString(bookingId),
        readerId: toObjectIdString(currentUserId),
      },
    });

    res.json({
      success: true,
      data: {
        updatedCount: result.modifiedCount || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  listConversations,
  getConversationThread,
  getMessageContact,
  sendMessage,
  markConversationRead,
};
