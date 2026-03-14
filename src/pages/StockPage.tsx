import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const StockPage = () => {
  const { user } = useAuth();
  const [stocks, setStocks] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<any>(null);
  const [form, setForm] = useState({ productName: "", perUnitCost: 0, onHand: 0, freeToUse: 0 });

  useEffect(() => {
    if (user) fetchStocks();
  }, [user]);

  const fetchStocks = async () => {
    const { data } = await supabase
      .from("stocks")
      .select("*, products(name, per_unit_cost)")
      .eq("user_id", user!.id);
    setStocks(data || []);
    setLoading(false);
  };

  const filtered = stocks.filter((s) =>
    (s.products?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => {
    setEditingStock(null);
    setForm({ productName: "", perUnitCost: 0, onHand: 0, freeToUse: 0 });
    setDialogOpen(true);
  };

  const openEdit = (stock: any) => {
    setEditingStock(stock);
    setForm({
      productName: stock.products?.name || "",
      perUnitCost: Number(stock.products?.per_unit_cost) || 0,
      onHand: Number(stock.on_hand),
      freeToUse: Number(stock.free_to_use),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      if (editingStock) {
        await supabase.from("products").update({ per_unit_cost: form.perUnitCost }).eq("id", editingStock.product_id);
        await supabase.from("stocks").update({ on_hand: form.onHand, free_to_use: form.freeToUse }).eq("id", editingStock.id);
        toast.success("Stock updated");
      } else {
        const { data: product } = await supabase.from("products").insert({ name: form.productName, per_unit_cost: form.perUnitCost, user_id: user.id }).select().single();
        await supabase.from("stocks").insert({ product_id: product!.id, on_hand: form.onHand, free_to_use: form.freeToUse, user_id: user.id });
        toast.success("Stock added");
      }
      setDialogOpen(false);
      fetchStocks();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (stock: any) => {
    if (!confirm("Delete this stock entry?")) return;
    await supabase.from("stocks").delete().eq("id", stock.id);
    toast.success("Stock deleted");
    fetchStocks();
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="animate-fade-in">
      <div className="erp-page-header">
        <h1 className="erp-page-title">Stock</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search product..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-48" />
          </div>
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Add Stock</Button>
        </div>
      </div>

      <div className="erp-table-container">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Per Unit Cost</TableHead>
              <TableHead>On Hand</TableHead>
              <TableHead>Free To Use</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No stock found</TableCell></TableRow>
            ) : filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.products?.name || "Unknown"}</TableCell>
                <TableCell>${Number(s.products?.per_unit_cost || 0).toFixed(2)}</TableCell>
                <TableCell>{Number(s.on_hand)}</TableCell>
                <TableCell>{Number(s.free_to_use)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingStock ? "Edit Stock" : "Add Stock"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {!editingStock && (
              <div className="space-y-2"><Label>Product Name</Label><Input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} /></div>
            )}
            <div className="space-y-2"><Label>Per Unit Cost</Label><Input type="number" value={form.perUnitCost} onChange={(e) => setForm({ ...form, perUnitCost: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>On Hand</Label><Input type="number" value={form.onHand} onChange={(e) => setForm({ ...form, onHand: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Free To Use</Label><Input type="number" value={form.freeToUse} onChange={(e) => setForm({ ...form, freeToUse: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter><Button onClick={handleSave}>{editingStock ? "Update" : "Add"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockPage;
