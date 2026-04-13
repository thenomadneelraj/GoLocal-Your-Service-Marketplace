const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const UPLOADS_ROOT = path.resolve(__dirname, "../../uploads");
const VERIFICATION_UPLOAD_DIR = path.join(UPLOADS_ROOT, "verification");
const VERIFICATION_PUBLIC_PREFIX = "/uploads/verification";

const ensureVerificationUploadDir = () => {
  fs.mkdirSync(VERIFICATION_UPLOAD_DIR, { recursive: true });
};

const buildStoredFileName = (originalName = "") => {
  const extension = path.extname(String(originalName || "")).toLowerCase();
  return `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`;
};

const verificationStorage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    ensureVerificationUploadDir();
    callback(null, VERIFICATION_UPLOAD_DIR);
  },
  filename: (_req, file, callback) => {
    callback(null, buildStoredFileName(file.originalname));
  },
});

const verificationUpload = multer({
  storage: verificationStorage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 3,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(String(file.mimetype || "").toLowerCase())) {
      callback(
        new multer.MulterError(
          "LIMIT_UNEXPECTED_FILE",
          `${file.fieldname}: unsupported file type`
        )
      );
      return;
    }

    callback(null, true);
  },
});

const verificationUploadFields = [
  { name: "idProof", maxCount: 1 },
  { name: "addressProof", maxCount: 1 },
  { name: "businessProof", maxCount: 1 },
  { name: "selfie", maxCount: 1 },
];

const normalizeStoredRelativePath = (value = "") => {
  const normalized = String(value || "").replace(/\\/g, "/").trim();
  if (!normalized) return "";

  if (normalized.startsWith(VERIFICATION_PUBLIC_PREFIX)) {
    return normalized;
  }

  if (normalized.startsWith("uploads/verification/")) {
    return `/${normalized}`;
  }

  if (normalized.startsWith("/verification/")) {
    return `/uploads${normalized}`;
  }

  if (normalized.startsWith("verification/")) {
    return `/uploads/${normalized}`;
  }

  return normalized.startsWith("/") ? normalized : `/${normalized}`;
};

const resolveStoredAbsolutePath = (relativePath = "") => {
  const normalized = normalizeStoredRelativePath(relativePath);
  if (!normalized.startsWith(VERIFICATION_PUBLIC_PREFIX)) {
    return "";
  }

  const absolutePath = path.resolve(
    UPLOADS_ROOT,
    `.${normalized.replace(/^\/uploads/, "")}`
  );

  if (!absolutePath.startsWith(UPLOADS_ROOT)) {
    return "";
  }

  return absolutePath;
};

const deleteStoredVerificationFile = async (relativePath = "") => {
  const absolutePath = resolveStoredAbsolutePath(relativePath);
  if (!absolutePath) return;

  try {
    await fs.promises.unlink(absolutePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
};

const deleteVerificationDocuments = async (documents = []) => {
  await Promise.allSettled(
    (Array.isArray(documents) ? documents : [])
      .map((document) => document?.filePath || document?.path || "")
      .filter(Boolean)
      .map((relativePath) => deleteStoredVerificationFile(relativePath))
  );
};

const handleVerificationUpload = (req, res, next) => {
  verificationUpload.fields(verificationUploadFields)(req, res, (error) => {
    if (!error) {
      return next();
    }

    const fallbackMessage =
      error instanceof multer.MulterError
        ? "Verification upload failed."
        : error.message || "Verification upload failed.";

    let message = fallbackMessage;

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        message = "Each verification file must be 5MB or smaller.";
      } else if (error.code === "LIMIT_UNEXPECTED_FILE") {
        message = "Only JPG, PNG, WEBP, and PDF verification files are supported.";
      }
    }

    return res.status(400).json({
      success: false,
      message,
    });
  });
};

module.exports = {
  MAX_FILE_SIZE_BYTES,
  VERIFICATION_PUBLIC_PREFIX,
  ensureVerificationUploadDir,
  normalizeStoredRelativePath,
  deleteStoredVerificationFile,
  deleteVerificationDocuments,
  handleVerificationUpload,
};
