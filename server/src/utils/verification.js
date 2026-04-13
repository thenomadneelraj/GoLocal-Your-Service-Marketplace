const VERIFICATION_STATUS = {
  NOT_SUBMITTED: "not_submitted",
  UNDER_REVIEW: "under_review",
  VERIFIED: "verified",
  REJECTED: "rejected",
};

const VERIFICATION_STATUS_VALUES = Object.values(VERIFICATION_STATUS);

const REQUIRED_VERIFICATION_DOCUMENTS = {
  client: ["idProof", "addressProof", "selfie"],
  provider: ["idProof", "businessProof", "selfie"],
};

const VERIFICATION_DOCUMENT_LABELS = {
  idProof: "Government ID",
  addressProof: "Address Proof",
  businessProof: "Professional Proof",
  selfie: "Live Selfie",
};

const normalizeVerificationStatus = (value = "", fallbackVerified = false) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (VERIFICATION_STATUS_VALUES.includes(normalized)) {
    return normalized;
  }

  return fallbackVerified
    ? VERIFICATION_STATUS.VERIFIED
    : VERIFICATION_STATUS.NOT_SUBMITTED;
};

const getRequiredVerificationDocumentKinds = (role = "") =>
  REQUIRED_VERIFICATION_DOCUMENTS[String(role || "").trim().toLowerCase()] ||
  REQUIRED_VERIFICATION_DOCUMENTS.client;

const serializeVerificationDocument = (document = {}) => {
  const kind = String(document?.kind || "").trim();
  const filePath = String(document?.filePath || document?.path || "").trim();
  const originalName =
    String(document?.originalName || document?.name || "").trim() || "Document";

  return {
    kind,
    label:
      String(document?.label || "").trim() ||
      VERIFICATION_DOCUMENT_LABELS[kind] ||
      "Document",
    originalName,
    name: originalName,
    storedName: String(document?.storedName || "").trim(),
    mimeType: String(document?.mimeType || document?.type || "").trim(),
    size: Number(document?.size || 0),
    uploadedAt: document?.uploadedAt ? new Date(document.uploadedAt) : null,
    fileUrl: filePath || "",
  };
};

module.exports = {
  VERIFICATION_STATUS,
  VERIFICATION_STATUS_VALUES,
  VERIFICATION_DOCUMENT_LABELS,
  normalizeVerificationStatus,
  getRequiredVerificationDocumentKinds,
  serializeVerificationDocument,
};
