import Table from "@/components/ui/Table";

const columns = [
  {
    "key": "id",
    "label": "Id"
  },
  {
    "key": "title",
    "label": "Title"
  },
  {
    "key": "amount",
    "label": "Amount"
  },
  {
    "key": "status",
    "label": "Status"
  }
];

export default function LedgerTable({ rows = [] }) {
  return <Table columns={columns} rows={rows} />;
}
