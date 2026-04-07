import { useEffect, useState } from "react";
import { Inbox, Mailbox } from "lucide-react";
import { toast } from "sonner";
import { fetchAdminContactMessages } from "@/lib/adminApi";
import {
  AdminLoadingState,
  AdminPageShell,
  AdminPanel,
  AdminSearchField,
  AdminStatusBadge,
  AdminStatCard,
} from "./AdminWorkspaceCommon";

export default function AdminContactMessages() {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadMessages = async (nextSearch = search) => {
    try {
      setLoading(true);
      const response = await fetchAdminContactMessages({ search: nextSearch });
      setItems(response.data?.data?.items || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load contact messages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  if (loading && !items.length) {
    return <AdminLoadingState label="Loading support inbox..." />;
  }

  return (
    <AdminPageShell
      title="Contact Messages"
      description="View messages coming in from the public contact form."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <AdminStatCard icon={Inbox} title="Inbox messages" value={items.length} />
        <AdminStatCard icon={Mailbox} title="Newest message" value={items[0]?.createdLabel || "No messages"} tone="text-blue-600" />
      </div>

      <AdminPanel>
        <AdminSearchField
          value={search}
          onChange={(value) => {
            setSearch(value);
            loadMessages(value);
          }}
          placeholder="Search messages, subjects, or senders..."
        />
      </AdminPanel>

      <AdminPanel>
        <div className="admin-table-shell">
          <table className="admin-table">
            <thead className="admin-table-head">
              <tr>
                <th className="admin-table-head-cell">Date</th>
                <th className="admin-table-head-cell">Name</th>
                <th className="admin-table-head-cell">Email</th>
                <th className="admin-table-head-cell">Subject</th>
                <th className="admin-table-head-cell">Status</th>
                <th className="admin-table-head-cell">Message</th>
              </tr>
            </thead>
            <tbody className="admin-table-body">
              {items.map((message) => (
                <tr key={message.id} className="admin-table-row">
                  <td className="admin-cell">{message.createdLabel}</td>
                  <td className="admin-cell">
                    <p className="admin-cell-strong">{message.name}</p>
                  </td>
                  <td className="admin-cell">{message.email}</td>
                  <td className="admin-cell">{message.subject}</td>
                  <td className="admin-cell">
                    <AdminStatusBadge value={message.status} />
                  </td>
                  <td className="admin-cell">
                    <p className="line-clamp-3 max-w-xl text-xs leading-6 text-muted-foreground">
                      {message.message}
                    </p>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td className="admin-empty-state" colSpan={6}>
                    No contact messages found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </AdminPageShell>
  );
}
