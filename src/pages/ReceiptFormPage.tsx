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
import { generateReceiptPDF } from "@/lib/pdfGenerator";
import { ProductCombobox } from "@/components/ProductCombobox";

interface ReceiptItem {
  id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
}

const ReceiptFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const isNew = !id || id === "new";

  const [receiveFrom, setReceiveFrom] = useState("");
  const [responsible, setResponsible] = useState("");
  const [contact, setContact] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [status, setStatus] = useState("draft");
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setResponsible(profile.display_name || profile.login_id);
    }
  }, [profile]);

  useEffect(() => {
    if (!isNew && user) {
      fetchReceipt();
    }
  }, [id, user]);

  const fetchReceipt = async () => {
    setLoading(true);
    const { data: receipt } = await supabase
      .from("receipts")
      .select("*")
      .eq("id", id!)
      .single();

    if (receipt) {
      setReceiveFrom(receipt.receive_from || "");
      setResponsible(receipt.responsible || "");
      setContact(receipt.contact || "");
      setScheduleDate(receipt.schedule_date || "");
      setStatus(receipt.status);
      setReference(receipt.reference);

      const { data: receiptItems } = await supabase
        .from("receipt_items")
        .select("*")
        .eq("receipt_id", id!);

      setItems(
        receiptItems?.map((ri) => ({
          id: ri.id,
          product_id: ri.product_id,
          product_name: ri.product_name,
          quantity: Number(ri.quantity),
        })) || []
      );
    }
    setLoading(false);
  };

  const addItem = () => {
    setItems([...items, { product_id: "", product_name: "", quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ReceiptItem, value: string | number) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      if (isNew) {
        // Get next reference number
        const { data: countData } = await supabase
          .from("receipts")
          .select("id", { count: "exact" })
          .eq("user_id", user.id);

        const num = (countData?.length || 0) + 1;
        const ref = `WH/IN/${String(num).padStart(4, "0")}`;

        const { data: receipt, error } = await supabase
          .from("receipts")
          .insert({
            reference: ref,
            receive_from: receiveFrom,
            responsible,
            contact,
            schedule_date: scheduleDate || null,
            status: "draft",
            user_id: user.id,
          })
          .select()
          .single();

        if (error) throw error;

        // Insert items
        for (const item of items) {
          if (!item.product_name) continue;
          let productId = item.product_id;

          if (!productId) {
            // Create new product
            const { data: product } = await supabase
              .from("products")
              .insert({ name: item.product_name, user_id: user.id })
              .select()
              .single();
            productId = product!.id;
          }

          await supabase.from("receipt_items").insert({
            receipt_id: receipt!.id,
            product_id: productId,
            product_name: item.product_name,
            quantity: item.quantity,
          });
        }

        toast.success("Receipt created");
        navigate(`/operations/receipts/${receipt!.id}`);
      } else {
        await supabase
          .from("receipts")
          .update({
            receive_from: receiveFrom,
            responsible,
            contact,
            schedule_date: scheduleDate || null,
          })
          .eq("id", id!);

        // Delete existing items and re-insert
        await supabase.from("receipt_items").delete().eq("receipt_id", id!);

        for (const item of items) {
          if (!item.product_name) continue;
          let productId = item.product_id;

          if (!productId) {
            const { data: product } = await supabase
              .from("products")
              .insert({ name: item.product_name, user_id: user.id })
              .select()
              .single();
            productId = product!.id;
          }

          await supabase.from("receipt_items").insert({
            receipt_id: id!,
            product_id: productId,
            product_name: item.product_name,
            quantity: item.quantity,
          });
        }

        toast.success("Receipt updated");
        fetchReceipt();
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  const handleValidate = async () => {
    if (!user || !id) return;
    setSaving(true);

    try {
      const nextStatus = status === "draft" ? "ready" : "done";

      if (nextStatus === "done") {
        // Update stock for each item
        for (const item of items) {
          const { data: existingStock } = await supabase
            .from("stocks")
            .select("*")
            .eq("product_id", item.product_id)
            .eq("user_id", user.id)
            .single();

          if (existingStock) {
            await supabase
              .from("stocks")
              .update({
                on_hand: Number(existingStock.on_hand) + item.quantity,
                free_to_use: Number(existingStock.free_to_use) + item.quantity,
              })
              .eq("id", existingStock.id);
          } else {
            await supabase.from("stocks").insert({
              product_id: item.product_id,
              on_hand: item.quantity,
              free_to_use: item.quantity,
              user_id: user.id,
            });
          }

          // Record move history
          await supabase.from("move_history").insert({
            reference,
            contact: contact || receiveFrom,
            from_location: receiveFrom || "Supplier",
            to_location: "Warehouse",
            product_name: item.product_name,
            quantity: item.quantity,
            movement_type: "incoming",
            user_id: user.id,
          });
        }
      }

      await supabase.from("receipts").update({ status: nextStatus }).eq("id", id);
      setStatus(nextStatus);
      toast.success(`Receipt ${nextStatus === "ready" ? "marked as ready" : "validated"}`);
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  const handleCancel = async () => {
    if (!id) return;
    await supabase.from("receipts").update({ status: "cancelled" }).eq("id", id);
    setStatus("cancelled");
    toast.success("Receipt cancelled");
  };

  const handlePrint = () => {
    generateReceiptPDF({
      reference,
      receiveFrom,
      responsible,
      scheduleDate,
      items,
    });
  };

  if (loading) return <div className="flex justify-center py-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="animate-fade-in max-w-4xl">
      <div className="erp-page-header">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/operations/receipts")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="erp-page-title">{isNew ? "New Receipt" : reference}</h1>
          {!isNew && (
            <Badge className={`status-${status}`}>{status}</Badge>
          )}
        </div>
        {!isNew && status !== "cancelled" && status !== "done" && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button onClick={handleValidate} disabled={saving}>
              <CheckCircle className="mr-2 h-4 w-4" />
              {status === "draft" ? "Mark Ready" : "Validate"}
            </Button>
          </div>
        )}
      </div>

      <div className="erp-card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Receive From</Label>
            <Input value={receiveFrom} onChange={(e) => setReceiveFrom(e.target.value)} disabled={status === "done" || status === "cancelled"} />
          </div>
          <div className="space-y-2">
            <Label>Responsible</Label>
            <Input value={responsible} onChange={(e) => setResponsible(e.target.value)} disabled={status === "done" || status === "cancelled"} />
          </div>
          <div className="space-y-2">
            <Label>Contact</Label>
            <Input value={contact} onChange={(e) => setContact(e.target.value)} disabled={status === "done" || status === "cancelled"} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Schedule Date</Label>
            <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} disabled={status === "done" || status === "cancelled"} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base">Products</Label>
            {status !== "done" && status !== "cancelled" && (
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-1 h-3 w-3" /> Add Product
              </Button>
            )}
          </div>
          <div className="erp-table-container">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="w-32">Quantity</TableHead>
                  {status !== "done" && status !== "cancelled" && <TableHead className="w-16"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                      No products added
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {status === "done" || status === "cancelled" ? (
                          item.product_name
                        ) : (
                          <ProductCombobox
                            value={item.product_name}
                            onSelect={(productId, productName) => {
                              const updated = [...items];
                              updated[idx].product_id = productId;
                              updated[idx].product_name = productName;
                              setItems(updated);
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                          disabled={status === "done" || status === "cancelled"}
                          className="w-24"
                        />
                      </TableCell>
                      {status !== "done" && status !== "cancelled" && (
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {(isNew || (status !== "done" && status !== "cancelled")) && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : isNew ? "Create Receipt" : "Save Changes"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiptFormPage;
