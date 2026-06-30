import Sidebar from "@/components/common/Sidebar";

export default function DashboardLayout({ children }) {
  return (
    <div className="grid gap-6 md:grid-cols-[256px_minmax(0,1fr)]">
      <Sidebar />
      <section>{children}</section>
    </div>
  );
}