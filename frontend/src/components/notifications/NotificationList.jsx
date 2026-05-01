import NotificationCard from "./NotificationCard";

export default function NotificationList({ items = [] }) {
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <NotificationCard key={item.id || index} item={item} />
      ))}
    </div>
  );
}
