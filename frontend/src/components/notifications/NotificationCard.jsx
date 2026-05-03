import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/common/StatusBadge";

function priorityClass(priority) {
  if (priority === "high") return "bg-red-50 text-red-700 border-red-200";
  if (priority === "medium") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

export default function NotificationCard({
  item,
  onMarkRead,
  onDelete,
}) {
  if (!item) return null;

  return (
    <Card
      className={`border ${
        item.is_read ? "border-slate-200" : "border-primary/40 bg-primary/5"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-outfit text-lg font-semibold text-slate-900">
              {item.title}
            </h3>

            {!item.is_read && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                New
              </span>
            )}

            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${priorityClass(
                item.priority
              )}`}
            >
              {item.priority}
            </span>

            <StatusBadge status={item.status} />
          </div>

          <p className="mt-2 text-sm text-slate-600">{item.message}</p>

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
            <span>Type: {String(item.type || "system").replaceAll("_", " ")}</span>
            <span>•</span>
            <span>
              Source: {String(item.source_module || "system").replaceAll("_", " ")}
            </span>
            {item.source_id && (
              <>
                <span>•</span>
                <span>ID: {item.source_id}</span>
              </>
            )}
            <span>•</span>
            <span>
              {item.created_at
                ? new Date(item.created_at).toLocaleDateString("en-LK")
                : "—"}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {!item.is_read && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onMarkRead?.(item.id)}
            >
              Mark Read
            </Button>
          )}

          <Button
            variant="danger"
            size="sm"
            onClick={() => onDelete?.(item.id)}
          >
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}