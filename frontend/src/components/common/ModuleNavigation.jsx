import Link from "next/link";
import Card from "@/components/ui/Card";
export default function ModuleNavigation({ title="Navigation", links=[] }) {
  return (
    <Card className="mb-6">
      <h2 className="mb-4 font-outfit text-lg font-bold text-slate-900">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {links.map(link => (
          <Link key={link.href+link.title} href={link.href} className="rounded-xl border border-slate-100 bg-slate-50 p-4 transition hover:border-primary/30 hover:bg-primary/5">
            <div className="text-2xl">{link.icon}</div>
            <h3 className="mt-2 text-sm font-semibold text-slate-900">{link.title}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">{link.description}</p>
          </Link>
        ))}
      </div>
    </Card>
  );
}
