const { DATA_ORIGIN, normalizeDataOrigin } = require("./dataOrigin");

const sendSuccess = (res, data, options = {}) =>
  res.status(options.status || 200).json({
    success: true,
    data,
    ...(options.message ? { message: options.message } : {}),
    meta: {
      source: normalizeDataOrigin(options.source || DATA_ORIGIN.REAL),
      ...(options.meta || {}),
    },
  });

const sendError = (res, error, options = {}) =>
  res.status(options.status || 500).json({
    success: false,
    message: options.message || error?.message || "Internal server error",
    meta: {
      source: normalizeDataOrigin(options.source || DATA_ORIGIN.REAL),
      ...(options.meta || {}),
    },
  });

module.exports = {
  sendError,
  sendSuccess,
};
