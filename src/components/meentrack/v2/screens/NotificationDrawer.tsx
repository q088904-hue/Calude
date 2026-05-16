"use client";

/**
 * NotificationDrawer — MeenTrack V2
 * Slide-down overlay from the top.
 * Shows timestamped alert feed; swipe left to dismiss individual items.
 */

import { useState } from "react";
import {
  motion, AnimatePresence,
  useMotionValue, useTransform, animate,
  type PanInfo,
} from "framer-motion";

import { X, Bell, CheckCheck, Trash2 } from "lucide-react";
import { springs } from "../tokens";
import { useEscapeKey } from "../shared/hooks";

// ── Mock data ──────────────────────────────────────────────────────────────────

type Severity = "red" | "amber" | "green";

const SEVERITY_STYLES: Record<Severity, { dot: string; bg: string; border: string }> = {
  red:   { dot: "var(--color-mt-red)",   bg: "bg-mt-red/8",   border: "border-mt-red/20"   },
  amber: { dot: "var(--color-mt-amber)", bg: "bg-mt-amber/8", border: "border-mt-amber/20" },
  green: { dot: "var(--color-mt-green)", bg: "bg-mt-green/8", border: "border-mt-green/20" },
};

type Notif = {
  id:       string;
  severity: Severity;
  title:    string;
  body:     string;
  time:     string;
  read:     boolean;
};

const INITIAL_NOTIFICATIONS: Notif[] = [
  {
    id:       "n1",
    severity: "red",
    title:    "Cyclone watch active",
    body:     "IMD reports low-pressure system 180 km SW of Kochi. Avoid seas beyond 12 nm.",
    time:     "2h ago",
    read:     false,
  },
  {
    id:       "n2",
    severity: "amber",
    title:    "PFZ zone updated",
    body:     "New productive fishing zone detected 15 nm SW of Kochi. BiteScore 91.",
    time:     "4h ago",
    read:     false,
  },
  {
    id:       "n3",
    severity: "amber",
    title:    "Rising swell Thursday",
    body:     "Wave height forecast 1.8–2.4 m from Thursday 6 AM. Plan early return.",
    time:     "6h ago",
    read:     true,
  },
  {
    id:       "n4",
    severity: "green",
    title:    "Safe window tomorrow",
    body:     "Conditions clear 5–9 AM. BiteTime™ Score forecast: 87. Wind < 10 kt.",
    time:     "8h ago",
    read:     true,
  },
];

// ── Notification card (swipe-to-dismiss) ───────────────────────────────────────

