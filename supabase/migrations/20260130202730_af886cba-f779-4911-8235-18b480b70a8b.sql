-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'editor');

-- Create enum for stock movement types
CREATE TYPE public.stock_movement_type AS ENUM ('entrada', 'saida', 'ajuste');

-- ========================
-- USER ROLES TABLE
-- ========================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ========================
-- PROFILES TABLE (for user display info)
-- ========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ========================
-- CATEGORIES TABLE
-- ========================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- ========================
-- PRODUCTS TABLE
-- ========================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  brand TEXT,
  model TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  promotional_price DECIMAL(10, 2),
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  aro TEXT,
  material_quadro TEXT,
  marchas TEXT,
  suspensao TEXT,
  tamanho_quadro TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ========================
-- PRODUCT IMAGES TABLE
-- ========================
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- ========================
-- STOCK MOVEMENTS TABLE
-- ========================
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  movement_type stock_movement_type NOT NULL,
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- ========================
-- BANNERS TABLE
-- ========================
CREATE TABLE public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_main BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- ========================
-- STORE SETTINGS TABLE
-- ========================
CREATE TABLE public.store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name TEXT NOT NULL DEFAULT 'Daniel Bike Shop',
  logo_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  whatsapp TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  working_hours TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  currency TEXT NOT NULL DEFAULT 'BRL',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- ========================
-- SECURITY DEFINER FUNCTIONS
-- ========================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Check if user is editor
CREATE OR REPLACE FUNCTION public.is_editor(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'editor')
$$;

-- Check if user has admin or editor role
CREATE OR REPLACE FUNCTION public.has_admin_or_editor_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'editor')
  )
$$;

-- ========================
-- RLS POLICIES
-- ========================

-- USER ROLES POLICIES
CREATE POLICY "Admins and editors can view roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_admin_or_editor_role(auth.uid()));

CREATE POLICY "Only admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- PROFILES POLICIES
CREATE POLICY "Admins and editors can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_admin_or_editor_role(auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- CATEGORIES POLICIES
CREATE POLICY "Anyone can view active categories"
  ON public.categories FOR SELECT
  USING (is_active = true OR public.has_admin_or_editor_role(auth.uid()));

CREATE POLICY "Admins and editors can insert categories"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (public.has_admin_or_editor_role(auth.uid()));

CREATE POLICY "Admins and editors can update categories"
  ON public.categories FOR UPDATE
  TO authenticated
  USING (public.has_admin_or_editor_role(auth.uid()));

CREATE POLICY "Admins and editors can delete categories"
  ON public.categories FOR DELETE
  TO authenticated
  USING (public.has_admin_or_editor_role(auth.uid()));

-- PRODUCTS POLICIES
CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT
  USING (is_active = true OR public.has_admin_or_editor_role(auth.uid()));

CREATE POLICY "Admins and editors can insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.has_admin_or_editor_role(auth.uid()));

CREATE POLICY "Admins and editors can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.has_admin_or_editor_role(auth.uid()));

CREATE POLICY "Admins and editors can delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.has_admin_or_editor_role(auth.uid()));

-- PRODUCT IMAGES POLICIES
CREATE POLICY "Anyone can view product images"
  ON public.product_images FOR SELECT
  USING (true);

CREATE POLICY "Admins and editors can insert product images"
  ON public.product_images FOR INSERT
  TO authenticated
  WITH CHECK (public.has_admin_or_editor_role(auth.uid()));

CREATE POLICY "Admins and editors can update product images"
  ON public.product_images FOR UPDATE
  TO authenticated
  USING (public.has_admin_or_editor_role(auth.uid()));

CREATE POLICY "Admins and editors can delete product images"
  ON public.product_images FOR DELETE
  TO authenticated
  USING (public.has_admin_or_editor_role(auth.uid()));

-- STOCK MOVEMENTS POLICIES
CREATE POLICY "Admins and editors can view stock movements"
  ON public.stock_movements FOR SELECT
  TO authenticated
  USING (public.has_admin_or_editor_role(auth.uid()));

CREATE POLICY "Admins and editors can insert stock movements"
  ON public.stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (public.has_admin_or_editor_role(auth.uid()));

-- BANNERS POLICIES
CREATE POLICY "Anyone can view active banners"
  ON public.banners FOR SELECT
  USING (is_active = true OR public.has_admin_or_editor_role(auth.uid()));

CREATE POLICY "Admins and editors can insert banners"
  ON public.banners FOR INSERT
  TO authenticated
  WITH CHECK (public.has_admin_or_editor_role(auth.uid()));

CREATE POLICY "Admins and editors can update banners"
  ON public.banners FOR UPDATE
  TO authenticated
  USING (public.has_admin_or_editor_role(auth.uid()));

CREATE POLICY "Admins and editors can delete banners"
  ON public.banners FOR DELETE
  TO authenticated
  USING (public.has_admin_or_editor_role(auth.uid()));

-- STORE SETTINGS POLICIES
CREATE POLICY "Anyone can view store settings"
  ON public.store_settings FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert store settings"
  ON public.store_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update store settings"
  ON public.store_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ========================
-- TRIGGERS
-- ========================

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_banners_updated_at
  BEFORE UPDATE ON public.banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update stock on movement
CREATE OR REPLACE FUNCTION public.handle_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
  -- Update product stock quantity
  UPDATE public.products
  SET stock_quantity = NEW.new_quantity
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_stock_movement_created
  AFTER INSERT ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.handle_stock_movement();

-- ========================
-- STORAGE BUCKETS
-- ========================
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('store-assets', 'store-assets', true);

-- Storage policies for product images
CREATE POLICY "Anyone can view product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Admins and editors can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.has_admin_or_editor_role(auth.uid()));

CREATE POLICY "Admins and editors can update product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images' AND public.has_admin_or_editor_role(auth.uid()));

CREATE POLICY "Admins and editors can delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images' AND public.has_admin_or_editor_role(auth.uid()));

-- Storage policies for banners
CREATE POLICY "Anyone can view banners"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'banners');

CREATE POLICY "Admins and editors can upload banners"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'banners' AND public.has_admin_or_editor_role(auth.uid()));

CREATE POLICY "Admins and editors can update banners storage"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'banners' AND public.has_admin_or_editor_role(auth.uid()));

CREATE POLICY "Admins and editors can delete banners storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'banners' AND public.has_admin_or_editor_role(auth.uid()));

-- Storage policies for store assets
CREATE POLICY "Anyone can view store assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'store-assets');

CREATE POLICY "Admins can upload store assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'store-assets' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update store assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'store-assets' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete store assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'store-assets' AND public.is_admin(auth.uid()));

-- ========================
-- DEFAULT DATA
-- ========================

-- Insert default categories
INSERT INTO public.categories (name, slug, description) VALUES
  ('Bicicletas', 'bicicletas', 'Bicicletas completas de diversos tipos'),
  ('Peças', 'pecas', 'Peças e componentes para bicicletas'),
  ('Acessórios', 'acessorios', 'Acessórios para ciclistas'),
  ('Equipamentos de Segurança', 'seguranca', 'Capacetes, luvas e proteções');

-- Insert default store settings
INSERT INTO public.store_settings (store_name, currency) VALUES
  ('Daniel Bike Shop', 'BRL');