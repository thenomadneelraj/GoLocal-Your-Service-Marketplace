const mongoose = require("mongoose");
const Message = require("../models/Message");
const User = require("../models/User");
const Client = require("../models/Client");
const Provider = require("../models/Provider");
const socketIO = require("../socket");
const {
  createNotification,
  markNotificationsReadByFilter,
} = require("../services/notificationService");

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

  const [users, clients, providers] = await Promise.all([
    User.find({ _id: { $in: uniqueIds } }).select("email role").lean(),
    Client.find({ userId: { $in: uniqueIds } })
      .select("_id userId name profileImage address")
      .lean(),
    Provider.find({ userId: { $in: uniqueIds } })
      .select("_id userId name profileImage address location serviceType availability")
      .lean(),
  ]);

  const clientMap = new Map(
    clients.map((profile) => [toObjectIdString(profile.userId), profile])
  );
  const providerMap = new Map(
    providers.map((profile) => [toObjectIdString(profile.userId), profile])
  );

  return new Map(
    users.map((user) => {
      const userId = toObjectIdString(user._id);
      const clientProfile = clientMap.get(userId);
      const providerProfile = providerMap.get(userId);
      const primaryProfile =
        user.role === "provider" ? providerProfile : clientProfile;

      return [
        userId,
        {
          userId,
          profileId:
            primaryProfile?._id ||
            providerProfile?._id ||
            clientProfile?._id ||
            null,
          role: user.role,
          email: user.email,
          name:
            primaryProfile?.name ||
            providerProfile?.name ||
            clientProfile?.name ||
            user.email?.split("@")[0] ||
            "User",
          profilePhoto:
            primaryProfile?.profileImage ||
            providerProfile?.profileImage ||
            clientProfile?.profileImage ||
            "",
          address:
            primaryProfile?.address ||
            providerProfile?.address ||
            clientProfile?.address ||
            "",
          location: providerProfile?.location || "",
          serviceType: providerProfile?.serviceType || "",
          availability:
            typeof providerProfile?.availability === "boolean"
              ? providerProfile.availability
              : undefined,
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

const emitSocketEvent = (targets, eventName, payload) => {
  try {
    const io = socketIO.getIO();
    [...new Set(targets.map(toObjectIdString).filter(Boolean))].forEach((target) => {
      io.to(target).emit(eventName, payload);
    });
  } catch (error) {
    console.error(`Socket emit failed for ${eventName}:`, error.message);
  }
};

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
        isOutgoing ? message.receiver : message.sender
      );

      if (!counterpartId) {
        return;
      }

      if (!summaries.has(counterpartId)) {
        summaries.set(counterpartId, {
          counterpartId,
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
        lastMessage: summary.lastMessage,
        lastMessageAt: summary.lastMessageAt,
      }))
      .sort((left, right) => new Date(right.lastMessageAt) - new Date(left.lastMessageAt));

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

    const [messages, participants] = await Promise.all([
      Message.find({
        $or: [
          { sender: currentUserId, receiver: otherUserId },
          { sender: otherUserId, receiver: currentUserId },
        ],
      })
        .sort({ createdAt: 1 })
        .lean(),
      buildParticipantDirectory([otherUserId]),
    ]);

    res.json({
      success: true,
      data: {
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

    const message = await Message.create({
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
      receiver: participants.get(toObjectIdString(receiverId)) || null,
      sender: participants.get(toObjectIdString(senderId)) || null,
    };

    const senderProfile = participants.get(toObjectIdString(senderId));
    const receiverRoute =
      String(receiver.role || "").toLowerCase() === "provider"
        ? "/provider/messages"
        : "/messages";

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

    emitSocketEvent(
      [senderId, receiverId],
      "message:new",
      {
        ...payload,
        conversationUserId: toObjectIdString(senderId),
      }
    );

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

    emitSocketEvent(
      [currentUserId, otherUserId],
      "message:read",
      {
        conversationUserId: toObjectIdString(currentUserId),
        readerId: toObjectIdString(currentUserId),
        counterpartId: toObjectIdString(otherUserId),
      }
    );

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
