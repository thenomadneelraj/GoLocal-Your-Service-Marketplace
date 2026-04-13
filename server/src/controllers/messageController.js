const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const {
  createNotification,
  markNotificationsReadByFilter,
} = require("../services/notificationService");
const {
  SOCKET_EVENTS,
  emitSocketEvent,
} = require("../utils/socketEvents");
const {
  findConversationByParticipants,
  findOrCreateConversation,
} = require("../services/conversationService");

const isValidObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(String(value || ""));

const toObjectIdString = (value) => String(value || "");

const serializeMessage = (message, currentUserId) => {
  const senderId = toObjectIdString(message.sender?._id || message.sender);
  const receiverId = toObjectIdString(message.receiver?._id || message.receiver);

  return {
    id: message._id,
    content: message.content,
    read: Boolean(message.read),
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    senderId,
    receiverId,
    direction: senderId === toObjectIdString(currentUserId) ? "outgoing" : "incoming",
  };
};

const buildParticipantDirectory = async (userIds = []) => {
  const uniqueIds = [...new Set(userIds.map(toObjectIdString).filter(Boolean))];

  if (!uniqueIds.length) {
    return new Map();
  }

  const users = await User.find({ _id: { $in: uniqueIds } }).select("email role name profileImage address location serviceType availability").lean();

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
          availability: typeof user.availability === "boolean" ? user.availability : undefined,
        },
      ];
    })
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
  [...new Set(userIds.map(toObjectIdString).filter(Boolean))]
    .sort()
    .join(":");

const listConversations = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const [messages, seededConversations] = await Promise.all([
      Message.find({
        $or: [{ sender: currentUserId }, { receiver: currentUserId }],
      })
        .sort({ createdAt: -1 })
        .lean(),
      Conversation.find({
        participants: currentUserId,
      })
        .sort({ updatedAt: -1, createdAt: -1 })
        .lean(),
    ]);

    const summaries = new Map();

    messages.forEach((message) => {
      const isOutgoing =
        toObjectIdString(message.sender) === toObjectIdString(currentUserId);
      const counterpartId = toObjectIdString(
        isOutgoing ? message.receiver : message.sender
      );

      if (!counterpartId) {
        return;
      }

      if (!summaries.has(counterpartId)) {
        summaries.set(counterpartId, {
          counterpartId,
          conversationId:
            message.conversationId ||
            buildConversationKey([currentUserId, counterpartId]),
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

    seededConversations.forEach((conversation) => {
      const counterpartId = conversation.participants
        ?.map(toObjectIdString)
        .find((participantId) => participantId !== toObjectIdString(currentUserId));

      if (!counterpartId) {
        return;
      }

      if (!summaries.has(counterpartId)) {
        summaries.set(counterpartId, {
          counterpartId,
          conversationId: conversation._id,
          lastMessage: null,
          unreadCount: 0,
          lastMessageAt: conversation.updatedAt || conversation.createdAt,
        });
        return;
      }

      const current = summaries.get(counterpartId);
      current.conversationId = current.conversationId || conversation._id;
      if (!current.lastMessageAt) {
        current.lastMessageAt = conversation.updatedAt || conversation.createdAt;
      }
    });

    const participants = await buildParticipantDirectory([...summaries.keys()]);

    const conversations = [...summaries.values()]
      .map((summary) => ({
        participant:
          participants.get(summary.counterpartId) || {
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
        conversationId: summary.conversationId,
        lastMessage: summary.lastMessage,
        lastMessageAt: summary.lastMessageAt,
      }))
      .sort(
        (left, right) =>
          new Date(right.lastMessageAt || 0) - new Date(left.lastMessageAt || 0)
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
    const { otherUserId } = req.params;

    if (!isValidObjectId(otherUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation target.",
      });
    }

    if (toObjectIdString(currentUserId) === toObjectIdString(otherUserId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot message yourself.",
      });
    }

    const otherUser = await findOtherUser(otherUserId);
    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: "Conversation participant not found.",
      });
    }

    const pairCheck = ensureClientProviderPair(req.user, otherUser);
    if (!pairCheck.ok) {
      return res
        .status(pairCheck.status)
        .json({ success: false, message: pairCheck.message });
    }

    const conversation = await findConversationByParticipants([
      currentUserId,
      otherUserId,
    ]);

    const [messages, participants] = await Promise.all([
      Message.find(
        conversation?._id
          ? { conversationId: conversation._id }
          : {
              $or: [
                { sender: currentUserId, receiver: otherUserId },
                { sender: otherUserId, receiver: currentUserId },
              ],
            }
      )
        .sort({ createdAt: 1 })
        .lean(),
      buildParticipantDirectory([otherUserId]),
    ]);

    res.json({
      success: true,
      data: {
        conversationId: conversation?._id || null,
        participant: participants.get(toObjectIdString(otherUserId)) || null,
        messages: messages.map((message) =>
          serializeMessage(message, currentUserId)
        ),
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
      return res
        .status(400)
        .json({ success: false, message: "You cannot open a chat with yourself." });
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
    const { receiverId, content } = req.body;
    const trimmedContent = String(content || "").trim();

    if (!isValidObjectId(receiverId)) {
      return res.status(400).json({
        success: false,
        message: "A valid message recipient is required.",
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

    if (toObjectIdString(senderId) === toObjectIdString(receiverId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot message yourself.",
      });
    }

    const receiver = await findOtherUser(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Recipient not found.",
      });
    }

    const pairCheck = ensureClientProviderPair(req.user, receiver);
    if (!pairCheck.ok) {
      return res
        .status(pairCheck.status)
        .json({ success: false, message: pairCheck.message });
    }

    const conversation = await findOrCreateConversation([senderId, receiverId]);

    const message = await Message.create({
      conversationId: conversation?._id || undefined,
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
      conversationId: conversation?._id || null,
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
      actionUrl: `${receiverRoute}?contact=${toObjectIdString(senderId)}`,
      metadata: {
        conversationUserId: toObjectIdString(senderId),
        senderId: toObjectIdString(senderId),
      },
    });

    emitSocketEvent({
      userIds: [senderId, receiverId],
      conversationIds: conversation?._id ? [conversation._id] : [],
      eventName: SOCKET_EVENTS.MESSAGE_SENT,
      payload: {
        ...payload,
        conversationUserId: toObjectIdString(senderId),
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
    const { otherUserId } = req.params;

    if (!isValidObjectId(otherUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation target.",
      });
    }

    const otherUser = await findOtherUser(otherUserId);
    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: "Conversation participant not found.",
      });
    }

    const pairCheck = ensureClientProviderPair(req.user, otherUser);
    if (!pairCheck.ok) {
      return res
        .status(pairCheck.status)
        .json({ success: false, message: pairCheck.message });
    }

    const result = await Message.updateMany(
      {
        sender: otherUserId,
        receiver: currentUserId,
        read: false,
      },
      {
        $set: { read: true },
      }
    );

    await markNotificationsReadByFilter({
      userId: currentUserId,
      filter: {
        type: "message",
        "metadata.conversationUserId": toObjectIdString(otherUserId),
      },
    });

    const conversation = await findConversationByParticipants([
      currentUserId,
      otherUserId,
    ]);

    emitSocketEvent({
      userIds: [currentUserId, otherUserId],
      conversationIds: conversation?._id ? [conversation._id] : [],
      eventName: SOCKET_EVENTS.MESSAGE_READ,
      payload: {
        conversationId: conversation?._id || null,
        conversationUserId: toObjectIdString(currentUserId),
        readerId: toObjectIdString(currentUserId),
        counterpartId: toObjectIdString(otherUserId),
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
