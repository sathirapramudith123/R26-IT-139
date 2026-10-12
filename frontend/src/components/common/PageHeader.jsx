// Blue gradient banner at the top of every module page; buttons passed as `action`
// turn into the green / white pills (see .page-hero in globals.css).
export default function PageHeader({ title, description, action }) {
  return (
    <div className="page-hero relative overflow-hidden rounded-3xl gradient-brand px-6 py-6 text-white shadow-elevated sm:px-8">
      <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-16 right-28 h-32 w-32 rounded-full bg-white/5" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">{title}</h1>
          {description && <p className="mt-1 text-sm text-white/80">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
