import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/common/StatusBadge";
import { t } from "@/lib/i18n";

function priorityClass(priority) {
  if (priority === "high") return "bg-red-50 text-red-700 border-red-200";
  if (priority === "medium") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

const words = (v) => String(v || "system").replaceAll("_", " ");

export default function NotificationCard({ item, onMarkRead, onDelete }) {
  if (!item) return null;

  return (
    <Card
      className={`border ${item.is_read ? "border-slate-200 dark:border-slate-800" : "border-brand-300 dark:border-brand-700"}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              {item.title}
            </h3>
            {!item.is_read && (
              <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
                {t("New")}
              </span>
            )}
            {item.priority && (
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${priorityClass(item.priority)}`}
              >
                {t(item.priority)}
              </span>
            )}
            {item.status && <StatusBadge status={item.status} />}
          </div>

          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.message}</p>

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
            <span>
              {t("Type:")} {words(item.type)}
            </span>
            <span>•</span>
            <span>
              {t("Source:")} {words(item.source_module)}
            </span>
            <span>•</span>
            <span>{item.created_at ? new Date(item.created_at).toLocaleDateString("en-LK") : "—"}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {!item.is_read && (
            <Button variant="secondary" size="sm" onClick={() => onMarkRead?.(item.id)}>
              {t("Mark Read")}
            </Button>
          )}
          <Button variant="danger" size="sm" onClick={() => onDelete?.(item.id)}>
            {t("Delete")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
