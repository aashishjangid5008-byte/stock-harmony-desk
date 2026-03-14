
-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  login_id TEXT NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, login_id, email, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'login_id', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'login_id', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Warehouses table
CREATE TABLE public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_code TEXT NOT NULL UNIQUE,
  address TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own warehouses" ON public.warehouses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own warehouses" ON public.warehouses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own warehouses" ON public.warehouses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own warehouses" ON public.warehouses FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Locations table
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_code TEXT NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own locations" ON public.locations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own locations" ON public.locations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own locations" ON public.locations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own locations" ON public.locations FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT,
  per_unit_cost NUMERIC(12,2) DEFAULT 0,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own products" ON public.products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own products" ON public.products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own products" ON public.products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own products" ON public.products FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stocks table
CREATE TABLE public.stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  on_hand NUMERIC(12,2) NOT NULL DEFAULT 0,
  free_to_use NUMERIC(12,2) NOT NULL DEFAULT 0,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id)
);
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own stocks" ON public.stocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stocks" ON public.stocks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own stocks" ON public.stocks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own stocks" ON public.stocks FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_stocks_updated_at BEFORE UPDATE ON public.stocks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Receipts table
CREATE TABLE public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL,
  receive_from TEXT,
  responsible TEXT,
  contact TEXT,
  schedule_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'done', 'cancelled')),
  warehouse_code TEXT DEFAULT 'WH',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own receipts" ON public.receipts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own receipts" ON public.receipts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own receipts" ON public.receipts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own receipts" ON public.receipts FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_receipts_updated_at BEFORE UPDATE ON public.receipts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Receipt items table
CREATE TABLE public.receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view receipt items via receipts" ON public.receipt_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.receipts WHERE receipts.id = receipt_items.receipt_id AND receipts.user_id = auth.uid())
);
CREATE POLICY "Users can insert receipt items via receipts" ON public.receipt_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.receipts WHERE receipts.id = receipt_items.receipt_id AND receipts.user_id = auth.uid())
);
CREATE POLICY "Users can update receipt items via receipts" ON public.receipt_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.receipts WHERE receipts.id = receipt_items.receipt_id AND receipts.user_id = auth.uid())
);
CREATE POLICY "Users can delete receipt items via receipts" ON public.receipt_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.receipts WHERE receipts.id = receipt_items.receipt_id AND receipts.user_id = auth.uid())
);

-- Deliveries table
CREATE TABLE public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL,
  deliver_to TEXT,
  responsible TEXT,
  contact TEXT,
  schedule_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'done', 'cancelled')),
  warehouse_code TEXT DEFAULT 'WH',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own deliveries" ON public.deliveries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own deliveries" ON public.deliveries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own deliveries" ON public.deliveries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own deliveries" ON public.deliveries FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Delivery items table
CREATE TABLE public.delivery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view delivery items via deliveries" ON public.delivery_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.deliveries WHERE deliveries.id = delivery_items.delivery_id AND deliveries.user_id = auth.uid())
);
CREATE POLICY "Users can insert delivery items via deliveries" ON public.delivery_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.deliveries WHERE deliveries.id = delivery_items.delivery_id AND deliveries.user_id = auth.uid())
);
CREATE POLICY "Users can update delivery items via deliveries" ON public.delivery_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.deliveries WHERE deliveries.id = delivery_items.delivery_id AND deliveries.user_id = auth.uid())
);
CREATE POLICY "Users can delete delivery items via deliveries" ON public.delivery_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.deliveries WHERE deliveries.id = delivery_items.delivery_id AND deliveries.user_id = auth.uid())
);

-- Adjustments table
CREATE TABLE public.adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  system_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  physical_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  adjustment NUMERIC(12,2) NOT NULL DEFAULT 0,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'done')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own adjustments" ON public.adjustments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own adjustments" ON public.adjustments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own adjustments" ON public.adjustments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own adjustments" ON public.adjustments FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_adjustments_updated_at BEFORE UPDATE ON public.adjustments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Move history table
CREATE TABLE public.move_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  contact TEXT,
  from_location TEXT,
  to_location TEXT,
  product_name TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('incoming', 'outgoing', 'adjustment')),
  status TEXT NOT NULL DEFAULT 'done',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.move_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own move history" ON public.move_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own move history" ON public.move_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Sequences for references
CREATE SEQUENCE IF NOT EXISTS receipt_seq START 1;
CREATE SEQUENCE IF NOT EXISTS delivery_seq START 1;
CREATE SEQUENCE IF NOT EXISTS adjustment_seq START 1;
