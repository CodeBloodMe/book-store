-- Migration: Add external_id and Global Catalog genre

-- 1. Add external_id to books
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS external_id VARCHAR;

-- Add a unique constraint so we don't import the same external book twice
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'books_external_id_key') THEN
        ALTER TABLE public.books ADD CONSTRAINT books_external_id_key UNIQUE (external_id);
    END IF;
END $$;

-- 2. Insert "Global" super_category
INSERT INTO public.super_categories (name, slug, icon, color)
VALUES ('Global', 'global', '🌍', '#94a3b8')
ON CONFLICT (slug) DO NOTHING;

-- 3. Insert "Global Catalog" genre linking to "Global" super_category
INSERT INTO public.genres (super_category_id, name, slug, description, icon, color, is_learning, is_fiction)
SELECT id, 'Global Catalog', 'global-catalog', 'A massive, dynamically fetched catalog containing almost every book available online.', '🌍', '#94a3b8', false, false
FROM public.super_categories
WHERE slug = 'global'
ON CONFLICT (slug) DO NOTHING;
