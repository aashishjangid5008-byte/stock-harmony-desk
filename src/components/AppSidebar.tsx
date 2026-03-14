import {
  LayoutDashboard,
  PackageOpen,
  Truck,
  ClipboardList,
  Boxes,
  History,
  Settings,
  Warehouse,
  MapPin,
  Package,
  ChevronDown,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import React from "react";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
];

const operationsItems = [
  { title: "Receipts", url: "/operations/receipts", icon: PackageOpen },
  { title: "Deliveries", url: "/operations/deliveries", icon: Truck },
  { title: "Adjustment", url: "/operations/adjustments", icon: ClipboardList },
];

const inventoryItems = [
  { title: "Stock", url: "/stock", icon: Boxes },
  { title: "Move History", url: "/move-history", icon: History },
];

const settingsItems = [
  { title: "Warehouses", url: "/settings/warehouses", icon: Warehouse },
  { title: "Locations", url: "/settings/locations", icon: MapPin },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path || currentPath.startsWith(path + "/");

  const SidebarSection = ({
    label,
    items,
    defaultOpen,
  }: {
    label: string;
    items: typeof mainItems;
    defaultOpen?: boolean;
  }) => {
    const hasActive = items.some((i) => isActive(i.url));

    return (
      <Collapsible defaultOpen={defaultOpen || hasActive}>
        <SidebarGroup>
          <CollapsibleTrigger className="w-full">
            <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:text-sidebar-accent-foreground">
              {!collapsed && <span>{label}</span>}
              {!collapsed && <ChevronDown className="h-3 w-3" />}
            </SidebarGroupLabel>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink
                        to={item.url}
                        end={item.url === "/dashboard"}
                        className="hover:bg-sidebar-accent/50"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <Package className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h2 className="text-sm font-bold text-sidebar-accent-foreground truncate">CoreInventory</h2>
              <p className="text-[10px] text-sidebar-foreground truncate">Warehouse Management</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="pt-2">
        <SidebarSection label="Main" items={mainItems} defaultOpen />
        <SidebarSection label="Operations" items={operationsItems} />
        <SidebarSection label="Inventory" items={inventoryItems} />
        <SidebarSection label="Settings" items={settingsItems} />
      </SidebarContent>
    </Sidebar>
  );
}
