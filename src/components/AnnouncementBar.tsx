import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Info, PartyPopper, X } from "lucide-react";

/**
 * A message from the admin, above everything else on the page.
 *
 * For the things a banner is actually for: a limited offer, a domain change, or
 * warning people a week before maintenance. Maintenance mode itself replaces the
 * whole page, which is too blunt for "we are going down on Friday".
 *
 * It sits above the navbar in the document rather than floating over it, so it
 * pushes the page down and cannot cover a menu. That costs a small layout shift
 * on first load, which is the right trade for never hiding navigation.
 */

export interface AnnouncementPayload {
  /** Content hash from the server, so a new message reappears for everyone. */
  id: string;
  message: string;
  level: "info" | "warning" | "success";
  linkUrl: string;
  linkLabel: string;
  dismissible: boolean;
}

const DISMISSED_KEY = "aivideo:announcement:dismissed";

const STYLES: Record<AnnouncementPayload["level"], { bar: string; icon: typeof Info }> = {
  info: { bar: "bg-brand text-white", icon: Info },
  warning: { bar: "bg-amber-500 text-amber-950", icon: AlertTriangle },
  success: { bar: "bg-emerald-600 text-white", icon: PartyPopper },
};

export default function AnnouncementBar({
  announcement,
}: {
  announcement: AnnouncementPayload | null | undefined;
}) {
  /**
   * Which banner this browser has closed.
   *
   * Keyed on the server's content hash, so closing "we move domain on Friday"
   * does not also hide next month's offer. Read once when the component mounts:
   * this is a client-rendered app, so there is no server markup to match and no
   * reason to make it an effect.
   */
  const [dismissedId, setDismissedId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY);
    } catch {
      // A browser refusing storage just means the banner comes back. Harmless.
      return null;
    }
  });

  /**
   * Publish the bar's height as a CSS variable.
   *
   * The dashboard's header is `fixed top-0`, so it painted straight over this bar.
   * Rather than teaching every page about the bar, the bar states how tall it is and
   * anything pinned to the top offsets by that. Zero when there is no bar, so the
   * layout is unchanged when nothing is being announced.
   */
  const barRef = useRef<HTMLDivElement | null>(null);
  const hidden = !announcement || (announcement.dismissible && dismissedId === announcement.id);

  useEffect(() => {
    const root = document.documentElement;
    if (hidden) {
      root.style.setProperty("--announcement-height", "0px");
      return;
    }
    const measure = () => {
      const height = barRef.current?.offsetHeight ?? 0;
      root.style.setProperty("--announcement-height", `${height}px`);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      root.style.setProperty("--announcement-height", "0px");
    };
  }, [hidden, announcement?.id]);

  if (!announcement) return null;
  if (announcement.dismissible && dismissedId === announcement.id) return null;

  const { bar, icon: Icon } = STYLES[announcement.level] ?? STYLES.info;

  const dismiss = () => {
    setDismissedId(announcement.id);
    try {
      localStorage.setItem(DISMISSED_KEY, announcement.id);
    } catch {
      // Then it reappears next visit, which is better than crashing the page.
    }
  };

  return (
    <div ref={barRef} className={`relative z-[60] w-full ${bar}`} role="status" aria-live="polite">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 text-[13.5px] font-medium">
        <Icon className="h-4 w-4 flex-none" aria-hidden="true" />
        <p className="min-w-0 flex-1">{announcement.message}</p>

        {announcement.linkUrl ? (
          <a
            href={announcement.linkUrl}
            className="inline-flex flex-none items-center gap-1 rounded-full bg-black/15 px-3 py-1 text-[12.5px] font-semibold transition-colors hover:bg-black/25"
          >
            {announcement.linkLabel || "Find out more"}
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        ) : null}

        {announcement.dismissible ? (
          <button
            onClick={dismiss}
            aria-label="Hide this message"
            className="grid h-6 w-6 flex-none place-items-center rounded-full transition-colors hover:bg-black/20"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
