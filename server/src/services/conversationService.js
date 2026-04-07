const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");

const toObjectIdString = (value) => String(value || "");

const isValidObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(toObjectIdString(value));

const normalizeParticipantIds = (userIds = []) =>
  [...new Set(userIds.map(toObjectIdString).filter(Boolean))];

const findConversationByParticipants = async (userIds = []) => {
  const uniqueIds = normalizeParticipantIds(userIds);

  if (uniqueIds.length !== 2 || uniqueIds.some((id) => !isValidObjectId(id))) {
    return null;
  }

  return Conversation.findOne({
    participants: {
      $all: uniqueIds.map((id) => new mongoose.Types.ObjectId(id)),
      $size: uniqueIds.length,
    },
  });
};

const findOrCreateConversation = async (userIds = []) => {
  const uniqueIds = normalizeParticipantIds(userIds);

  if (uniqueIds.length !== 2 || uniqueIds.some((id) => !isValidObjectId(id))) {
    return null;
  }

  const existingConversation = await findConversationByParticipants(uniqueIds);
  if (existingConversation) {
    return existingConversation;
  }

  return Conversation.create({
    participants: uniqueIds,
  });
};

module.exports = {
  findConversationByParticipants,
  findOrCreateConversation,
};
