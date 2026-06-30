export default function Input({ label, hint, className = "", ...props }) {
  return (
    <label className="block space-y-1.5">
      {label && <span className="text-sm font-semibold text-slate-700">{label}</span>}
      <input className={`input-field ${className}`} {...props} />
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </label>
  );
}