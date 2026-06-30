export default function LoadingSpinner({ label = "Loading...", size = "md" }) {
  const sizes = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-8 w-8" };
  return (
    <div className="flex items-center justify-center gap-3 py-8 text-sm text-slate-500">
      <div className={`${sizes[size]} animate-spin rounded-full border-2 border-slate-200 border-t-teal-700`} />
      <span>{label}</span>
    </div>
  );
}