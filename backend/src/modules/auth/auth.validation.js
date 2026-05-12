const Joi = require("joi");

/** Allows internal TLDs like `.local` (seed admin) — public TLD check is off. */
const emailField = () =>
  Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: false } })
    .required();

const loginSchema = Joi.object({
  email: emailField(),
  password: Joi.string().required(),
});

module.exports = {
  loginSchema,
};
