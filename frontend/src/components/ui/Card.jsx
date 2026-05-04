export default function Card({ title, children, className = "", elevated = false }) {
  return (
    <div className={`${elevated ? "card-elevated" : "card"} ${className}`}>
      {title && (
        <h3 className="mb-4 font-outfit text-base font-semibold text-slate-900">{title}</h3>
      )}
      {children}
    </div>
  );
}
