export default function FormField({ label, error, hint, children, required }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {label}
          {required && <span className="ml-1 text-red-500 dark:text-red-400">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
          <span className="inline-block h-1 w-1 rounded-full bg-red-600 dark:bg-red-400"></span>
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-slate-500 dark:text-slate-500">{hint}</p>
      )}
    </div>
  );
}