function NotifCard({
  notif,
  index,
  onDismiss,
}: {
  notif:     Notif;
  index:     number;
  onDismiss: () => void;
}) {
  const s = SEVERITY_STYLES[notif.severity];
  const x = useMotionValue(0);

  // Trash icon behind the card: fades + scales in as card slides left
  const trashOpacity = useTransform(x, [0, -40],  [0, 1]);
  const trashScale   = useTransform(x, [0, -60],  [0.6, 1]);

  async function handleDragEnd(_: PointerEvent, info: PanInfo) {
    const shouldDismiss = info.offset.x < -80 || info.velocity.x < -500;
    if (shouldDismiss) {
      // Snap fully off-screen, then remove from list
      await animate(x, -420, { duration: 0.18, ease: "easeIn" });
      onDismiss();
    } else {
      // Spring back to resting position
      animate(x, 0, { type: "spring", stiffness: 420, damping: 30 });
    }
  }

  return (
    // Wrapper clips the trash backdrop to card corners; stagger entrance on open.
    // 0.12s base lets the drawer spring travel most of its arc before cards appear.
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.06, duration: 0.25, ease: "easeOut" }}
      className="relative overflow-hidden rounded-[14px]"
    >
      {/* Trash backdrop — revealed as card slides left */}
      <div className="absolute inset-0 flex items-center justify-end pr-4 bg-mt-red/10">
        <motion.div style={{ opacity: trashOpacity, scale: trashScale }}>
          <Trash2 className="w-4 h-4 text-mt-red" />
        </motion.div>
      </div>

      {/* Draggable card */}
      <motion.div
        layout
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 1, right: 0 }}   // tracks finger freely leftward
        style={{ x, touchAction: "pan-y" }}   // don't steal vertical scroll
        onDragEnd={handleDragEnd}
        className={`relative flex gap-3 p-4 border ${s.bg} ${s.border} cursor-grab active:cursor-grabbing`}
      >
        {/* Severity dot / read indicator */}
        <div className="flex-shrink-0 mt-1">
          {notif.read ? (
            <span className="w-2 h-2 rounded-full bg-mt-border block" />
          ) : (
            <span className="w-2 h-2 rounded-full block" style={{ background: s.dot }} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p
              className={`text-[13px] font-bold leading-snug ${
                notif.read ? "text-mt-muted" : "text-mt-ink"
              }`}
            >
              {notif.title}
            </p>
            <span className="text-[10px] text-mt-dim whitespace-nowrap flex-shrink-0">
              {notif.time}
            </span>
          </div>
          <p className="text-[12px] text-mt-muted leading-relaxed">{notif.body}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────────

export function NotificationDrawer({
  visible,
  onClose,
  onMarkAllRead,
}: {
  visible:       boolean;
  onClose:       () => void;
  onMarkAllRead: () => void;
}) {
  const [notifs, setNotifs] = useState<Notif[]>(INITIAL_NOTIFICATIONS);
  const unreadCount = notifs.filter((n) => !n.read).length;

  // Close on Escape — active only while the drawer is visible.
  useEscapeKey(onClose, visible);

  function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    onMarkAllRead();
  }

  function dismiss(id: string) {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
    // If it was unread, propagate the count change upward
    const wasUnread = notifs.find((n) => n.id === id)?.read === false;
    if (wasUnread && unreadCount - 1 === 0) onMarkAllRead();
  }

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 z-40 bg-mt-base/70"
            onClick={onClose}
          />

          {/* Drawer — slides down from top */}
          <motion.div
            key="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
            initial={{ y: "-100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "-100%", transition: { duration: 0.26, ease: [0.4, 0, 1, 1] } }}
            transition={{ type: "spring", stiffness: 300, damping: 34 }}
            className="absolute top-0 left-0 right-0 z-50 bg-mt-bg border-b border-mt-border rounded-b-[24px] overflow-hidden"
            style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.6)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-mt-muted" aria-hidden="true" />
                <span className="text-[16px] font-bold text-mt-ink">Notifications</span>
                {/* Unread count badge — fades in/out as count crosses zero */}
                <AnimatePresence initial={false}>
                  {unreadCount > 0 && (
                    <motion.span
                      key="badge"
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={springs.snap}
                      className="px-1.5 py-0.5 rounded-full bg-mt-red text-[10px] font-bold text-white tabular-nums"
                    >
                      {unreadCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-3">
                {/* Mark all read — slides in from right, fades out when no unreads remain */}
                <AnimatePresence initial={false}>
                  {unreadCount > 0 && (
                    <motion.button
                      key="mark-read"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{
                        opacity: { duration: 0.18, ease: "easeInOut" },
                        x:       { duration: 0.18, ease: "easeInOut" },
                        scale:   springs.snap,
                      }}
                      whileTap={{ scale: 0.92 }}
                      onClick={markAllRead}
                      className="flex items-center gap-1 text-[11px] font-semibold text-mt-aqua"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all read
                    </motion.button>
                  )}
                </AnimatePresence>
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  transition={springs.snap}
                  onClick={onClose}
                  aria-label="Close notifications"
                  className="w-8 h-8 rounded-full bg-mt-surface border border-mt-border flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5 text-mt-muted" />
                </motion.button>
              </div>
            </div>

            {/* Swipe hint — fades out once all notifications are dismissed */}
            <AnimatePresence initial={false}>
              {notifs.length > 0 && (
                <motion.p
                  key="swipe-hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-5 pb-2 text-[10px] text-mt-border font-medium"
                >
                  Swipe left to dismiss
                </motion.p>
              )}
            </AnimatePresence>

            {/* Notification list */}
            <div className="flex flex-col gap-2 px-5 pb-5">
              <AnimatePresence mode="popLayout">
                {notifs.map((n, i) => (
                  <NotifCard key={n.id} notif={n} index={i} onDismiss={() => dismiss(n.id)} />
                ))}

                {/* Empty state */}
                {notifs.length === 0 && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="py-8 flex flex-col items-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-full bg-mt-green/10 flex items-center justify-center">
                      <CheckCheck className="w-5 h-5 text-mt-green" />
                    </div>
                    <p className="text-[13px] font-semibold text-mt-ink">All clear</p>
                    <p className="text-[11px] text-mt-dim">No active alerts</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default NotificationDrawer;
