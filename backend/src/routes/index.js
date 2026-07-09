const express = require("express");

const authRoutes = require("./auth.routes");
const adminRoutes = require("./admin.routes");
const availabilityRoutes = require("./availability.routes");
const bookingRoutes = require("./booking.routes");
const publicRoutes = require("../modules/public/public.routes");
const { mountDocs } = require("../docs/swagger");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/availability", availabilityRoutes);
router.use("/bookings", bookingRoutes);
router.use("/public", publicRoutes);

mountDocs(router);

module.exports = router;
