-- DBMS Lab Requirements: Roles, Views, Triggers

-- 1. Create a Users table with a Role column (RBAC Requirement)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR NOT NULL,
    role VARCHAR(50) DEFAULT 'User' CHECK (role IN ('Admin', 'User', 'Faculty', 'Student')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);

-- 2. Create a SQL View joining books and reviews (View Requirement)
CREATE OR REPLACE VIEW public.book_details_view AS
SELECT 
    b.id as book_id,
    b.title,
    COALESCE(AVG(r.rating), 0) as average_rating,
    COUNT(r.id) as review_count
FROM public.books b
LEFT JOIN public.reviews r ON b.id = r.book_id
GROUP BY b.id, b.title;

-- 3. Create a Trigger to auto-update 'updated_at' on users (Trigger Requirement)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_modtime ON public.users;
CREATE TRIGGER update_users_modtime
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
