const { DATA_ORIGIN } = require("../responseNormalizers/dataOrigin");

const attachResponseMeta = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (
      body &&
      typeof body === "object" &&
      body.success === true &&
      !body.meta
    ) {
      return originalJson({
        ...body,
        meta: {
          source: DATA_ORIGIN.REAL,
        },
      });
    }

    return originalJson(body);
  };

  next();
};

module.exports = {
  attachResponseMeta,
};
