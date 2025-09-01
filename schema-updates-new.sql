-- Database Improvements Based on Analysis
-- Generated: 2025-09-01

-- =====================================================
-- 1. UPDATE USER ROLES TO MATCH APPLICATION
-- =====================================================

-- Add missing roles that the app uses
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role = ANY (ARRAY['manager'::text, 'salesperson'::text, 'admin'::text, 'lead_hunter'::text]));

-- =====================================================
-- 2. ADD JOB STATUS TRACKING 
-- =====================================================

-- Add job status field for better pipeline tracking
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS status text 
CHECK (status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'measuring'::text, 'completed'::text, 'on_hold'::text, 'cancelled'::text])) 
DEFAULT 'scheduled';

-- Add job priority for better scheduling
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS priority text 
CHECK (priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])) 
DEFAULT 'normal';

-- Add scheduled date for jobs
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS scheduled_date timestamp with time zone;

-- =====================================================
-- 3. IMPROVE ESTIMATE WORKFLOW
-- =====================================================

-- Add estimate revision tracking
ALTER TABLE public.estimates 
ADD COLUMN IF NOT EXISTS revision_number integer DEFAULT 1;

-- Add estimate sent tracking
ALTER TABLE public.estimates 
ADD COLUMN IF NOT EXISTS sent_at timestamp with time zone;

-- Add client feedback field
ALTER TABLE public.estimates 
ADD COLUMN IF NOT EXISTS client_feedback text;

-- =====================================================
-- 4. ADD LEAD SCORING AND TRACKING
-- =====================================================

-- Add lead score for prioritization
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS lead_score integer DEFAULT 0 
CHECK (lead_score >= 0 AND lead_score <= 100);

-- Add last contact tracking
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS last_contact_date timestamp with time zone;

-- Add next followup date
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS next_followup_date timestamp with time zone;

-- Add lead temperature (hot/warm/cold)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS temperature text 
CHECK (temperature = ANY (ARRAY['hot'::text, 'warm'::text, 'cold'::text])) 
DEFAULT 'warm';

-- =====================================================
-- 5. ADD MATERIAL COST TRACKING
-- =====================================================

-- Create material costs table for better job costing
CREATE TABLE IF NOT EXISTS public.material_costs (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id) on delete cascade not null,
  material_name text not null,
  quantity decimal(10,2) not null,
  unit text not null,
  unit_cost decimal(10,2) not null,
  total_cost decimal(10,2) generated always as (quantity * unit_cost) stored,
  supplier text,
  purchased_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =====================================================
-- 6. ADD PERFORMANCE TRACKING TABLES
-- =====================================================

-- Daily metrics aggregation table for faster analytics
CREATE TABLE IF NOT EXISTS public.daily_metrics (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  user_id uuid references public.users(id),
  leads_created integer default 0,
  calls_made integer default 0,
  appointments_scheduled integer default 0,
  estimates_sent integer default 0,
  jobs_completed integer default 0,
  revenue_generated decimal(10,2) default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  UNIQUE(date, user_id)
);

-- Lead pipeline conversion tracking
CREATE TABLE IF NOT EXISTS public.pipeline_metrics (
  id uuid default gen_random_uuid() primary key,
  month date not null, -- First day of month
  leads_new integer default 0,
  leads_contacted integer default 0,
  leads_scheduled integer default 0,
  leads_measured integer default 0,
  leads_quoted integer default 0,
  leads_won integer default 0,
  leads_lost integer default 0,
  total_revenue decimal(10,2) default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  UNIQUE(month)
);

-- =====================================================
-- 7. ADD BETTER INDEXING FOR ANALYTICS
-- =====================================================

-- Indexes for new fields
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON public.jobs(priority);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_date ON public.jobs(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_estimates_sent_at ON public.estimates(sent_at);
CREATE INDEX IF NOT EXISTS idx_estimates_revision ON public.estimates(revision_number);

CREATE INDEX IF NOT EXISTS idx_leads_score ON public.leads(lead_score);
CREATE INDEX IF NOT EXISTS idx_leads_temperature ON public.leads(temperature);
CREATE INDEX IF NOT EXISTS idx_leads_last_contact ON public.leads(last_contact_date);
CREATE INDEX IF NOT EXISTS idx_leads_next_followup ON public.leads(next_followup_date);

CREATE INDEX IF NOT EXISTS idx_material_costs_job_id ON public.material_costs(job_id);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date_user ON public.daily_metrics(date, user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_month ON public.pipeline_metrics(month);

-- =====================================================
-- 8. ADD RLS POLICIES FOR NEW TABLES
-- =====================================================

-- Material costs policies
ALTER TABLE public.material_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view material costs" ON public.material_costs
  FOR SELECT USING (true);

CREATE POLICY "Users can manage material costs for their jobs" ON public.material_costs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = material_costs.job_id 
      AND jobs.created_by = auth.uid()
    )
  );

-- Daily metrics policies  
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all metrics" ON public.daily_metrics
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own metrics" ON public.daily_metrics
  FOR ALL USING (auth.uid() = user_id);

-- Pipeline metrics policies
ALTER TABLE public.pipeline_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pipeline metrics" ON public.pipeline_metrics
  FOR SELECT USING (true);

CREATE POLICY "Managers can manage pipeline metrics" ON public.pipeline_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('manager', 'admin')
    )
  );

-- =====================================================
-- 9. ADD HELPFUL VIEWS FOR ANALYTICS
-- =====================================================

-- Lead pipeline view
CREATE OR REPLACE VIEW public.lead_pipeline_summary AS
SELECT 
  status,
  COUNT(*) as count,
  AVG(lead_score) as avg_score,
  COUNT(CASE WHEN temperature = 'hot' THEN 1 END) as hot_leads,
  COUNT(CASE WHEN last_contact_date > NOW() - INTERVAL '7 days' THEN 1 END) as recent_contact
FROM public.leads 
WHERE status NOT IN ('closed_won', 'closed_lost')
GROUP BY status;

-- Job performance view
CREATE OR REPLACE VIEW public.job_performance_summary AS
SELECT 
  j.service_type,
  j.building_type,
  COUNT(*) as total_jobs,
  AVG(e.subtotal) as avg_estimate_value,
  COUNT(CASE WHEN e.status = 'approved' THEN 1 END) as approved_count,
  SUM(CASE WHEN e.status = 'approved' THEN e.subtotal ELSE 0 END) as total_approved_value
FROM public.jobs j
LEFT JOIN public.estimates e ON e.job_id = j.id
GROUP BY j.service_type, j.building_type;

-- User performance view
CREATE OR REPLACE VIEW public.user_performance_summary AS
SELECT 
  u.full_name,
  u.role,
  COUNT(DISTINCT l.id) as leads_assigned,
  COUNT(DISTINCT j.id) as jobs_created,
  COUNT(DISTINCT e.id) as estimates_created,
  SUM(CASE WHEN e.status = 'approved' THEN e.subtotal ELSE 0 END) as total_sales,
  SUM(c.amount) as total_commissions
FROM public.users u
LEFT JOIN public.leads l ON l.assigned_to = u.id
LEFT JOIN public.jobs j ON j.created_by = u.id  
LEFT JOIN public.estimates e ON e.created_by = u.id
LEFT JOIN public.commissions c ON c.user_id = u.id
GROUP BY u.id, u.full_name, u.role;

-- Update triggers for new tables
CREATE TRIGGER update_material_costs_updated_at BEFORE UPDATE ON public.material_costs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
