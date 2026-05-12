/**
 * Logs LeadSquared CreateCustom payload when the server includes `lsqProspectActivityDebug` (dev flag).
 * Also reads `debug.lsqProspectActivity` (duplicate path for older clients).
 * Uses console.warn so messages stay visible when "Default levels" hides verbose Info.
 * @param {Record<string, unknown>} body - Axios response `data` from POST /public/bookings
 */
export function logLsqProspectActivityFromApi(body) {
  const dbg =
    body?.lsqProspectActivityDebug ||
    (body?.debug && typeof body.debug === "object" ? body.debug.lsqProspectActivity : undefined);

  if (!dbg) {
    console.warn(
      "[Infinity Learn] LeadSquared — no debug block on booking response. Response keys:",
      body && typeof body === "object" ? Object.keys(body) : body,
      "| Enable LSQ_PROSPECT_ACTIVITY_CLIENT_DEBUG on the API (non-production defaults on), restart backend, book again.",
    );
    return;
  }

  if (dbg.postJson) {
    console.warn(
      "[Infinity Learn] LeadSquared CreateCustom — JSON POST body (keys/URL stay on server only):",
      dbg.postJson,
    );
    if (dbg.path) {
      console.warn(`[Infinity Learn] LeadSquared path: ${dbg.method || "POST"} …/${dbg.path}`);
    }
    if (dbg.note) console.warn(`[Infinity Learn] ${dbg.note}`);
    if (dbg.lsqDispatchEnabled === false) {
      console.warn(
        "[Infinity Learn] LSQ_PROSPECT_ACTIVITY_ENABLED is false — this payload was not sent to LeadSquared (debug preview only).",
      );
    }

    const nr = dbg.notifyResult;
    if (nr && typeof nr === "object") {
      if (nr.skipped === true) {
        console.warn(
          `[Infinity Learn] LeadSquared — not pushed. Reason: ${nr.reason || "skipped"}`,
        );
      } else if (nr.ok === true) {
        console.warn(
          `[Infinity Learn] LeadSquared — activity pushed successfully (HTTP ${nr.httpStatus ?? "OK"}).`,
        );
        if (nr.lsqResponse != null && typeof nr.lsqResponse === "object") {
          console.warn("[Infinity Learn] LeadSquared API response:", nr.lsqResponse);
        }
      } else {
        console.warn(
          `[Infinity Learn] LeadSquared — push failed${nr.httpStatus != null ? ` (HTTP ${nr.httpStatus})` : ""}: ${nr.detail || "unknown error"}`,
        );
        if (nr.lsqResponse != null && typeof nr.lsqResponse === "object") {
          console.warn("[Infinity Learn] LeadSquared API response (often explains the failure):", nr.lsqResponse);
        }
      }
    }
    return;
  }

  if (dbg.skippedReason) {
    console.warn(`[Infinity Learn] LeadSquared debug — no payload: ${dbg.skippedReason}`);
  }
}
