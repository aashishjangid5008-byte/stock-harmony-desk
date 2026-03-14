import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, LayoutGrid, List } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Receipt {
  id: string;
  reference: string;
  receive_from: string | null;
  responsible: string | null;
  contact: string | null;
  schedule_date: string | null;
  status: string;
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    draft: "status-draft",
    ready: "status-ready",
    done: "status-done",
    cancelled: "status-cancelled",
  };
  return <Badge className={map[status] || "status-draft"}>{status}</Badge>;
};

const ReceiptListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "kanban">("list");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchReceipts();
  }, [user]);

  const fetchReceipts = async () => {
    const { data } = await supabase
      .from("receipts")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setReceipts(data || []);
    setLoading(false);
  };

  const filtered = receipts.filter(
    (r) =>
      r.reference.toLowerCase().includes(search.toLowerCase()) ||
      (r.contact || "").toLowerCase().includes(search.toLowerCase())
  );

  const kanbanStatuses = ["draft", "ready", "done"];

  return (
    <div className="animate-fade-in">
      <div className="erp-page-header">
        <h1 className="erp-page-title">Receipts</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-48"
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => setView(view === "list" ? "kanban" : "list")}>
            {view === "list" ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
          </Button>
          <Button onClick={() => navigate("/operations/receipts/new")}>
            <Plus className="mr-2 h-4 w-4" /> New Receipt
          </Button>
        </div>
      </div>

      {view === "list" ? (
        <div className="erp-table-container">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Schedule Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No receipts found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/operations/receipts/${r.id}`)}
                  >
                    <TableCell className="font-mono text-sm">{r.reference}</TableCell>
                    <TableCell>{r.receive_from || "-"}</TableCell>
                    <TableCell>{r.contact || "-"}</TableCell>
                    <TableCell>{r.schedule_date || "-"}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kanbanStatuses.map((status) => (
            <div key={status} className="erp-card p-4">
              <h3 className="font-semibold capitalize mb-3 text-sm">{status}</h3>
              <div className="space-y-2">
                {filtered
                  .filter((r) => r.status === status)
                  .map((r) => (
                    <div
                      key={r.id}
                      className="p-3 rounded-md border bg-background cursor-pointer hover:shadow-sm transition-shadow"
                      onClick={() => navigate(`/operations/receipts/${r.id}`)}
                    >
                      <div className="font-mono text-sm font-medium">{r.reference}</div>
                      <div className="text-xs text-muted-foreground mt-1">{r.receive_from || "No supplier"}</div>
                      <div className="text-xs text-muted-foreground">{r.schedule_date || "No date"}</div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReceiptListPage;
