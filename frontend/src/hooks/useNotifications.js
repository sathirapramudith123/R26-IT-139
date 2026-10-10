"use client";

import { useCallback, useState } from "react";
import { notificationApi } from "@/services/api/notification";
import { t } from "@/lib/i18n";

// Notifications list for the Notifications page (the navbar bell keeps its own small copy)
export default function useNotifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await notificationApi.list();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || t("Failed to load"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(
    async (id) => {
      await notificationApi.markRead(id);
      await fetchAll();
    },
    [fetchAll],
  );

  const deleteNotification = useCallback(
    async (id) => {
      await notificationApi.remove(id);
      await fetchAll();
    },
    [fetchAll],
  );

  return { items, loading, error, fetchAll, markRead, deleteNotification };
}
