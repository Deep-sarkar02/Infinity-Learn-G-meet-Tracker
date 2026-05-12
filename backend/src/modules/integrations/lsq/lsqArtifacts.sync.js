const env = require("../../../config/env");
const logger = require("../../../config/logger");
const getPrisma = require("../../../config/postgres");

const prisma = env.databaseUrl ? getPrisma() : null;

/** Persisted when both URLs are still missing after the grace window; sync poller skips these rows. */
const getArtifactsNotAvailableMessage = () =>
  `Not available: LSQ did not return recording or transcript within ${env.lsq.artifactsUnavailableAfterHours} hours of session end.`;

const isPastArtifactsDeadline = (endTime, now = new Date()) => {
  const endMs = new Date(endTime).getTime();
  if (Number.isNaN(endMs)) return false;
  const hours = env.lsq.artifactsUnavailableAfterHours;
  return now.getTime() >= endMs + hours * 60 * 60 * 1000;
};

const normalizeKey = (key) => String(key || "").replace(/[^a-z0-9]/gi, "").toLowerCase();

const toStringOrNull = (value) => {
  if (value === null || value === undefined) return null;
  const v = String(value).trim();
  return v ? v : null;
};

const isHttpUrl = (value) => {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

const pickFirstHttpUrlFromValue = (value) => {
  if (typeof value === "string") {
    const s = toStringOrNull(value);
    return isHttpUrl(s) ? s : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = pickFirstHttpUrlFromValue(item);
      if (found) return found;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) {
      const found = pickFirstHttpUrlFromValue(nested);
      if (found) return found;
    }
  }
  return null;
};

const pickFirstByKeyVariants = (root, variants) => {
  const wanted = new Set(variants.map(normalizeKey));
  const stack = [root];

  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;

    if (Array.isArray(node)) {
      for (const item of node) stack.push(item);
      continue;
    }

    for (const [k, v] of Object.entries(node)) {
      if (wanted.has(normalizeKey(k))) {
        const found = pickFirstHttpUrlFromValue(v);
        if (found) return found;
      }
      if (v && typeof v === "object") stack.push(v);
    }
  }

  return null;
};

/** LSQ sometimes wraps the payload (e.g. `{ data: { ... } }`). */
const unwrapLsqPayload = (payload, depth = 0) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  if (depth > 6) return payload;
  const wrapperKeys = ["data", "result", "body", "response", "Response", "payload", "Payload"];
  for (const w of wrapperKeys) {
    if (Object.prototype.hasOwnProperty.call(payload, w)) {
      const inner = payload[w];
      if (inner && typeof inner === "object") {
        return unwrapLsqPayload(inner, depth + 1);
      }
    }
  }
  return payload;
};

const asArray = (v) => {
  if (Array.isArray(v)) return v;
  if (v && typeof v === "object") return [v];
  return [];
};

/**
 * LSQ gmeet-artifacts often returns:
 * `"transcript_links": [{ "status": "success", "transcript_link": "https://docs.google.com/..." }]`
 * Same pattern for recording_links + recording_link.
 * Prefer entries with status "success" when present.
 */
const extractUrlsFromLinkArrays = (root, arrayKeyNorms, innerKeyNorms) => {
  const wantedArray = new Set(arrayKeyNorms);
  const wantedInner = new Set(innerKeyNorms);
  const stack = [root];
  const seen = new WeakSet();

  const pickFromItems = (items) => {
    const list = asArray(items);
    const successItems = [];
    const otherItems = [];
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const st = String(item.status ?? "").trim().toLowerCase();
      if (st === "success") successItems.push(item);
      else otherItems.push(item);
    }
    const ordered = successItems.length ? [...successItems, ...otherItems] : otherItems;
    for (const item of ordered.length ? ordered : list) {
      if (!item || typeof item !== "object") continue;
      for (const [ik, iv] of Object.entries(item)) {
        if (!wantedInner.has(normalizeKey(ik))) continue;
        if (typeof iv === "string" && isHttpUrl(iv)) return iv.trim();
      }
    }
    return null;
  };

  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    if (seen.has(node)) continue;
    seen.add(node);

    if (Array.isArray(node)) {
      for (const item of node) stack.push(item);
      continue;
    }

    for (const [k, v] of Object.entries(node)) {
      if (wantedArray.has(normalizeKey(k))) {
        const found = pickFromItems(v);
        if (found) return found;
      }
      if (v && typeof v === "object") stack.push(v);
    }
  }

  return null;
};

