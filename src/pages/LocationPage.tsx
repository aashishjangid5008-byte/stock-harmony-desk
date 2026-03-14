import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const LocationPage = () => {
  const { user } = useAuth();
  const [locations, setLocations] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", shortCode: "", warehouseId: "" });

  useEffect(() => {
    if (user) {
      fetchLocations();
      fetchWarehouses();
    }
  }, [user]);

  const fetchLocations = async () => {
    const { data } = await supabase.from("locations").select("*, warehouses(name, short_code)").eq("user_id", user!.id).order("created_at");
    setLocations(data || []);
    setLoading(false);
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase.from("warehouses").select("id, name, short_code").eq("user_id", user!.id);
    setWarehouses(data || []);
  };

  const handleSave = async () => {
    if (!user || !form.warehouseId) return;
    try {
      if (editing) {
        await supabase.from("locations").update({ name: form.name, short_code: form.shortCode, warehouse_id: form.warehouseId }).eq("id", editing.id);
        toast.success("Location updated");
      } else {
        await supabase.from("locations").insert({ name: form.name, short_code: form.shortCode, warehouse_id: form.warehouseId, user_id: user.id });
        toast.success("Location created");
      }
      setDialogOpen(false);
      fetchLocations();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this location?")) return;
    await supabase.from("locations").delete().eq("id", id);
    toast.success("Location deleted");
    fetchLocations();
  };

  const openEdit = (loc: any) => {
    setEditing(loc);
    setForm({ name: loc.name, shortCode: loc.short_code, warehouseId: loc.warehouse_id });
    setDialogOpen(true);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="animate-fade-in">
      <div className="erp-page-header">
        <h1 className="erp-page-title">Locations</h1>
        <Button onClick={() => { setEditing(null); setForm({ name: "", shortCode: "", warehouseId: "" }); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Location
        </Button>
      </div>

      <div className="erp-table-container">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Short Code</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No locations</TableCell></TableRow>
            ) : locations.map((loc) => (
              <TableRow key={loc.id}>
                <TableCell className="font-medium">{loc.name}</TableCell>
                <TableCell className="font-mono">{loc.short_code}</TableCell>
                <TableCell>{loc.warehouses?.name || "-"} ({loc.warehouses?.short_code || ""})</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(loc)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(loc.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Location" : "Add Location"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Rack A1" /></div>
            <div className="space-y-2"><Label>Short Code</Label><Input value={form.shortCode} onChange={(e) => setForm({ ...form, shortCode: e.target.value })} placeholder="e.g., RA1" /></div>
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <Select value={form.warehouseId} onValueChange={(v) => setForm({ ...form, warehouseId: v })}>
                <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>{wh.name} ({wh.short_code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocationPage;
