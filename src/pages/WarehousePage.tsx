import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const WarehousePage = () => {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", shortCode: "", address: "" });

  useEffect(() => {
    if (user) fetchWarehouses();
  }, [user]);

  const fetchWarehouses = async () => {
    const { data } = await supabase.from("warehouses").select("*").eq("user_id", user!.id).order("created_at");
    setWarehouses(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      if (editing) {
        await supabase.from("warehouses").update({ name: form.name, short_code: form.shortCode, address: form.address }).eq("id", editing.id);
        toast.success("Warehouse updated");
      } else {
        await supabase.from("warehouses").insert({ name: form.name, short_code: form.shortCode, address: form.address, user_id: user.id });
        toast.success("Warehouse created");
      }
      setDialogOpen(false);
      fetchWarehouses();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this warehouse?")) return;
    await supabase.from("warehouses").delete().eq("id", id);
    toast.success("Warehouse deleted");
    fetchWarehouses();
  };

  const openEdit = (wh: any) => {
    setEditing(wh);
    setForm({ name: wh.name, shortCode: wh.short_code, address: wh.address || "" });
    setDialogOpen(true);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="animate-fade-in">
      <div className="erp-page-header">
        <h1 className="erp-page-title">Warehouses</h1>
        <Button onClick={() => { setEditing(null); setForm({ name: "", shortCode: "", address: "" }); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Warehouse
        </Button>
      </div>

      <div className="erp-table-container">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Short Code</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {warehouses.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No warehouses</TableCell></TableRow>
            ) : warehouses.map((wh) => (
              <TableRow key={wh.id}>
                <TableCell className="font-medium">{wh.name}</TableCell>
                <TableCell className="font-mono">{wh.short_code}</TableCell>
                <TableCell>{wh.address || "-"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(wh)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(wh.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Warehouse" : "Add Warehouse"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Central Warehouse" /></div>
            <div className="space-y-2"><Label>Short Code</Label><Input value={form.shortCode} onChange={(e) => setForm({ ...form, shortCode: e.target.value })} placeholder="e.g., WH01" /></div>
            <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="e.g., Ahmedabad, Gujarat" /></div>
          </div>
          <DialogFooter><Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WarehousePage;
