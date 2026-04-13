const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/User");
const Service = require("../models/Service");
const Booking = require("../models/Booking");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const Transaction = require("../models/Transaction");
const Dispute = require("../models/Dispute");
const { toBookingPersistenceStatus } = require("../utils/bookingStatus");
const { toTransactionPersistenceStatus } = require("../utils/transactionStatus");

const { Types } = mongoose;

const TARGET_MODELS = {
  users: User,
  services: Service,
  bookings: Booking,
  conversations: Conversation,
  messages: Message,
  notifications: Notification,
  transactions: Transaction,
  disputes: Dispute,
};

const EMPTY_LEGACY_COLLECTIONS = [
  "admins",
  "clients",
  "providers",
  "activitylogs",
  "contactmessages",
  "loginhistories",
  "payouts",
  "platformsettings",
  "reviews",
];

const hasCollection = async (db, collectionName) => {
  const matches = await db.listCollections({ name: collectionName }).toArray();
  return matches.length > 0;
};

const getCollectionDocuments = async (db, collectionName) => {
  if (!(await hasCollection(db, collectionName))) {
    return [];
  }

  return db.collection(collectionName).find({}).toArray();
};

const toObjectId = (value) => {
  if (!value) {
    return undefined;
  }

  if (value instanceof Types.ObjectId) {
    return value;
  }

  if (typeof value === "string" && Types.ObjectId.isValid(value)) {
    return new Types.ObjectId(value);
  }

  return value;
};

const toObjectIdArray = (values) =>
  Array.isArray(values)
    ? values.map((value) => toObjectId(value)).filter(Boolean)
    : [];

const toTrimmedString = (value, fallback = "") => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const normalized = String(value).trim();
  return normalized || fallback;
};

const toFiniteNumber = (value, fallback = 0) => {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
};

