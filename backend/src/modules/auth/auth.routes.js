const express = require("express");
const authController = require("./auth.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const validate = require("../../middleware/validate.middleware");
const asyncHandler = require("../../utils/asyncHandler");
const { loginSchema } = require("./auth.validation");

const router = express.Router();

router.post("/login", validate(loginSchema), asyncHandler(authController.login));
router.get("/me", authMiddleware, asyncHandler(authController.getMe));

module.exports = router;
