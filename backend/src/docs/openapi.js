const pkg = require("../../package.json");

/**
 * Hand-written OpenAPI 3.0 specification for the Infinity Learn G-Meet Tracker API.
 *
 * Kept in code (not generated at request time) so the container serves a stable,
 * reviewed contract. Paths are documented relative to the `/api/v1` server, so
 * "Try it out" works both directly against the backend and through the nginx
 * gateway that proxies `/api/*` to this service.
 */

const bearerAuth = [{ bearerAuth: [] }];

const errorResponse = {
  description: "Error",
  content: {
    "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
  },
};

const spec = {
  openapi: "3.0.3",
  info: {
    title: "Infinity Learn G-Meet Tracker API",
    version: pkg.version || "1.0.0",
    description: [
      "REST API for the Infinity Learn teacher–student Google Meet reservation platform.",
      "",
      "### Authentication",
      "Admin and teacher endpoints use a **Bearer JWT**. Obtain a token from `POST /auth/login`,",
      "then click **Authorize** and paste the token (without the `Bearer` prefix).",
      "",
      "Student sign-in is disabled — students book sessions through the public *Open Booking* endpoints",
      "under `/public/*`, which require no account.",
      "",
      "### Response envelope",
      "All responses share a common envelope: a boolean `success`, an optional `message`,",
      "and (on success) a `data` payload. Errors return `success: false` with a `message`",
      "and an optional `details` array of validation messages.",
    ].join("\n"),
    contact: { name: "Infinity Learn", url: "https://infinitylearn.com" },
    license: { name: "ISC" },
  },
  servers: [
    {
      url: "/api/v1",
      description: "API base — relative to the current host (works directly and behind the nginx gateway)",
    },
  ],
  tags: [
    { name: "System", description: "Liveness / operational endpoints" },
    { name: "Auth", description: "Login and current-user profile" },
    { name: "Public — Open Booking", description: "Account-free roster/student booking portal" },
    { name: "Availability", description: "Teacher availability slots and student slot discovery" },
    { name: "Bookings", description: "Student and teacher booking lifecycle" },
    { name: "Admin", description: "Admin console: teachers, roster, booking window, analytics (requires admin role)" },
  ],
  paths: {
    // ---------------------------------------------------------------- System
    "/health": {
      get: {
        tags: ["System"],
        summary: "Health check",
        description: "Liveness probe used by Docker / load balancers. Served at the root, outside the `/api/v1` prefix.",
        servers: [{ url: "/" }],
        security: [],
        responses: {
          200: {
            description: "Service is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Server is healthy" },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ------------------------------------------------------------------ Auth
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in (admin or teacher)",
        description: "Exchanges email + password for a JWT. Students cannot sign in (403).",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } },
          },
        },
        responses: {
          200: {
            description: "Login successful",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/LoginResponse" } },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get the authenticated user",
        security: bearerAuth,
        responses: {
          200: {
            description: "Current user profile",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiSuccess" },
                    {
                      type: "object",
                      properties: { data: { $ref: "#/components/schemas/AuthUser" } },
                    },
                  ],
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },

    // --------------------------------------------------- Public open booking
    "/public/booking-window": {
      get: {
        tags: ["Public — Open Booking"],
        summary: "Get the active booking window (days)",
        security: [],
        responses: {
          200: {
            description: "Booking window in days",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiSuccess" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "object",
                          properties: { bookingWindowDays: { type: "integer", example: 7 } },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
    "/public/students/lookup": {
      post: {
        tags: ["Public — Open Booking"],
        summary: "Look up roster student(s) by mobile or user ID",
        description: "Provide exactly one of `mobile` or `userId`. Returns the matching roster profile(s) used to start an open booking.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  mobile: { type: "string", description: "10-digit mobile (digits only)", example: "9876543210" },
                  userId: { type: "string", example: "IL-STU-10231" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Matching roster student(s)",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccess" } } },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/public/slots": {
      get: {
        tags: ["Public — Open Booking"],
        summary: "List open teacher slots for a roster student on a date",
        security: [],
        parameters: [
          {
            name: "rosterStudentId",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Roster student id (24-hex ObjectId or UUID)",
          },
          {
            name: "date",
            in: "query",
            required: true,
            schema: { type: "string", format: "date", example: "2026-07-10" },
          },
        ],
        responses: {
          200: {
            description: "Available slots",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccess" } } },
          },
          400: { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
    "/public/bookings": {
      post: {
        tags: ["Public — Open Booking"],
        summary: "Book an open slot (roster student, no login)",
        description: "Creates a Google Meet booking for a roster student. May queue a WhatsApp confirmation to the parent mobile.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/PublicBookRequest" } },
          },
        },
        responses: {
          201: {
            description: "Slot booked",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiSuccess" },
                    {
                      type: "object",
                      properties: {
                        data: { $ref: "#/components/schemas/Booking" },
                        parentWhatsAppQueued: { type: "boolean", example: true },
                        parentWhatsAppEvent: { type: "string", nullable: true, example: "roster_booking_confirmed" },
                      },
                    },
                  ],
                },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          404: { $ref: "#/components/responses/NotFound" },
          409: { $ref: "#/components/responses/Conflict" },
        },
      },
      get: {
        tags: ["Public — Open Booking"],
        summary: "List a roster student's open bookings",
        security: [],
        parameters: [
          { name: "rosterStudentId", in: "query", required: true, schema: { type: "string" } },
          { name: "mobile", in: "query", required: true, schema: { type: "string", example: "9876543210" } },
        ],
        responses: {
          200: {
            description: "Bookings for the roster student",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiSuccess" },
                    { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Booking" } } } },
                  ],
                },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
        },
      },
    },

    // ---------------------------------------------------------- Availability
    "/availability/teacher": {
      post: {
        tags: ["Availability"],
        summary: "Set / add availability for a date (teacher)",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/SetAvailabilityRequest" } },
          },
        },
        responses: {
          201: {
            description: "Availability saved",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiSuccess" },
                    { type: "object", properties: { data: { $ref: "#/components/schemas/Availability" } } },
                  ],
                },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
      get: {
        tags: ["Availability"],
        summary: "Get the teacher's own calendar",
        security: bearerAuth,
        parameters: [
          { name: "from", in: "query", schema: { type: "string", format: "date" } },
          { name: "to", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: {
          200: {
            description: "Calendar with booking window",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiSuccess" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "object",
                          properties: {
                            calendar: { type: "array", items: { $ref: "#/components/schemas/Availability" } },
                            bookingWindowDays: { type: "integer", example: 7 },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/availability/teacher/{availabilityId}/slots/{slotId}": {
      parameters: [
        { name: "availabilityId", in: "path", required: true, schema: { type: "string" } },
        { name: "slotId", in: "path", required: true, schema: { type: "string" } },
      ],
      patch: {
        tags: ["Availability"],
        summary: "Update a slot's time (teacher)",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/SlotTimeRequest" } },
          },
        },
        responses: {
          200: { description: "Slot updated", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccess" } } } },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Availability"],
        summary: "Delete a slot (teacher)",
        security: bearerAuth,
        responses: {
          200: { description: "Slot deleted", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccess" } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/availability/student": {
      get: {
        tags: ["Availability"],
        summary: "List available slots for a grade/date (student role)",
        description: "Requires a student bearer token. Student sign-in is currently disabled, so this endpoint is retained for completeness.",
        security: bearerAuth,
        parameters: [
          { name: "grade", in: "query", required: true, schema: { type: "string", example: "8" } },
          { name: "date", in: "query", required: true, schema: { type: "string", format: "date" } },
        ],
        responses: {
          200: { description: "Available slots", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccess" } } } },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },

    // --------------------------------------------------------------- Bookings
    "/bookings": {
      post: {
        tags: ["Bookings"],
        summary: "Book a slot (student role)",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["availabilityId", "slotId"],
                properties: {
                  availabilityId: { type: "string", example: "665f1c2d3e4a5b6c7d8e9f00" },
                  slotId: { type: "string", example: "665f1c2d3e4a5b6c7d8e9f01" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Slot booked",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiSuccess" },
                    { type: "object", properties: { data: { $ref: "#/components/schemas/Booking" } } },
                  ],
                },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          409: { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/bookings/me": {
      get: {
        tags: ["Bookings"],
        summary: "List the authenticated student's bookings",
        security: bearerAuth,
        responses: {
          200: {
            description: "Student bookings",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiSuccess" },
                    { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Booking" } } } },
                  ],
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/bookings/teacher/pending-completion": {
      get: {
        tags: ["Bookings"],
        summary: "List teacher sessions awaiting completion",
        security: bearerAuth,
        responses: {
          200: { description: "Pending sessions", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccess" } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/bookings/teacher/history": {
      get: {
        tags: ["Bookings"],
        summary: "Teacher booking history",
        security: bearerAuth,
        parameters: [
          {
            name: "window",
            in: "query",
            schema: { type: "string", enum: ["week", "month", "all"], default: "all" },
          },
        ],
        responses: {
          200: { description: "Booking history", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccess" } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/bookings/teacher/{bookingId}/reschedule-options": {
      get: {
        tags: ["Bookings"],
        summary: "Reschedule options for a booking (teacher)",
        security: bearerAuth,
        parameters: [{ name: "bookingId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Reschedule options", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccess" } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/bookings/teacher/{bookingId}/reschedule": {
      patch: {
        tags: ["Bookings"],
        summary: "Reschedule a booking (teacher)",
        security: bearerAuth,
        parameters: [{ name: "bookingId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["availabilityId", "slotId"],
                properties: {
                  availabilityId: { type: "string" },
                  slotId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Booking rescheduled",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiSuccess" },
                    { type: "object", properties: { data: { $ref: "#/components/schemas/Booking" } } },
                  ],
                },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/bookings/teacher/{bookingId}/cancel": {
      patch: {
        tags: ["Bookings"],
        summary: "Cancel a booking (teacher)",
        security: bearerAuth,
        parameters: [{ name: "bookingId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { reason: { type: "string", maxLength: 500, example: "Teacher unwell" } },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Booking cancelled",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiSuccess" },
                    { type: "object", properties: { data: { $ref: "#/components/schemas/Booking" } } },
                  ],
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/bookings/teacher/{bookingId}/complete": {
      patch: {
        tags: ["Bookings"],
        summary: "Mark a session outcome (teacher)",
        security: bearerAuth,
        parameters: [{ name: "bookingId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  outcome: {
                    type: "string",
                    enum: ["completed", "student_did_not_join", "teacher_did_not_join"],
                    default: "completed",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Session updated", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccess" } } } },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    // ------------------------------------------------------------------ Admin
    "/admin/teachers": {
      get: {
        tags: ["Admin"],
        summary: "List all teachers",
        security: bearerAuth,
        responses: {
          200: {
            description: "Teachers",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiSuccess" },
                    { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Teacher" } } } },
                  ],
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
      post: {
        tags: ["Admin"],
        summary: "Create a teacher (or add assignments to an existing one)",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateTeacherRequest" } } },
        },
        responses: {
          201: {
            description: "Teacher created",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiSuccess" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "object",
                          properties: {
                            teacher: { $ref: "#/components/schemas/Teacher" },
                            generatedPassword: { type: "string", example: "Xy7$kL2mQp" },
                            emailSent: { type: "boolean" },
                            smtpConfigured: { type: "boolean" },
                            assignmentAdded: { type: "boolean" },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/admin/teachers/today-slot-stats": {
      get: {
        tags: ["Admin"],
        summary: "Today's slot stats per teacher",
        security: bearerAuth,
        responses: {
          200: { description: "Slot stats", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccess" } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/admin/teachers/bulk": {
      post: {
        tags: ["Admin"],
        summary: "Bulk create teachers",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["teachers"],
                properties: {
                  teachers: { type: "array", minItems: 1, items: { $ref: "#/components/schemas/CreateTeacherRequest" } },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Rows processed", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccess" } } } },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/admin/teachers/{teacherId}/grade": {
      patch: {
        tags: ["Admin"],
        summary: "Assign a grade to a teacher",
        security: bearerAuth,
        parameters: [{ name: "teacherId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["grade"],
                properties: { grade: { type: "string", example: "8" } },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Teacher grade updated",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiSuccess" },
                    { type: "object", properties: { data: { $ref: "#/components/schemas/Teacher" } } },
                  ],
                },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/admin/teachers/{teacherId}": {
      patch: {
        tags: ["Admin"],
        summary: "Update teacher details (email / batches)",
        security: bearerAuth,
        parameters: [{ name: "teacherId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateTeacherRequest" } } },
        },
        responses: {
          200: {
            description: "Teacher updated",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiSuccess" },
                    { type: "object", properties: { data: { $ref: "#/components/schemas/Teacher" } } },
                  ],
                },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/admin/teachers/{teacherId}/regenerate-password": {
      post: {
        tags: ["Admin"],
        summary: "Regenerate a teacher's password",
        security: bearerAuth,
        parameters: [{ name: "teacherId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { sendEmail: { type: "boolean", default: true } },
              },
            },
          },
        },
        responses: {
          200: { description: "Password regenerated", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccess" } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/admin/teachers/{teacherId}/view-password": {
      post: {
        tags: ["Admin"],
        summary: "Reveal a teacher's password (re-auth with admin password)",
        security: bearerAuth,
        parameters: [{ name: "teacherId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["adminPassword"],
                properties: { adminPassword: { type: "string", format: "password" } },
              },
            },
          },
        },
        responses: {
          200: { description: "Password retrieved", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccess" } } } },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/admin/booking-window": {
      get: {
        tags: ["Admin"],
        summary: "Get the booking window (days)",
        security: bearerAuth,
        responses: {
          200: {
            description: "Booking window",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiSuccess" },
                    { type: "object", properties: { data: { type: "object", properties: { bookingWindowDays: { type: "integer", example: 7 } } } } },
                  ],
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
      patch: {
        tags: ["Admin"],
        summary: "Configure the booking window (days)",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["bookingWindowDays"],
                properties: { bookingWindowDays: { type: "integer", minimum: 1, maximum: 60, example: 7 } },
              },
            },
          },
        },
        responses: {
          200: { description: "Booking window configured", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccess" } } } },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/admin/roster-students": {
      get: {
        tags: ["Admin"],
        summary: "List / search roster students (paginated)",
        security: bearerAuth,
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 10 } },
          { name: "grade", in: "query", schema: { type: "string", example: "8" } },
          { name: "display", in: "query", schema: { $ref: "#/components/schemas/RosterDisplay" } },
          {
            name: "search",
            in: "query",
            schema: { type: "string", maxLength: 120 },
            description: "Case-insensitive match on name, user ID, mobile, batch ID or batch name",
          },
        ],
        responses: {
          200: { description: "Roster students", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccess" } } } },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/admin/roster-students/bulk": {
      post: {
        tags: ["Admin"],
        summary: "Bulk import roster students",
        description:
          "Creates roster students, skipping duplicates. A row is a duplicate when the (mobile + name) pair already exists, OR when (userId, mobile, grade, display, batchId, batchName) all match an existing student.",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["students"],
                properties: {
                  students: { type: "array", minItems: 1, items: { $ref: "#/components/schemas/RosterStudentRow" } },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Roster processed",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiSuccess" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "object",
                          properties: {
                            created: { type: "array", items: { $ref: "#/components/schemas/RosterStudentRow" } },
                            skipped: { type: "array", items: { $ref: "#/components/schemas/RosterStudentRow" } },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/admin/bookings": {
      get: {
        tags: ["Admin"],
        summary: "List all bookings (filter + optional pagination)",
        security: bearerAuth,
        parameters: [
          { name: "grade", in: "query", schema: { type: "string" } },
          { name: "batchId", in: "query", schema: { type: "string" } },
          { name: "bookingKind", in: "query", schema: { type: "string", enum: ["student", "roster"] } },
          { name: "segmentKey", in: "query", schema: { type: "string" }, description: "Dashboard drill-down key, e.g. `student_app` or `roster|<batchId>`" },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 500 } },
          { name: "month", in: "query", schema: { type: "string", example: "2026-07" } },
          { name: "fromYmd", in: "query", schema: { type: "string", format: "date" } },
          { name: "toYmd", in: "query", schema: { type: "string", format: "date" } },
          { name: "teacherId", in: "query", schema: { type: "string" } },
          { name: "search", in: "query", schema: { type: "string" } },
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["scheduled", "cancelled", "completed", "student_did_not_join", "teacher_did_not_join"] },
          },
        ],
        responses: {
          200: { description: "Bookings", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccess" } } } },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/admin/bookings/dashboard-stats": {
      get: {
        tags: ["Admin"],
        summary: "Dashboard booking stats",
        security: bearerAuth,
        parameters: [{ name: "month", in: "query", schema: { type: "string", example: "2026-07" } }],
        responses: {
          200: { description: "Dashboard stats", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccess" } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/admin/bookings/weekday-stats": {
      get: {
        tags: ["Admin"],
        summary: "Weekday booking stats",
        security: bearerAuth,
        parameters: [
          { name: "days", in: "query", schema: { type: "integer", minimum: 7, maximum: 90, default: 28 } },
          { name: "month", in: "query", schema: { type: "string", example: "2026-07" } },
        ],
        responses: {
          200: { description: "Weekday stats", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccess" } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/admin/bookings/slot-stats": {
      get: {
        tags: ["Admin"],
        summary: "Mentor slot stats (monthly / weekly)",
        security: bearerAuth,
        parameters: [
          { name: "month", in: "query", schema: { type: "string", example: "2026-07" } },
          { name: "week", in: "query", schema: { type: "integer", minimum: 1, maximum: 6 } },
        ],
        responses: {
          200: { description: "Slot stats", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccess" } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/admin/bookings/slot-stats/{teacherId}/report": {
      get: {
        tags: ["Admin"],
        summary: "Mentor slot report for a teacher",
        security: bearerAuth,
        parameters: [
          { name: "teacherId", in: "path", required: true, schema: { type: "string" } },
          { name: "month", in: "query", schema: { type: "string", example: "2026-07" } },
          { name: "week", in: "query", schema: { type: "integer", minimum: 1, maximum: 6 } },
        ],
        responses: {
          200: { description: "Slot report", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccess" } } } },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/admin/bookings/{bookingId}/media": {
      patch: {
        tags: ["Admin"],
        summary: "Update recording / transcript links",
        security: bearerAuth,
        parameters: [{ name: "bookingId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  recordingUrl: { type: "string", format: "uri", nullable: true },
                  transcriptUrl: { type: "string", format: "uri", nullable: true },
                },
                description: "Provide at least one of recordingUrl or transcriptUrl",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Links updated",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/ApiSuccess" },
                    {
                      type: "object",
                      properties: {
                        data: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            recordingUrl: { type: "string", nullable: true },
                            transcriptUrl: { type: "string", nullable: true },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/admin/lsq-artifacts-sync-telemetry": {
      get: {
        tags: ["Admin"],
        summary: "LSQ recording/transcript sync telemetry",
        security: bearerAuth,
        responses: {
          200: { description: "Telemetry snapshot", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiSuccess" } } } },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
  },

  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT issued by POST /auth/login. Paste the raw token (no `Bearer ` prefix).",
      },
    },
    responses: {
      BadRequest: { ...errorResponse, description: "Validation failed" },
      Unauthorized: { ...errorResponse, description: "Missing or invalid authentication token" },
      Forbidden: { ...errorResponse, description: "Authenticated but not allowed for this role" },
      NotFound: { ...errorResponse, description: "Resource not found" },
      Conflict: { ...errorResponse, description: "Conflict (e.g. slot already booked)" },
    },
    schemas: {
      ApiSuccess: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", nullable: true },
          data: {},
        },
        required: ["success"],
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Validation failed" },
          details: {
            oneOf: [
              { type: "array", items: { type: "string" } },
              { type: "string" },
            ],
            nullable: true,
            example: ["Email is required"],
          },
        },
        required: ["success", "message"],
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "admin@infinitylearn.local" },
          password: { type: "string", format: "password", example: "Admin123!" },
          rememberMe: { type: "boolean", default: false },
        },
      },
      AuthUser: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["admin", "teacher", "student"] },
          grade: { type: "string", nullable: true },
          display: { type: "string", nullable: true },
          batches: { type: "array", items: { $ref: "#/components/schemas/TeacherBatch" } },
          batchId: { type: "string", nullable: true },
          batchName: { type: "string", nullable: true },
        },
      },
      LoginResponse: {
        allOf: [
          { $ref: "#/components/schemas/ApiSuccess" },
          {
            type: "object",
            properties: {
              data: {
                type: "object",
                properties: {
                  user: { $ref: "#/components/schemas/AuthUser" },
                  token: { type: "string", description: "JWT bearer token" },
                },
              },
            },
          },
        ],
      },
      RosterDisplay: {
        type: "string",
        enum: [
          "CBSE",
          "HOTS",
          "HOPTS CHAMP",
          "EEP",
          "NEET",
          "JEE",
          "FOUNDATION",
          "Jammu & Kashmir",
          "Tamil Nadu State Board",
          "Telangana",
          "ICSE",
        ],
      },
      TeacherBatch: {
        type: "object",
        properties: {
          grade: { type: "string", example: "8" },
          display: { $ref: "#/components/schemas/RosterDisplay" },
          batchId: { type: "string", example: "batch-8a" },
          batchName: { type: "string", example: "Icse-8||M-satsun||7 Pm - 8 Pm" },
        },
      },
      Teacher: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          role: { type: "string", example: "teacher" },
          grade: { type: "string", nullable: true },
          display: { type: "string", nullable: true },
          batches: { type: "array", items: { $ref: "#/components/schemas/TeacherBatch" } },
          batchId: { type: "string", nullable: true },
          batchName: { type: "string", nullable: true },
        },
      },
      CreateTeacherRequest: {
        type: "object",
        required: ["name", "email"],
        description: "Provide either `batches` (recommended) or the legacy `batchId` + `batchName`.",
        properties: {
          name: { type: "string", example: "Jane Doe" },
          email: { type: "string", format: "email", example: "jane.doe@infinitylearn.com" },
          batches: { type: "array", minItems: 1, maxItems: 30, items: { $ref: "#/components/schemas/TeacherBatch" } },
          grade: { type: "string", example: "8" },
          display: { $ref: "#/components/schemas/RosterDisplay" },
          batchId: { type: "string" },
          batchName: { type: "string" },
        },
      },
      UpdateTeacherRequest: {
        type: "object",
        required: ["email"],
        description: "Name is not editable here. Provide either `batches` or legacy `batchId` + `batchName`.",
        properties: {
          email: { type: "string", format: "email" },
          batches: { type: "array", minItems: 1, maxItems: 30, items: { $ref: "#/components/schemas/TeacherBatch" } },
          grade: { type: "string" },
          display: { $ref: "#/components/schemas/RosterDisplay" },
          batchId: { type: "string" },
          batchName: { type: "string" },
        },
      },
      RosterStudentRow: {
        type: "object",
        required: ["userId", "name", "mobile", "grade", "display", "batchId", "batchName"],
        properties: {
          userId: { type: "string", example: "IL-STU-10231" },
          name: { type: "string", example: "Aarav Sharma" },
          mobile: { type: "string", example: "9876543210" },
          grade: { type: "string", example: "8" },
          display: { $ref: "#/components/schemas/RosterDisplay" },
          batchId: { type: "string", example: "batch-8a" },
          batchName: { type: "string", example: "Icse-8||M-satsun||7 Pm - 8 Pm" },
        },
      },
      SetAvailabilityRequest: {
        type: "object",
        required: ["date", "slots"],
        properties: {
          date: { type: "string", format: "date", example: "2026-07-10" },
          slots: {
            type: "array",
            minItems: 1,
            items: { $ref: "#/components/schemas/SlotTimeRequest" },
          },
        },
      },
      SlotTimeRequest: {
        type: "object",
        required: ["startTime", "endTime"],
        properties: {
          startTime: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$", example: "19:00" },
          endTime: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$", example: "20:00" },
        },
      },
      Slot: {
        type: "object",
        properties: {
          id: { type: "string" },
          startTime: { type: "string", example: "19:00" },
          endTime: { type: "string", example: "20:00" },
          isBooked: { type: "boolean" },
        },
      },
      Availability: {
        type: "object",
        properties: {
          id: { type: "string" },
          date: { type: "string", format: "date" },
          slots: { type: "array", items: { $ref: "#/components/schemas/Slot" } },
        },
      },
      PublicBookRequest: {
        type: "object",
        required: ["mobile", "name", "rosterStudentId", "availabilityId", "slotId", "contactEmail"],
        properties: {
          mobile: { type: "string", example: "9876543210" },
          name: { type: "string", example: "Aarav Sharma" },
          rosterStudentId: { type: "string" },
          availabilityId: { type: "string" },
          slotId: { type: "string" },
          contactEmail: { type: "string", format: "email", example: "parent@example.com" },
        },
      },
      Booking: {
        type: "object",
        description: "Booking record. Fields present depend on lifecycle stage.",
        properties: {
          id: { type: "string" },
          status: {
            type: "string",
            enum: ["scheduled", "cancelled", "completed", "student_did_not_join", "teacher_did_not_join"],
          },
          date: { type: "string", format: "date" },
          startTime: { type: "string", example: "19:00" },
          endTime: { type: "string", example: "20:00" },
          meetLink: { type: "string", nullable: true },
          teacherName: { type: "string", nullable: true },
          studentName: { type: "string", nullable: true },
          recordingUrl: { type: "string", nullable: true },
          transcriptUrl: { type: "string", nullable: true },
        },
        additionalProperties: true,
      },
    },
  },
};

module.exports = spec;
