export default function Select({ label, options = [], className = "", ...props }) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="text-sm font-semibold text-slate-700">{label}</span>
      )}
      <select className={`select-field ${className}`} {...props}>
        {options.map((option) => (
          <option key={option.value ?? option} value={option.value ?? option}>
            {option.label ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}
