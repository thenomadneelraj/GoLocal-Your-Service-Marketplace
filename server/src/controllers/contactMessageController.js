const ContactMessage = require("../models/ContactMessage");
const { createNotification } = require("../services/notificationService");
const { emitSocketEvent, SOCKET_EVENTS } = require("../utils/socketEvents");

const buildMessagePayload = (message) => ({
  id: message._id,
  userId: message.userId || null,
  userRole: message.userRole || "",
  name: message.name,
  email: message.email,
  subject: message.subject,
  message: message.message,
  category: message.category,
  status: message.status,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
});

const createContactMessage = async (req, res) => {
  try {
    const { name, email, subject, message, category } = req.body || {};

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email, subject, and message are required.",
      });
    }

    const createdMessage = await ContactMessage.create({
      userId: req.user?._id,
      userRole: String(req.user?.role || "").toLowerCase(),
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      subject: String(subject).trim(),
      message: String(message).trim(),
      category: String(category || "support").trim().toLowerCase(),
      status: "pending",
    });

    // Create notification for admin dashboard
    await createNotification({
      userId: null, // Goes to all admins
      title: `New Support Ticket: ${category || "Support"}`,
      message: `${name} (${email}) submitted a support ticket: "${subject}"`,
      type: "support",
      actionUrl: `/admin/contact-messages`,
      metadata: {
        messageId: createdMessage._id.toString(),
        category: category || "support",
        userId: req.user?._id?.toString(),
      },
    });

    // Emit socket event for real-time admin notification
    emitSocketEvent({
      eventName: SOCKET_EVENTS.NOTIFICATION_CREATED,
      payload: {
        notification: {
          id: `msg_${createdMessage._id}`,
          type: "support",
          title: `New Support Ticket: ${category || "Support"}`,
          message: `${name} submitted a support ticket: "${subject}"`,
          createdAt: new Date().toISOString(),
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Your support ticket has been submitted successfully. Our team will respond within 24 hours.",
      data: buildMessagePayload(createdMessage),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const listMyContactMessages = async (req, res) => {
  try {
    const userEmail = String(req.user?.email || "").trim().toLowerCase();
    const messages = await ContactMessage.find({
      $or: [{ userId: req.user._id }, ...(userEmail ? [{ email: userEmail }] : [])],
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        items: messages.map(buildMessagePayload),
        total: messages.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const listContactMessages = async (req, res) => {
  try {
    const { status, search } = req.query || {};
    const filter = {};

    if (status) {
      filter.status = String(status).trim().toLowerCase();
    }

    if (search) {
      const regex = new RegExp(String(search).trim(), "i");
      filter.$or = [
        { name: regex },
        { email: regex },
        { subject: regex },
        { message: regex },
      ];
    }

    const messages = await ContactMessage.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        items: messages.map(buildMessagePayload),
        total: messages.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createContactMessage,
  listContactMessages,
  listMyContactMessages,
};
