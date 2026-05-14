/**
 * Parent WhatsApp outcome helper (`parentWhatsAppResult` from server).
 * Console output disabled — re-enable locally if needed.
 * @param {{
 *   parentWhatsAppResult?: {
 *     skipped?: boolean;
 *     requested?: boolean;
 *     ok?: boolean;
 *     skippedReason?: string;
 *     httpStatus?: number;
 *     messageId?: string;
 *     detail?: string;
 *     destinationLast4?: string;
 *     templateUsed?: string;
 *   };
 *   parentWhatsAppQueued?: boolean;
 *   parentWhatsAppEvent?: string | null;
 * }} body - Axios response `data`
 */
export function logParentWhatsAppFromApi(body) {
  if (!body?.parentWhatsAppResult && body?.parentWhatsAppQueued !== true) return;

  const evt = body.parentWhatsAppEvent || "roster_whatsapp";
  const r = body.parentWhatsAppResult;

  if (r?.skipped) {
    // console.warn(
    //   `[Infinity Learn] Parent WhatsApp — not sent (${evt}). Reason: ${r.skippedReason || "skipped"}`,
    // );
    return;
  }

  if (r?.ok) {
    // const dest =
    //   r.destinationLast4 != null && r.destinationLast4 !== ""
    //     ? `Destination WhatsApp number ends in …${r.destinationLast4}. `
    //     : "";
    // const tpl = r.templateUsed ? `Template id: ${r.templateUsed}. ` : "";
    // console.info(
    //   `[Infinity Learn] Parent WhatsApp — Gupshup accepted (${evt}). ${dest}${tpl}messageId=${r.messageId || "(none)"}.`,
    // );
    // console.info(
    //   "[Infinity Learn] If no message appears on the phone: open Gupshup → message/logs for that messageId (delivery errors show there). Confirm the roster mobile matches that WhatsApp account; template must stay approved; some regions require opt-in.",
    // );
    return;
  }

  if (r?.requested) {
    // console.warn(
    //   `[Infinity Learn] Parent WhatsApp — send failed (${evt}). HTTP ${r.httpStatus ?? "?"} ${r.detail ? `— ${r.detail}` : ""}`,
    // );
    return;
  }

  if (body.parentWhatsAppQueued === true) {
    // console.info(`[Infinity Learn] Parent WhatsApp (${evt}) — queued flag set (legacy response).`);
  }
}