const parseArtifacts = (payload) => {
  const root = unwrapLsqPayload(payload);

  const recordingUrl =
    pickFirstByKeyVariants(root, [
      "recordingUrl",
      "recording_url",
      "recordingLink",
      "recording_link",
      "recordingLinks",
      "recording_links",
      "videoUrl",
      "video_url",
    ]) ||
    extractUrlsFromLinkArrays(
      root,
      ["recordinglinks", "recording_links", "recordingLinks"],
      ["recordinglink", "recording_link", "recordingLink", "url", "link", "href"],
    );

  const transcriptUrl =
    pickFirstByKeyVariants(root, [
      "transcriptUrl",
      "transcript_url",
      "transcriptLink",
      "transcript_link",
      "transcriptLinks",
      "transcript_links",
      "scriptUrl",
      "script_url",
    ]) ||
    extractUrlsFromLinkArrays(
      root,
      ["transcriptlinks", "transcript_links", "transcriptLinks"],
      ["transcriptlink", "transcript_link", "transcriptLink", "url", "link", "href"],
    );

  return { recordingUrl, transcriptUrl };
};

const shouldUseMeetingLink = (meetingLink) =>
  typeof meetingLink === "string" &&
  /^https:\/\/meet\.google\.com\/[a-z0-9-]+$/i.test(meetingLink.trim());

