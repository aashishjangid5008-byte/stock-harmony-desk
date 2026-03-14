import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Trash2, CheckCircle, Printer, X } from "lucide-react";
import { toast } from "sonner";
import { generateDeliveryPDF } from "@/lib/pdfGenerator";
import { ProductCombobox } from "@/components/ProductCombobox";

interface DeliveryItem {
  id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  insufficientStock?: boolean;
}

const DeliveryFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const isNew = !id || id === "new";

  const [deliverTo, setDeliverTo] = useState("");
  const [responsible, setResponsible] = useState("");
  const [contact, setContact] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [status, setStatus] = useState("draft");
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) setResponsible(profile.display_name || profile.login_id);
  }, [profile]);

  useEffect(() => {
    if (!isNew && user) fetchDelivery();
  }, [id, user]);

  const fetchDelivery = async () => {
    setLoading(true);
    const { data } = await supabase.from("deliveries").select("*").eq("id", id!).single();
    if (data) {
      setDeliverTo(data.deliver_to || "");
      setResponsible(data.responsible || "");
      setContact(data.contact || "");
      setScheduleDate(data.schedule_date || "");
      setStatus(data.status);
      setReference(data.reference);
      const { data: di } = await supabase.from("delivery_items").select("*").eq("delivery_id", id!);
      setItems(di?.map((i) => ({ id: i.id, product_id: i.product_id, product_name: i.product_name, quantity: Number(i.quantity) })) || []);
    }
    setLoading(false);
  };

  const addItem = () => setItems([...items, { product_id: "", product_name: "", quantity: 1 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (isNew) {
        const { data: countData } = await supabase.from("deliveries").select("id", { count: "exact" }).eq("user_id", user.id);
        const ref = `WH/OUT/${String((countData?.length || 0) + 1).padStart(4, "0")}`;
        const { data: delivery, error } = await supabase.from("deliveries").insert({
          reference: ref, deliver_to: deliverTo, responsible, contact, schedule_date: scheduleDate || null, status: "draft", user_id: user.id,
        }).select().single();
        if (error) throw error;

        for (const item of items) {
          if (!item.product_name) continue;
          let productId = item.product_id;
          if (!productId) {
            const { data: product } = await supabase.from("products").insert({ name: item.product_name, user_id: user.id }).select().single();
            productId = product!.id;
          }
          await supabase.from("delivery_items").insert({ delivery_id: delivery!.id, product_id: productId, product_name: item.product_name, quantity: item.quantity });
        }
        toast.success("Delivery created");
        navigate(`/operations/deliveries/${delivery!.id}`);
      } else {
        await supabase.from("deliveries").update({ deliver_to: deliverTo, responsible, contact, schedule_date: scheduleDate || null }).eq("id", id!);
        await supabase.from("delivery_items").delete().eq("delivery_id", id!);
        for (const item of items) {
          if (!item.product_name) continue;
          let productId = item.product_id;
          if (!productId) {
            const { data: product } = await supabase.from("products").insert({ name: item.product_name, user_id: user.id }).select().single();
            productId = product!.id;
          }
          await supabase.from("delivery_items").insert({ delivery_id: id!, product_id: productId, product_name: item.product_name, quantity: item.quantity });
        }
        toast.success("Delivery updated");
        fetchDelivery();
      }
    } catch (err: any) { toast.error(err.message); }
    setSaving(false);
  };

  const handleValidate = async () => {
    if (!user || !id) return;
    setSaving(true);
    try {
      const nextStatus = status === "draft" ? "ready" : "done";
      if (nextStatus === "done") {
        // Check stock
        let hasInsufficient = false;
        const updatedItems = [...items];
        for (let i = 0; i < updatedItems.length; i++) {
          const { data: stock } = await supabase.from("stocks").select("on_hand").eq("product_id", updatedItems[i].product_id).eq("user_id", user.id).single();
          if (!stock || Number(stock.on_hand) < updatedItems[i].quantity) {
            updatedItems[i].insufficientStock = true;
            hasInsufficient = true;
          } else {
            updatedItems[i].insufficientStock = false;
          }
        }
        setItems(updatedItems);
        if (hasInsufficient) { toast.error("Insufficient Stock for highlighted items"); setSaving(false); return; }

        for (const item of items) {
          const { data: stock } = await supabase.from("stocks").select("*").eq("product_id", item.product_id).eq("user_id", user.id).single();
          if (stock) {
            await supabase.from("stocks").update({
              on_hand: Number(stock.on_hand) - item.quantity,
              free_to_use: Number(stock.free_to_use) - item.quantity,
            }).eq("id", stock.id);
          }
          await supabase.from("move_history").insert({
            reference, contact: contact || deliverTo, from_location: "Warehouse", to_location: deliverTo || "Customer",
            product_name: item.product_name, quantity: item.quantity, movement_type: "outgoing", user_id: user.id,
          });
        }
      }
      await supabase.from("deliveries").update({ status: nextStatus }).eq("id", id);
      setStatus(nextStatus);
      toast.success(`Delivery ${nextStatus === "ready" ? "marked as ready" : "validated"}`);
    } catch (err: any) { toast.error(err.message); }
    setSaving(false);
  };

  const handleCancel = async () => {
    if (!id) return;
    await supabase.from("deliveries").update({ status: "cancelled" }).eq("id", id);
    setStatus("cancelled");
    toast.success("Delivery cancelled");
  };

  const handlePrint = () => {
    generateDeliveryPDF({ reference, deliverTo, responsible, scheduleDate, items });
  };

  if (loading) return <div className="flex justify-center py-8 text-muted-foreground">Loading...</div>;

  const editable = status !== "done" && status !== "cancelled";

  return (
    <div className="animate-fade-in max-w-4xl">
      <div className="erp-page-header">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/operations/deliveries")}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="erp-page-title">{isNew ? "New Delivery" : reference}</h1>
          {!isNew && <Badge className={`status-${status}`}>{status}</Badge>}
        </div>
        {!isNew && editable && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Print</Button>
            <Button variant="outline" onClick={handleCancel}><X className="mr-2 h-4 w-4" /> Cancel</Button>
            <Button onClick={handleValidate} disabled={saving}>
              <CheckCircle className="mr-2 h-4 w-4" /> {status === "draft" ? "Mark Ready" : "Validate"}
            </Button>
          </div>
        )}
      </div>

      <div className="erp-card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2"><Label>Deliver To</Label><Input value={deliverTo} onChange={(e) => setDeliverTo(e.target.value)} disabled={!editable} /></div>
          <div className="space-y-2"><Label>Responsible</Label><Input value={responsible} onChange={(e) => setResponsible(e.target.value)} disabled={!editable} /></div>
          <div className="space-y-2"><Label>Contact</Label><Input value={contact} onChange={(e) => setContact(e.target.value)} disabled={!editable} /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2"><Label>Schedule Date</Label><Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} disabled={!editable} /></div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base">Products</Label>
            {editable && <Button variant="outline" size="sm" onClick={addItem}><Plus className="mr-1 h-3 w-3" /> Add Product</Button>}
          </div>
          <div className="erp-table-container">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="w-32">Quantity</TableHead>
                  {editable && <TableHead className="w-16"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No products added</TableCell></TableRow>
                ) : items.map((item, idx) => (
                  <TableRow key={idx} className={item.insufficientStock ? "bg-destructive/10" : ""}>
                    <TableCell>
                      {!editable ? item.product_name : (
                        <ProductCombobox value={item.product_name} onSelect={(pid, pname) => {
                          const u = [...items]; u[idx].product_id = pid; u[idx].product_name = pname; setItems(u);
                        }} />
                      )}
                      {item.insufficientStock && <span className="text-xs text-destructive block mt-1">Insufficient Stock</span>}
                    </TableCell>
                    <TableCell>
                      <Input type="number" min={1} value={item.quantity} onChange={(e) => { const u = [...items]; u[idx].quantity = Number(e.target.value); setItems(u); }} disabled={!editable} className="w-24" />
                    </TableCell>
                    {editable && <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {(isNew || editable) && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : isNew ? "Create Delivery" : "Save Changes"}</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryFormPage;
