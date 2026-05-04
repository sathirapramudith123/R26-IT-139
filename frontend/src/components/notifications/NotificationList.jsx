import NotificationCard from "./NotificationCard";

export default function NotificationList({
  items = [],
  onMarkRead,
  onDelete,
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <NotificationCard
          key={item.id}
          item={item}
          onMarkRead={onMarkRead}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}