import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronsUpDown } from "lucide-react";

interface ProductComboboxProps {
  value: string;
  onSelect: (productId: string, productName: string) => void;
}

export const ProductCombobox: React.FC<ProductComboboxProps> = ({ value, onSelect }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  useEffect(() => {
    if (!user) return;
    const fetchProducts = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name")
        .eq("user_id", user.id)
        .ilike("name", `%${search}%`)
        .limit(10);
      setProducts(data || []);
    };
    fetchProducts();
  }, [search, user]);

  const handleSelect = (product: { id: string; name: string }) => {
    onSelect(product.id, product.name);
    setSearch(product.name);
    setOpen(false);
  };

  const handleCreateNew = () => {
    // Pass empty product_id to signal new product creation
    onSelect("", search);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              onSelect("", e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Type product name..."
            className="pr-8"
          />
          <ChevronsUpDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-1" align="start">
        {products.length > 0 ? (
          <div className="space-y-0.5">
            {products.map((p) => (
              <div
                key={p.id}
                className="px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-accent"
                onClick={() => handleSelect(p)}
              >
                {p.name}
              </div>
            ))}
            {search && !products.find((p) => p.name.toLowerCase() === search.toLowerCase()) && (
              <div
                className="px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-accent text-primary font-medium border-t"
                onClick={handleCreateNew}
              >
                + Create "{search}"
              </div>
            )}
          </div>
        ) : search ? (
          <div
            className="px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-accent text-primary font-medium"
            onClick={handleCreateNew}
          >
            + Create "{search}"
          </div>
        ) : (
          <div className="px-3 py-2 text-sm text-muted-foreground">Type to search...</div>
        )}
      </PopoverContent>
    </Popover>
  );
};
