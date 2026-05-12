const express = require("express");
const validate = require("../../middleware/validate.middleware");
const asyncHandler = require("../../utils/asyncHandler");
const publicController = require("./public.controller");
const {
  lookupStudentSchema,
  openSlotsQuerySchema,
  publicBookSchema,
  listPublicBookingsQuerySchema,
} = require("./public.validation");

const router = express.Router();

router.post(
  "/students/lookup",
  validate(lookupStudentSchema),
  asyncHandler(publicController.lookupStudent),
);

router.get(
  "/slots",
  validate(openSlotsQuerySchema, "query"),
  asyncHandler(publicController.getOpenSlots),
);

router.post(
  "/bookings",
  validate(publicBookSchema),
  asyncHandler(publicController.bookOpenSlot),
);

router.get(
  "/bookings",
  validate(listPublicBookingsQuerySchema, "query"),
  asyncHandler(publicController.listOpenBookings),
);

module.exports = router;
