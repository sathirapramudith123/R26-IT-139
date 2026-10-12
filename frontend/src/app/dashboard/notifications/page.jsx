"use client";

import { useEffect, useMemo, useState } from "react";

import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import NotificationList from "@/components/notifications/NotificationList";
import useNotifications from "@/hooks/useNotifications";

import { t } from "@/lib/i18n";
export default function NotificationsPage() {
  const { items, loading, error, fetchAll, markRead, deleteNotification } = useNotifications();

  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const unreadCount = items.filter((item) => !item.is_read).length;

  const filteredItems = useMemo(() => {
    if (filter === "unread") {
      return items.filter((item) => !item.is_read);
    }

    if (filter === "high") {
      return items.filter((item) => item.priority === "high");
    }

    return items;
  }, [items, filter]);

  async function handleDelete(id) {
    if (!confirm(t("Delete this notification?"))) return;

    try {
      await deleteNotification(id);
    } catch (err) {
      alert(err.message || t("Failed to delete notification"));
    }
  }

  async function handleMarkRead(id) {
    try {
      await markRead(id);
    } catch (err) {
      alert(err.message || t("Failed to mark notification as read"));
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title={t("System Notifications")}
        description={t("Alerts from inventory, procurement, ledger, and agency banking modules.")}
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          variant={filter === "all" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          {t("All (")}
          {items.length})
        </Button>

        <Button
          variant={filter === "unread" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setFilter("unread")}
        >
          {t("Unread (")}
          {unreadCount})
        </Button>

        <Button
          variant={filter === "high" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setFilter("high")}
        >
          {t("High Priority")}
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner label={t("Loading notifications...")} />
      ) : filteredItems.length === 0 ? (
        <EmptyState icon="🔔" title={t("No notifications")} description={t("You're all caught up.")} />
      ) : (
        <NotificationList items={filteredItems} onMarkRead={handleMarkRead} onDelete={handleDelete} />
      )}
    </div>
  );
}
