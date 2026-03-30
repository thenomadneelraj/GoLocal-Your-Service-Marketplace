import { cn } from "@/lib/utils";

export function AdminTable({
  columns,
  data,
  loading,
  error,
  emptyMessage = "No records found",
  renderRow,
}) {
  if (error) {
    return (
      <div className="admin-alert">
        {error}
      </div>
    );
  }

  return (
    <div className="admin-table-shell">
      <div className="overflow-x-auto">
        <table className="admin-table">
          <thead className="admin-table-head">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "admin-table-head-cell",
                    col.headerClassName
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="admin-table-body">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="admin-empty-state"
                >
                  Loading data...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="admin-empty-state"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => renderRow(row))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

