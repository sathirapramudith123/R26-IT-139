"use client";

import { useEffect } from "react";
import PageHeader from "@/components/common/PageHeader";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import EmptyState from "@/components/common/EmptyState";
import useNotifications from "@/hooks/useNotifications";

export default function NotificationsPage() {
  const { items, loading, fetchAll } = useNotifications();

  useEffect(() => { fetchAll(); }, []);

  return (
    <div className="page-container">
      <PageHeader title="Notifications" description="Stay updated with alerts and system messages." />
      {loading ? (
        <LoadingSpinner label="Loading notifications…" />
      ) : items.length === 0 ? (
        <EmptyState icon="🔔" title="No notifications" description="You're all caught up!" />
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <Card key={n.id} className="flex items-start justify-between gap-4">
              <div>
                <p className="font-outfit font-semibold text-slate-900">{n.title}</p>
                <p className="mt-1 text-sm text-slate-500">{n.message}</p>
              </div>
              <StatusBadge status={n.status} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
