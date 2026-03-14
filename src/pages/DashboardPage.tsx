import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PackageOpen, Truck, AlertTriangle, Clock, Loader2, Package2 } from "lucide-react";

const DashboardPage = () => {
  const { user } = useAuth();
  const [receiptStats, setReceiptStats] = useState({ toReceive: 0, late: 0, operations: 0 });
  const [deliveryStats, setDeliveryStats] = useState({ toDeliver: 0, late: 0, waiting: 0, operations: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const today = new Date().toISOString().split("T")[0];

      // Receipt stats
      const { data: receipts } = await supabase
        .from("receipts")
        .select("schedule_date, status")
        .eq("user_id", user.id)
        .in("status", ["draft", "ready"]);

      const rLate = receipts?.filter((r) => r.schedule_date && r.schedule_date < today).length || 0;
      const rOps = receipts?.filter((r) => r.schedule_date && r.schedule_date >= today).length || 0;
      setReceiptStats({ toReceive: receipts?.length || 0, late: rLate, operations: rOps });

      // Delivery stats
      const { data: deliveries } = await supabase
        .from("deliveries")
        .select("schedule_date, status")
        .eq("user_id", user.id)
        .in("status", ["draft", "ready"]);

      const dLate = deliveries?.filter((d) => d.schedule_date && d.schedule_date < today).length || 0;
      const dOps = deliveries?.filter((d) => d.schedule_date && d.schedule_date >= today).length || 0;
      setDeliveryStats({
        toDeliver: deliveries?.length || 0,
        late: dLate,
        waiting: 0, // Would need stock check logic
        operations: dOps,
      });

      setLoading(false);
    };
    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="erp-page-header">
        <h1 className="erp-page-title">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Receipt Statistics */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <PackageOpen className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg">Receipt Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <StatItem label="To Receive" value={receiptStats.toReceive} icon={<Package2 className="h-4 w-4" />} />
              <StatItem label="Late" value={receiptStats.late} icon={<AlertTriangle className="h-4 w-4" />} variant="destructive" />
              <StatItem label="Operations" value={receiptStats.operations} icon={<Clock className="h-4 w-4" />} variant="info" />
            </div>
          </CardContent>
        </Card>

        {/* Delivery Statistics */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg">Delivery Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatItem label="To Deliver" value={deliveryStats.toDeliver} icon={<Package2 className="h-4 w-4" />} />
              <StatItem label="Late" value={deliveryStats.late} icon={<AlertTriangle className="h-4 w-4" />} variant="destructive" />
              <StatItem label="Waiting" value={deliveryStats.waiting} icon={<Clock className="h-4 w-4" />} variant="warning" />
              <StatItem label="Operations" value={deliveryStats.operations} icon={<Clock className="h-4 w-4" />} variant="info" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const StatItem = ({
  label,
  value,
  icon,
  variant = "default",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  variant?: "default" | "destructive" | "warning" | "info";
}) => {
  const colorMap = {
    default: "text-foreground",
    destructive: "text-destructive",
    warning: "text-warning",
    info: "text-info",
  };
  return (
    <div className="erp-stat-card text-center">
      <div className={`flex justify-center mb-1 ${colorMap[variant]}`}>{icon}</div>
      <div className={`text-2xl font-bold ${colorMap[variant]}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
};

export default DashboardPage;
