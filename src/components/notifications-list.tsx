"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { closeSystemNotifications } from "@/lib/chat-seen";
import type { Notification } from "@/lib/types";
import { NotificationItem } from "./notification-bell";

/** Full notification history. Viewing it marks everything as read. */
export function NotificationsList({ items }: { items: Notification[] }) {
  useEffect(() => {
    const unread = items.filter((n) => !n.read_at).map((n) => n.id);
    if (unread.length) {
      createClient()
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", unread)
        .then(() => window.dispatchEvent(new Event("sideline:notifications-read")));
      closeSystemNotifications((tag) => unread.includes(tag));
    }
  }, [items]);

  return (
    <div className="card divide-y divide-line overflow-hidden">
      {items.map((n) => (
        <NotificationItem key={n.id} n={n} />
      ))}
    </div>
  );
}
