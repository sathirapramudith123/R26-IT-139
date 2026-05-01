"use client";
import { useState, useCallback } from "react";
import { notificationApi } from "@/services/api/notification.api";

export default function useNotifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationApi.list();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { items, loading, error, fetchAll };
}
