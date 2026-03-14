import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ProductCombobox } from "@/components/ProductCombobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const AdjustmentPage = () => {
  const { user } = useAuth();
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ productId: "", productName: "", physicalQty: 0, reason: "" });

  useEffect(() => {
    if (user) fetchAdjustments();
  }, [user]);

  const fetchAdjustments = async () => {
    const { data } = await supabase.from("adjustments").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
    setAdjustments(data || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!user || !form.productName) return;
    try {
      let productId = form.productId;
      if (!productId) {
        const { data: p } = await supabase.from("products").insert({ name: form.productName, user_id: user.id }).select().single();
        productId = p!.id;
      }

      // Get current stock
      const { data: stock } = await supabase.from("stocks").select("on_hand").eq("product_id", productId).eq("user_id", user.id).single();
      const systemQty = stock ? Number(stock.on_hand) : 0;
      const adjustment = form.physicalQty - systemQty;

      const { data: countData } = await supabase.from("adjustments").select("id", { count: "exact" }).eq("user_id", user.id);
      const ref = `WH/ADJ/${String((countData?.length || 0) + 1).padStart(4, "0")}`;

      await supabase.from("adjustments").insert({
        reference: ref, product_id: productId, product_name: form.productName,
        system_qty: systemQty, physical_qty: form.physicalQty, adjustment,
        reason: form.reason, user_id: user.id,
      });

      toast.success("Adjustment created");
      setDialogOpen(false);
      fetchAdjustments();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleValidate = async (adj: any) => {
    if (!user) return;
    try {
      const { data: stock } = await supabase.from("stocks").select("*").eq("product_id", adj.product_id).eq("user_id", user.id).single();

      if (stock) {
        await supabase.from("stocks").update({
          on_hand: Number(stock.on_hand) + Number(adj.adjustment),
          free_to_use: Number(stock.free_to_use) + Number(adj.adjustment),
        }).eq("id", stock.id);
      } else {
        await supabase.from("stocks").insert({
          product_id: adj.product_id, on_hand: adj.physical_qty, free_to_use: adj.physical_qty, user_id: user.id,
        });
      }

      await supabase.from("move_history").insert({
        reference: adj.reference, product_name: adj.product_name,
        quantity: Math.abs(Number(adj.adjustment)),
        movement_type: "adjustment", from_location: "Adjustment", to_location: "Warehouse",
        user_id: user.id,
      });

      await supabase.from("adjustments").update({ status: "done" }).eq("id", adj.id);
      toast.success("Adjustment validated");
      fetchAdjustments();
    } catch (err: any) { toast.error(err.message); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="animate-fade-in">
      <div className="erp-page-header">
        <h1 className="erp-page-title">Inventory Adjustment</h1>
        <Button onClick={() => { setForm({ productId: "", productName: "", physicalQty: 0, reason: "" }); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> New Adjustment
        </Button>
      </div>

      <div className="erp-table-container">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>System Qty</TableHead>
              <TableHead>Physical Qty</TableHead>
              <TableHead>Adjustment</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {adjustments.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No adjustments</TableCell></TableRow>
            ) : adjustments.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono text-sm">{a.reference}</TableCell>
                <TableCell>{a.product_name}</TableCell>
                <TableCell>{Number(a.system_qty)}</TableCell>
                <TableCell>{Number(a.physical_qty)}</TableCell>
                <TableCell>
                  <span className={Number(a.adjustment) < 0 ? "text-destructive font-medium" : Number(a.adjustment) > 0 ? "text-success font-medium" : ""}>
                    {Number(a.adjustment) > 0 ? "+" : ""}{Number(a.adjustment)}
                  </span>
                </TableCell>
                <TableCell>{a.reason || "-"}</TableCell>
                <TableCell><Badge className={`status-${a.status}`}>{a.status}</Badge></TableCell>
                <TableCell>
                  {a.status === "draft" && (
                    <Button variant="ghost" size="sm" onClick={() => handleValidate(a)}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Validate
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Adjustment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <ProductCombobox value={form.productName} onSelect={(pid, pname) => setForm({ ...form, productId: pid, productName: pname })} />
            </div>
            <div className="space-y-2"><Label>Physical Quantity</Label><Input type="number" value={form.physicalQty} onChange={(e) => setForm({ ...form, physicalQty: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Reason</Label><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g., Damaged items" /></div>
          </div>
          <DialogFooter><Button onClick={handleCreate}>Create Adjustment</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdjustmentPage;
