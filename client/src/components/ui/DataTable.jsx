import { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";

export default function DataTable({ columns, data, searchable = true, initialSortKey = null }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState(initialSortKey || (columns[0]?.key));
  const [sortDir, setSortDir] = useState("asc");

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Search
    if (search && searchable) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(obj => 
        Object.values(obj).some(val => 
          val !== null && val !== undefined && val.toString().toLowerCase().includes(lowerSearch)
        )
      );
    }

    // Sort
    if (sortKey) {
      result.sort((a, b) => {
        let valA = a[sortKey];
        let valB = b[sortKey];
        
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortDir === "asc" ? -1 : 1;
        if (valA > valB) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, search, sortKey, sortDir, searchable]);

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
      {searchable && (
        <div className="p-4 border-b border-border flex justify-between items-center">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input 
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground text-xs uppercase border-b border-border">
            <tr>
              {columns.map(col => (
                <th 
                  key={col.key} 
                  className={`px-6 py-3 font-medium ${col.sortable !== false ? 'cursor-pointer hover:text-foreground hover:bg-muted select-none' : ''}`}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable !== false && sortKey === col.key && (
                      sortDir === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedData.length > 0 ? (
              filteredAndSortedData.map((row, index) => (
                <tr key={index} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  {columns.map(col => (
                    <td key={col.key} className="px-6 py-4 whitespace-nowrap text-foreground">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-muted-foreground">
                  No results found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
