"use client";

import { useEffect, useMemo, useState } from "react";

import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import NotificationList from "@/components/notifications/NotificationList";
import useNotifications from "@/hooks/usePrediction";

export default function NotificationsPage() {
  const {
    items,
    loading,
    error,
    fetchAll,
    markRead,
    deleteNotification,
  } = useNotifications();

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
    if (!confirm("Delete this notification?")) return;

    try {
      await deleteNotification(id);
    } catch (err) {
      alert(err.message || "Failed to delete notification");
    }
  }

  async function handleMarkRead(id) {
    try {
      await markRead(id);
    } catch (err) {
      alert(err.message || "Failed to mark notification as read");
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="System Notifications"
        description="Alerts from inventory, procurement, ledger, and agency banking modules."
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
          All ({items.length})
        </Button>

        <Button
          variant={filter === "unread" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setFilter("unread")}
        >
          Unread ({unreadCount})
        </Button>

        <Button
          variant={filter === "high" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setFilter("high")}
        >
          High Priority
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading notifications..." />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="No notifications"
          description="You're all caught up."
        />
      ) : (
        <NotificationList
          items={filteredItems}
          onMarkRead={handleMarkRead}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}