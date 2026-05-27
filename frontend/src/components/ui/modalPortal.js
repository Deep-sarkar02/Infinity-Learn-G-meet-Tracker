import { createPortal } from "react-dom";

/** Render overlays on document.body so `position:fixed` covers the full viewport (not a transformed ancestor). */
export const renderModalPortal = (node) => {
  if (typeof document === "undefined") return node;
  return createPortal(node, document.body);
};
