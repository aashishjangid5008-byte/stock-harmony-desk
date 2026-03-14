import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

const MoveHistoryPage = () => {
  const { user } = useAuth();
  const [moves, setMoves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("move_history").select("*").eq("user_id", user.id).order("date", { ascending: false })
      .then(({ data }) => { setMoves(data || []); setLoading(false); });
  }, [user]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="animate-fade-in">
      <div className="erp-page-header">
        <h1 className="erp-page-title">Move History</h1>
      </div>

      <div className="erp-table-container">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {moves.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No movement history</TableCell></TableRow>
            ) : moves.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-mono text-sm">{m.reference}</TableCell>
                <TableCell>{new Date(m.date).toLocaleDateString()}</TableCell>
                <TableCell>{m.contact || "-"}</TableCell>
                <TableCell>{m.from_location || "-"}</TableCell>
                <TableCell>{m.to_location || "-"}</TableCell>
                <TableCell>{m.product_name}</TableCell>
                <TableCell>
                  <span className={
                    m.movement_type === "incoming" ? "movement-incoming font-medium" :
                    m.movement_type === "outgoing" ? "movement-outgoing font-medium" :
                    "movement-adjustment font-medium"
                  }>
                    {m.movement_type === "incoming" ? "+" : m.movement_type === "outgoing" ? "-" : "±"}
                    {Number(m.quantity)}
                  </span>
                </TableCell>
                <TableCell>{m.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default MoveHistoryPage;
