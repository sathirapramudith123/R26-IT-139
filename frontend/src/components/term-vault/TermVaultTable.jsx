import Table from "@/components/ui/Table";

const columns = [
  {
    "key": "id",
    "label": "Id"
  },
  {
    "key": "name",
    "label": "Name"
  },
  {
    "key": "members",
    "label": "Members"
  },
  {
    "key": "status",
    "label": "Status"
  }
];

export default function TermVaultTable({ rows = [] }) {
  return <Table columns={columns} rows={rows} />;
}
