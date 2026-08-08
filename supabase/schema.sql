-- Supabase Cloud Database Schema for Pakistan Lead Scraper (Dreamstay & Globetrek)

CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT NOT NULL,
    whatsapp TEXT,
    email TEXT,
    website TEXT,
    address TEXT,
    city TEXT NOT NULL,
    country TEXT DEFAULT 'Pakistan',
    category TEXT,
    rating NUMERIC(3, 2),
    reviews_count INT,
    source TEXT NOT NULL,
    project_tag TEXT NOT NULL CHECK (project_tag IN ('Dreamstay', 'Globetrek', 'General')),
    outreach_status TEXT DEFAULT 'New',
    apify_run_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_contacted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    project_tag TEXT NOT NULL,
    category TEXT,
    target_city TEXT,
    status TEXT DEFAULT 'Pending',
    auto_outreach BOOLEAN DEFAULT TRUE,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    completed_date TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    message TEXT NOT NULL,
    server_response JSONB,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Allow public access policy for development
CREATE POLICY "Public Read/Write Leads" ON public.leads FOR ALL USING (true);
CREATE POLICY "Public Read/Write Tasks" ON public.tasks FOR ALL USING (true);
CREATE POLICY "Public Read/Write Logs" ON public.whatsapp_logs FOR ALL USING (true);
