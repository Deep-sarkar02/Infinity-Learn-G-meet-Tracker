const fs = require("fs");
const { google } = require("googleapis");
const env = require("../../../config/env");
const logger = require("../../../config/logger");

const FALLBACK_MEET_URL = "https://meet.google.com/new";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

const isOAuthConfigured = () =>
  Boolean(
    env.google.clientId &&
      env.google.clientSecret &&
      env.google.redirectUri &&
      env.google.refreshToken,
  );

const isServiceAccountConfigured = () =>
  Boolean(env.google.serviceAccountJson || env.google.serviceAccountKeyPath);

const isServiceAccountMode = () => env.google.authMode === "service_account";

const isGoogleConfigured = () =>
  isServiceAccountMode() ? isServiceAccountConfigured() : isOAuthConfigured();

const loadServiceAccountConfig = () => {
  if (env.google.serviceAccountJson) {
    try {
      return JSON.parse(env.google.serviceAccountJson);
    } catch (error) {
      logger.error(`Invalid GOOGLE_SERVICE_ACCOUNT_JSON: ${error.message}`);
      return null;
    }
  }

  if (env.google.serviceAccountKeyPath) {
    try {
      const raw = fs.readFileSync(env.google.serviceAccountKeyPath, "utf8");
      return JSON.parse(raw);
    } catch (error) {
      logger.error(
        `Unable to read GOOGLE_SERVICE_ACCOUNT_KEY_PATH (${env.google.serviceAccountKeyPath}): ${error.message}`,
      );
      return null;
    }
  }

  return null;
};

const getGoogleAuthClient = () => {
  if (isServiceAccountMode()) {
    const serviceAccount = loadServiceAccountConfig();
    if (!serviceAccount?.client_email || !serviceAccount?.private_key) {
      return null;
    }

    return new google.auth.JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: GOOGLE_SCOPES,
      // Required for Workspace Domain-Wide Delegation organizer behavior.
      subject: env.google.impersonateUser || undefined,
    });
  }

  if (!isOAuthConfigured()) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(
    env.google.clientId,
    env.google.clientSecret,
    env.google.redirectUri,
  );
  oauth2Client.setCredentials({ refresh_token: env.google.refreshToken });
  return oauth2Client;
};

/** True when Calendar API is configured (real Meet + optional Google invite emails to attendees). */
const isGoogleCalendarConfigured = () => isGoogleConfigured();

/** True when we created a real calendar event, not the generic Meet fallback. */
const isRealMeetLink = (meetingLink) =>
  Boolean(meetingLink && meetingLink !== FALLBACK_MEET_URL);

const createGoogleMeetEvent = async ({
  teacherEmail,
  studentEmail,
  startTime,
  endTime,
}) => {
  if (!isGoogleConfigured()) {
    logger.warn(
      "Google credentials missing, returning fallback Google Meet URL template",
    );
    return { meetingLink: FALLBACK_MEET_URL, eventId: null };
  }

  const authClient = getGoogleAuthClient();
  if (!authClient) {
    logger.warn(
      "Google auth client could not be initialized, returning fallback Google Meet URL template",
    );
    return { meetingLink: FALLBACK_MEET_URL, eventId: null };
  }

  const calendar = google.calendar({ version: "v3", auth: authClient });

  const attendees = [{ email: teacherEmail }];
  if (studentEmail) {
    attendees.push({ email: studentEmail });
  }

  // sendUpdates: "all" makes Google Calendar email official invites (with Meet link) to attendees.
  const response = await calendar.events.insert({
    calendarId: env.google.calendarId,
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: {
      summary: "Teacher-Student Meeting",
      start: { dateTime: new Date(startTime).toISOString(), timeZone: "UTC" },
      end: { dateTime: new Date(endTime).toISOString(), timeZone: "UTC" },
      attendees: attendees.map((a) => ({
        ...a,
        responseStatus: "needsAction",
      })),
      guestsCanInviteOthers: false,
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  const meetingLink =
    response.data?.hangoutLink ||
    response.data?.conferenceData?.entryPoints?.[0]?.uri ||
    null;

  return {
    meetingLink,
    eventId: response.data?.id || null,
  };
};

/**
 * Deletes the event from the organizer's primary calendar and notifies attendees
 * (same as removing the event in the UI) when sendUpdates is "all".
 */
const deleteGoogleCalendarEvent = async (eventId) => {
  if (!eventId || !isGoogleConfigured()) {
    return;
  }

  const authClient = getGoogleAuthClient();
  if (!authClient) {
    logger.warn("Google auth client could not be initialized; skipping event delete");
    return;
  }

  const calendar = google.calendar({ version: "v3", auth: authClient });

  try {
    await calendar.events.delete({
      calendarId: env.google.calendarId,
      eventId,
      sendUpdates: "all",
    });
  } catch (err) {
    const code = err.code || err.response?.status;
    if (code === 404) {
      logger.warn(
        `Google Calendar event ${eventId} was already deleted or not found`,
      );
      return;
    }
    throw err;
  }
};

module.exports = {
  createGoogleMeetEvent,
  deleteGoogleCalendarEvent,
  isGoogleCalendarConfigured,
  isRealMeetLink,
  FALLBACK_MEET_URL,
};
