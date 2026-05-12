const ApiError = require("../utils/ApiError");

const validate = (schema, target = "body") => (req, _res, next) => {
  const payload = req[target];
  const { error, value } = schema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return next(
      new ApiError(
        400,
        "Validation failed",
        error.details.map((detail) => {
          if (detail.type === "any.invalid" && detail.context?.message) {
            return detail.context.message;
          }
          return detail.message;
        }),
      ),
    );
  }

  req[target] = value;
  return next();
};

module.exports = validate;
