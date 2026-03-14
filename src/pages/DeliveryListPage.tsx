import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, LayoutGrid, List } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    draft: "status-draft", ready: "status-ready", done: "status-done", cancelled: "status-cancelled",
  };
  return <Badge className={map[status] || "status-draft"}>{status}</Badge>;
};

const DeliveryListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "kanban">("list");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("deliveries").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => { setDeliveries(data || []); setLoading(false); });
  }, [user]);

  const filtered = deliveries.filter(
    (d) => d.reference.toLowerCase().includes(search.toLowerCase()) || (d.contact || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="erp-page-header">
        <h1 className="erp-page-title">Deliveries</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-48" />
          </div>
          <Button variant="outline" size="icon" onClick={() => setView(view === "list" ? "kanban" : "list")}>
            {view === "list" ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
          </Button>
          <Button onClick={() => navigate("/operations/deliveries/new")}>
            <Plus className="mr-2 h-4 w-4" /> New Delivery
          </Button>
        </div>
      </div>

      {view === "list" ? (
        <div className="erp-table-container">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Schedule Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No deliveries found</TableCell></TableRow>
              ) : filtered.map((d) => (
                <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/operations/deliveries/${d.id}`)}>
                  <TableCell className="font-mono text-sm">{d.reference}</TableCell>
                  <TableCell>{d.deliver_to || "-"}</TableCell>
                  <TableCell>{d.contact || "-"}</TableCell>
                  <TableCell>{d.schedule_date || "-"}</TableCell>
                  <TableCell>{statusBadge(d.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {["draft", "ready", "done"].map((status) => (
            <div key={status} className="erp-card p-4">
              <h3 className="font-semibold capitalize mb-3 text-sm">{status}</h3>
              <div className="space-y-2">
                {filtered.filter((d) => d.status === status).map((d) => (
                  <div key={d.id} className="p-3 rounded-md border bg-background cursor-pointer hover:shadow-sm" onClick={() => navigate(`/operations/deliveries/${d.id}`)}>
                    <div className="font-mono text-sm font-medium">{d.reference}</div>
                    <div className="text-xs text-muted-foreground mt-1">{d.deliver_to || "No customer"}</div>
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

export default DeliveryListPage;
