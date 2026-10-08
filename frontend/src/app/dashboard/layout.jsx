import Sidebar from "@/components/common/Sidebar";

export default function DashboardLayout({ children }) {
  return (
    // minmax(0,1fr) on phones too: an auto column grew to the width of a wide table
    // (940px) and the whole page scrolled sideways instead of just the table
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[256px_minmax(0,1fr)]">
      <Sidebar />
      <section>{children}</section>
    </div>
  );
}
