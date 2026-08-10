import { useMemo } from "react";
import { useSupportContext } from "./supportContext";

/**
 * Open the support widget from anywhere, optionally with a question already in
 * the box. Handy for a "still stuck?" link at the end of a docs page.
 *
 * Lives in its own file rather than beside the widget so that SupportWidget.tsx
 * exports only components and keeps fast refresh working.
 */
export function useOpenSupport() {
  const open = useSupportContext((s) => s.open);
  const openWith = useSupportContext((s) => s.openWith);
  return useMemo(() => ({ open, openWith }), [open, openWith]);
}