const fetchLsqArtifacts = async (meetingLink) => {
  const url = new URL("/api/v1/lsq/gmeet-artifacts", env.lsq.baseUrl);
  url.searchParams.set("meeting_url", meetingLink);
  url.searchParams.set("service_email", env.lsq.serviceEmail);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.lsq.requestTimeoutMs);
  try {
    const headers = { accept: "application/json" };
    if (env.lsq.apiSecret) {
      headers[env.lsq.apiSecretHeader] = env.lsq.apiSecret;
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`LSQ responded ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
};

const syncOneBooking = async (booking) => {
  const now = new Date();
  const meetingLink = toStringOrNull(booking.meetingLink);

  if (!shouldUseMeetingLink(meetingLink)) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        artifactsLastSyncedAt: now,
        artifactsLastError: "Missing/invalid Google Meet URL",
        artifactsFetchAttempts: { increment: 1 },
      },
    });
    return;
  }

  try {
    const payload = await fetchLsqArtifacts(meetingLink);
    const parsed = parseArtifacts(payload);

    const nextRecording = parsed.recordingUrl || booking.recordingUrl;
    const nextTranscript = parsed.transcriptUrl || booking.transcriptUrl;
    const hasAnyUrl = Boolean(nextRecording || nextTranscript);
    const bothStillMissing = !nextRecording && !nextTranscript;

    let artifactsLastError = null;
    if (!hasAnyUrl) {
      if (bothStillMissing && isPastArtifactsDeadline(booking.endTime, now)) {
        artifactsLastError = getArtifactsNotAvailableMessage();
      } else if (bothStillMissing) {
        artifactsLastError = "LSQ returned no recording/transcript URLs yet";
      }
    }

    const data = {
      artifactsLastSyncedAt: now,
      artifactsLastError,
      artifactsFetchAttempts: { increment: 1 },
    };

    if (parsed.recordingUrl) data.recordingUrl = parsed.recordingUrl;
    if (parsed.transcriptUrl) data.transcriptUrl = parsed.transcriptUrl;

    await prisma.booking.update({
      where: { id: booking.id },
      data,
    });
  } catch (error) {
    const bothMissing = !booking.recordingUrl && !booking.transcriptUrl;
    const terminal =
      bothMissing && isPastArtifactsDeadline(booking.endTime, now)
        ? getArtifactsNotAvailableMessage()
        : error.message || "LSQ sync failed";
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        artifactsLastSyncedAt: now,
        artifactsLastError: terminal,
        artifactsFetchAttempts: { increment: 1 },
      },
    });
    logger.warn(
      `LSQ artifacts sync failed for booking ${booking.id}: ${error.message || "unknown error"}`,
    );
  }
};

let running = false;

const syncDueBookings = async () => {
  if (!env.lsq.syncEnabled) return;
  if (!prisma) return;
  if (running) return;
  running = true;
  try {
    const now = new Date();
    const dueBefore = new Date(now.getTime() - env.lsq.delayAfterMeetingMinutes * 60000);
    const retryBefore = new Date(now.getTime() - env.lsq.retryEveryMinutes * 60000);

    const due = await prisma.booking.findMany({
      where: {
        endTime: { lte: dueBefore },
        status: { in: ["scheduled", "completed"] },
        meetingLink: { not: null },
        OR: [{ recordingUrl: null }, { transcriptUrl: null }],
        NOT: { artifactsLastError: getArtifactsNotAvailableMessage() },
        AND: [
          {
            OR: [
              { artifactsLastSyncedAt: null },
              { artifactsLastSyncedAt: { lte: retryBefore } },
            ],
          },
        ],
      },
      select: {
        id: true,
        meetingLink: true,
        endTime: true,
        recordingUrl: true,
        transcriptUrl: true,
      },
      orderBy: { endTime: "asc" },
      take: Math.max(1, env.lsq.maxPerRun),
    });

    if (!due.length) return;

    for (const booking of due) {
      // eslint-disable-next-line no-await-in-loop
      await syncOneBooking(booking);
    }

    logger.info(`LSQ artifacts sync processed ${due.length} booking(s)`);
  } catch (error) {
    logger.error(`LSQ artifacts sync loop failed: ${error.message}`);
  } finally {
    running = false;
  }
};

const startLsqArtifactsSyncJob = () => {
  if (!prisma) {
    logger.info("LSQ artifacts sync disabled (Postgres is not configured)");
    return () => {};
  }

  if (!env.lsq.syncEnabled) {
    logger.info("LSQ artifacts sync disabled by config");
    return () => {};
  }

  logger.info(
    `LSQ artifacts sync enabled: poll=${env.lsq.pollMs}ms delay=${env.lsq.delayAfterMeetingMinutes}m retry=${env.lsq.retryEveryMinutes}m`,
  );

  setTimeout(() => {
    void syncDueBookings();
  }, 8000);

  const timer = setInterval(() => {
    void syncDueBookings();
  }, Math.max(30000, env.lsq.pollMs));

  return () => clearInterval(timer);
};

/**
 * One-off LSQ fetch for a single booking (does not require LSQ_SYNC_ENABLED).
 * Uses LSQ_BASE_URL, LSQ_SERVICE_EMAIL, LSQ_API_SECRET from env.
 */
const syncBookingById = async (bookingId) => {
  if (!prisma) {
    throw new Error("DATABASE_URL / Prisma is not configured");
  }
  const id = String(bookingId || "").trim();
  if (!id) {
    throw new Error("bookingId is required");
  }
  const booking = await prisma.booking.findFirst({
    where: { id },
    select: {
      id: true,
      meetingLink: true,
      endTime: true,
      recordingUrl: true,
      transcriptUrl: true,
    },
  });
  if (!booking) {
    throw new Error(`Booking not found: ${id}`);
  }
  await syncOneBooking(booking);
  return prisma.booking.findUnique({
    where: { id: booking.id },
    select: {
      id: true,
      recordingUrl: true,
      transcriptUrl: true,
      artifactsLastSyncedAt: true,
      artifactsLastError: true,
      artifactsFetchAttempts: true,
    },
  });
};

module.exports = {
  startLsqArtifactsSyncJob,
  syncDueBookings,
  syncBookingById,
};