const toBoolean = (value, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

const toDate = (value, fallback = null) => {
  if (!value) {
    return fallback;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

const inferNotificationTitle = (doc) => {
  const explicitTitle = toTrimmedString(doc.title);
  if (explicitTitle) {
    return explicitTitle;
  }

  const actionText = toTrimmedString(doc.actionText);
  if (actionText) {
    return actionText;
  }

  const fallbackTitles = {
    booking: "Booking update",
    message: "New message",
    payment: "Payment update",
    dispute: "Dispute update",
    system: "System update",
  };

  return (
    fallbackTitles[toTrimmedString(doc.type).toLowerCase()] || "Notification"
  );
};

const toBookingPaymentStatus = (status) => {
  const normalized = toTransactionPersistenceStatus(status);

  if (normalized === "paid") {
    return "paid";
  }

  if (normalized === "failed" || normalized === "refunded") {
    return "failed";
  }

  return "pending";
};

const sanitizeWithModel = (Model, document) => {
  const draft = new Model(document);
  const validationError = draft.validateSync();

  if (validationError) {
    throw validationError;
  }

  return draft.toObject({
    depopulate: true,
    versionKey: true,
  });
};

const buildContext = async (db) => {
  const transactionNewsDocuments = await getCollectionDocuments(
    db,
    "transactionnews"
  );
  const conversationNewsDocuments = await getCollectionDocuments(
    db,
    "conversationnews"
  );
  const transactionDocuments = transactionNewsDocuments.length
    ? transactionNewsDocuments
    : await getCollectionDocuments(db, "transactions");
  const conversationDocuments = conversationNewsDocuments.length
    ? conversationNewsDocuments
    : await getCollectionDocuments(db, "conversations");

  return {
    transactionsByBookingId: new Map(
      transactionDocuments
        .filter((doc) => doc?.bookingId)
        .map((doc) => [String(doc.bookingId), doc])
    ),
    conversationParticipants: new Map(
      conversationDocuments.map((doc) => [
        String(doc._id),
        toObjectIdArray(doc.participants),
      ])
    ),
  };
};

const NEWS_COLLECTION_MAPPERS = {
  usernews: {
    target: "users",
    model: TARGET_MODELS.users,
    map: (doc) => ({
      _id: toObjectId(doc._id),
      email: toTrimmedString(doc.email).toLowerCase(),
      password: doc.password,
      role: toTrimmedString(doc.role, "client").toLowerCase(),
      name: toTrimmedString(doc.name, doc.email?.split("@")[0] || "User"),
      phone: toTrimmedString(doc.phone) || undefined,
      profileImage: toTrimmedString(doc.profileImage),
      address: toTrimmedString(doc.address),
      isVerified: toBoolean(doc.isVerified, false),
      upiId: toTrimmedString(doc.upiId),
      serviceType: toTrimmedString(doc.serviceType, "Other"),
      bio: toTrimmedString(doc.bio),
      hourlyRate: toFiniteNumber(doc.hourlyRate, 0),
      location: toTrimmedString(doc.location),
      services: toObjectIdArray(doc.services),
      experience: toFiniteNumber(doc.experience, 0),
      rating: toFiniteNumber(doc.rating, 0),
      totalReviews: toFiniteNumber(doc.totalReviews, 0),
      earnings: toFiniteNumber(doc.earnings, 0),
      availability: toBoolean(doc.availability, true),
      documents: Array.isArray(doc.documents) ? doc.documents : [],
      permissions: Array.isArray(doc.permissions) ? doc.permissions : [],
      status: toTrimmedString(doc.status, "active").toLowerCase(),
      approvalStatus:
        toTrimmedString(doc.approvalStatus).toLowerCase() ||
        (toTrimmedString(doc.role).toLowerCase() === "provider"
          ? "pending"
          : "approved"),
      totalLogins: toFiniteNumber(doc.totalLogins, 0),
      lastLogin: toDate(doc.lastLogin),
      isActive:
        typeof doc.isActive === "boolean"
          ? doc.isActive
          : toTrimmedString(doc.status, "active").toLowerCase() === "active",
      createdAt: toDate(doc.createdAt, new Date()),
      updatedAt: toDate(doc.updatedAt, new Date()),
      __v: toFiniteNumber(doc.__v, 0),
    }),
  },
  servicenews: {
    target: "services",
    model: TARGET_MODELS.services,
    map: (doc) => {
      const providerId = toObjectId(doc.providerId);

      if (!providerId) {
        return null;
      }

      return {
        _id: toObjectId(doc._id),
        providerId,
        title: toTrimmedString(doc.title || doc.name, "Service"),
        description: toTrimmedString(
          doc.description,
          "Service description unavailable."
        ),
        category: toTrimmedString(doc.category, "General"),
        status: toTrimmedString(doc.status, "active").toLowerCase(),
        price: toFiniteNumber(doc.price, 0),
        duration: toTrimmedString(doc.duration, "1 hour"),
        locationType: toTrimmedString(doc.locationType, "offline").toLowerCase(),
        images: Array.isArray(doc.images) ? doc.images : [],
        rating: toFiniteNumber(doc.rating, 0),
        totalBookings: toFiniteNumber(doc.totalBookings, 0),
        createdAt: toDate(doc.createdAt, new Date()),
        updatedAt: toDate(doc.updatedAt, new Date()),
        __v: toFiniteNumber(doc.__v, 0),
      };
    },
  },
  bookingnews: {
    target: "bookings",
    model: TARGET_MODELS.bookings,
    map: (doc, context) => {
      const clientId = toObjectId(doc.clientId);
      const providerId = toObjectId(doc.providerId);
      const serviceId = toObjectId(doc.serviceId);

      if (!clientId || !providerId || !serviceId) {
        return null;
      }

      const transaction = context.transactionsByBookingId.get(String(doc._id));
      const transactionStatus = toTransactionPersistenceStatus(
        transaction?.status || doc.paymentStatus
      );

      return {
        _id: toObjectId(doc._id),
        clientId,
        providerId,
        serviceId,
        bookingDate: toDate(
          doc.bookingDate || doc.date || doc.scheduledAt || doc.createdAt,
          new Date()
        ),
        timeSlot: toTrimmedString(doc.timeSlot || doc.time, "Flexible"),
        notes: toTrimmedString(doc.notes),
        requirements: toTrimmedString(doc.requirements || doc.notes),
        address: toTrimmedString(doc.address),
        price: toFiniteNumber(doc.price ?? doc.amount, 0),
        status: toBookingPersistenceStatus(doc.status),
        paymentStatus: toBookingPaymentStatus(transactionStatus),
        paymentMethod: toTrimmedString(
          transaction?.paymentMethod || doc.paymentMethod,
          "upi"
        ).toLowerCase(),
        review: doc.review
          ? {
              rating: toFiniteNumber(doc.review.rating, undefined),
              comment: toTrimmedString(doc.review.comment),
              createdAt: toDate(doc.review.createdAt),
              updatedAt: toDate(doc.review.updatedAt),
            }
          : undefined,
        createdAt: toDate(doc.createdAt, new Date()),
        updatedAt: toDate(doc.updatedAt, new Date()),
        __v: toFiniteNumber(doc.__v, 0),
      };
    },
  },
  conversationnews: {
    target: "conversations",
    model: TARGET_MODELS.conversations,
    map: (doc) => ({
      _id: toObjectId(doc._id),
      participants: toObjectIdArray(doc.participants),
      lastMessageAt: toDate(
        doc.lastMessageAt || doc.updatedAt || doc.createdAt,
        null
      ),
      createdAt: toDate(doc.createdAt, new Date()),
      updatedAt: toDate(doc.updatedAt, new Date()),
      __v: toFiniteNumber(doc.__v, 0),
    }),
  },
  messagenews: {
    target: "messages",
    model: TARGET_MODELS.messages,
    map: (doc, context) => {
      const conversationId = toObjectId(doc.conversationId);
      const sender = toObjectId(doc.sender || doc.senderId);
      const participants =
        context.conversationParticipants.get(String(doc.conversationId)) || [];
      const receiver =
        toObjectId(doc.receiver || doc.receiverId) ||
        participants.find(
          (participantId) => String(participantId) !== String(sender)
        );

      if (!sender || !receiver) {
        return null;
      }

      return {
        _id: toObjectId(doc._id),
        conversationId: conversationId || undefined,
        sender,
        receiver,
        content: toTrimmedString(doc.content || doc.message),
        read: toBoolean(doc.read, false),
        createdAt: toDate(doc.createdAt, new Date()),
        updatedAt: toDate(doc.updatedAt, new Date()),
        __v: toFiniteNumber(doc.__v, 0),
      };
    },
  },
  notificationnews: {
    target: "notifications",
    model: TARGET_MODELS.notifications,
    map: (doc) => {
      const user = toObjectId(doc.user || doc.userId);

      if (!user) {
        return null;
      }

      return {
        _id: toObjectId(doc._id),
        user,
        title: inferNotificationTitle(doc),
        message: toTrimmedString(doc.message),
        type: toTrimmedString(doc.type, "general").toLowerCase(),
        actionUrl: toTrimmedString(doc.actionUrl),
        metadata: {
          ...(doc.metadata && typeof doc.metadata === "object" ? doc.metadata : {}),
          ...(doc.actionText
            ? { actionText: toTrimmedString(doc.actionText) }
            : {}),
        },
        read: toBoolean(doc.read, false),
        createdAt: toDate(doc.createdAt, new Date()),
        updatedAt: toDate(doc.updatedAt, new Date()),
        __v: toFiniteNumber(doc.__v, 0),
      };
    },
  },
  transactionnews: {
    target: "transactions",
    model: TARGET_MODELS.transactions,
    map: (doc) => {
      const bookingId = toObjectId(doc.bookingId);
      const clientId = toObjectId(doc.clientId);
      const providerId = toObjectId(doc.providerId);

      if (!bookingId || !clientId || !providerId) {
        return null;
      }

      return {
        _id: toObjectId(doc._id),
        bookingId,
        clientId,
        providerId,
        amount: toFiniteNumber(doc.amount, 0),
        currency: toTrimmedString(doc.currency, "INR").toUpperCase(),
        paymentMethod: toTrimmedString(doc.paymentMethod, "upi").toLowerCase(),
        transactionId: toTrimmedString(doc.transactionId),
        status: toTransactionPersistenceStatus(doc.status),
        createdAt: toDate(doc.createdAt, new Date()),
        updatedAt: toDate(doc.updatedAt, new Date()),
        __v: toFiniteNumber(doc.__v, 0),
      };
    },
  },
  disputenews: {
    target: "disputes",
    model: TARGET_MODELS.disputes,
    map: (doc) => {
      const bookingId = toObjectId(doc.bookingId);
      const clientId = toObjectId(doc.clientId);
      const providerId = toObjectId(doc.providerId);

      if (!bookingId || !clientId || !providerId) {
        return null;
      }

      return {
        _id: toObjectId(doc._id),
        bookingId,
        clientId,
        providerId,
        reason: toTrimmedString(doc.reason, "General dispute"),
        description: toTrimmedString(doc.description),
        status: toTrimmedString(doc.status, "open").toLowerCase(),
        resolutionNote: toTrimmedString(doc.resolutionNote),
        resolvedAt: toDate(doc.resolvedAt),
        createdAt: toDate(doc.createdAt, new Date()),
        updatedAt: toDate(doc.updatedAt, new Date()),
        __v: toFiniteNumber(doc.__v, 0),
      };
    },
  },
};

const cleanupCollections = async () => {
  console.log("Starting canonical collection sync...");

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  try {
    const db = mongoose.connection.db;
    const context = await buildContext(db);
    const summary = [];

    for (const [sourceName, config] of Object.entries(NEWS_COLLECTION_MAPPERS)) {
      if (!(await hasCollection(db, sourceName))) {
        continue;
      }

      const sourceDocuments = await db.collection(sourceName).find({}).toArray();
      if (!sourceDocuments.length) {
        await db.dropCollection(sourceName).catch(() => {});
        summary.push(`${sourceName}: empty, dropped`);
        continue;
      }

      const operations = [];
      let skippedCount = 0;

      for (const sourceDocument of sourceDocuments) {
        const mappedDocument = config.map(sourceDocument, context);

        if (!mappedDocument) {
          skippedCount += 1;
          continue;
        }

        try {
          const sanitizedDocument = sanitizeWithModel(
            config.model,
            mappedDocument
          );

          operations.push({
            replaceOne: {
              filter: { _id: sanitizedDocument._id },
              replacement: sanitizedDocument,
              upsert: true,
            },
          });
        } catch (error) {
          const details =
            error?.message || error?.toString() || "unknown validation error";
          throw new Error(
            `Failed to sync ${sourceName} document ${sourceDocument._id}: ${details}`
          );
        }
      }

      if (operations.length) {
        await config.model.bulkWrite(operations, { ordered: false });
      }

      const targetCount = await config.model.countDocuments();
      summary.push(
        `${sourceName} -> ${config.target}: ${operations.length} synced, ${skippedCount} skipped, target now ${targetCount}`
      );

      await db.dropCollection(sourceName);
    }

    for (const collectionName of EMPTY_LEGACY_COLLECTIONS) {
      if (!(await hasCollection(db, collectionName))) {
        continue;
      }

      const count = await db.collection(collectionName).countDocuments();
      if (count === 0) {
        await db.dropCollection(collectionName);
        summary.push(`${collectionName}: empty legacy collection dropped`);
      } else {
        summary.push(
          `${collectionName}: kept because it still has ${count} document(s)`
        );
      }
    }

    console.log("Canonical collection sync complete:");
    summary.forEach((line) => console.log(`- ${line}`));

    return summary;
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

if (require.main === module) {
  cleanupCollections().catch((error) => {
    console.error("Collection cleanup failed:", error);
    process.exit(1);
  });
}

module.exports = cleanupCollections;
