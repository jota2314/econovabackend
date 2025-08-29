-- Complete Database Schema for Spray Foam CRM
-- Generated: 2025-08-28
-- This migration creates all tables, relationships, and policies

-- =====================================================
-- CORE USER MANAGEMENT
-- =====================================================

-- Enable RLS on auth.users
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Users Profile (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  role text check (role in ('manager', 'salesperson')) default 'salesperson',
  phone text,
  commission_rate decimal(4,2) default 0.05,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =====================================================
-- CUSTOMER RELATIONSHIP MANAGEMENT
-- =====================================================

-- Leads Table
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text,
  phone text not null,
  company text,
  address text,
  city text,
  state text check (state in ('MA', 'NH')),
  status text check (status in ('new', 'contacted', 'measurement_scheduled', 'measured', 'quoted', 'proposal_sent', 'closed_won', 'closed_lost')) default 'new',
  lead_source text check (lead_source in ('drive_by', 'permit', 'referral', 'website', 'csv_import', 'other')),
  assigned_to uuid references public.users(id),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =====================================================
-- JOBS AND MEASUREMENTS
-- =====================================================

-- Jobs Table (Measurement Sessions)
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references public.leads(id) on delete cascade not null,
  job_name text not null,
  measurement_type text check (measurement_type in ('field', 'drawings')) not null,
  service_type text check (service_type in ('insulation', 'hvac', 'plaster')) default 'insulation' not null,
  building_type text check (building_type in ('residential', 'commercial', 'industrial')) default 'residential' not null,
  project_type text check (project_type in ('new_construction', 'remodel')),
  total_square_feet decimal(10,2) default 0,
  structural_framing text check (structural_framing in ('2x4', '2x6', '2x8', '2x10', '2x12')),
  roof_rafters text check (roof_rafters in ('2x4', '2x6', '2x8', '2x10', '2x12')),
  scope_of_work text,
  quote_amount decimal(10,2),
  quote_sent_at timestamp with time zone,
  created_by uuid references public.users(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Legacy Measurements Table (for backward compatibility)
CREATE TABLE IF NOT EXISTS public.measurements (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id) on delete cascade not null,
  room_name text not null,
  floor_level text,
  area_type text check (area_type in ('exterior_walls', 'interior_walls', 'ceiling', 'gable', 'roof')),
  surface_type text check (surface_type in ('wall', 'ceiling')) not null,
  framing_size text check (framing_size in ('2x4', '2x6', '2x8', '2x10', '2x12')),
  height decimal(8,2) not null,
  width decimal(8,2) not null,
  square_feet decimal(8,2) generated always as (height * width) stored,
  insulation_type text check (insulation_type in ('closed_cell', 'open_cell', 'batt', 'blown_in')),
  r_value text,
  photo_url text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insulation Measurements Table
CREATE TABLE IF NOT EXISTS public.insulation_measurements (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id) on delete cascade not null,
  room_name text not null,
  floor_level text,
  area_type text check (area_type in ('exterior_walls', 'interior_walls', 'ceiling', 'gable', 'roof')),
  surface_type text check (surface_type in ('wall', 'ceiling')) not null,
  framing_size text check (framing_size in ('2x4', '2x6', '2x8', '2x10', '2x12')) not null,
  height decimal(8,2) not null,
  width decimal(8,2) not null,
  square_feet decimal(8,2) generated always as (height * width) stored,
  insulation_type text check (insulation_type in ('closed_cell', 'open_cell', 'batt', 'blown_in')),
  r_value text,
  photo_url text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- HVAC Measurements Table
CREATE TABLE IF NOT EXISTS public.hvac_measurements (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id) on delete cascade not null,
  room_name text not null,
  system_type text check (system_type in ('central_air', 'heat_pump', 'furnace')) not null,
  tonnage decimal(5,2) not null,
  seer_rating decimal(5,2),
  ductwork_linear_feet decimal(8,2) not null,
  return_vents_count integer not null,
  supply_vents_count integer not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Plaster Measurements Table
CREATE TABLE IF NOT EXISTS public.plaster_measurements (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id) on delete cascade not null,
  room_name text not null,
  wall_condition text check (wall_condition in ('good', 'fair', 'poor')) not null,
  ceiling_condition text check (ceiling_condition in ('good', 'fair', 'poor')) not null,
  wall_square_feet decimal(8,2) not null,
  ceiling_square_feet decimal(8,2) not null,
  prep_work_hours decimal(5,2) not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =====================================================
-- PRICING AND ESTIMATES
-- =====================================================

-- Pricing Catalog Table
CREATE TABLE IF NOT EXISTS public.pricing_catalog (
  id uuid default gen_random_uuid() primary key,
  service_type text check (service_type in ('insulation', 'hvac', 'plaster')) not null,
  item_name text not null,
  unit text not null,
  base_price decimal(10,2) not null,
  markup_percentage decimal(5,2) default 0,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Estimates Table
CREATE TABLE IF NOT EXISTS public.estimates (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id) on delete cascade not null,
  estimate_number text unique not null,
  status text check (status in ('draft', 'sent', 'approved', 'rejected')) default 'draft',
  subtotal decimal(10,2) not null,
  tax_rate decimal(5,4) default 0.0625,
  tax_amount decimal(10,2) generated always as (subtotal * tax_rate) stored,
  total decimal(10,2) generated always as (subtotal + (subtotal * tax_rate)) stored,
  valid_until date,
  notes text,
  sent_at timestamp with time zone,
  approved_at timestamp with time zone,
  created_by uuid references public.users(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Estimate Line Items Table
CREATE TABLE IF NOT EXISTS public.estimate_line_items (
  id uuid default gen_random_uuid() primary key,
  estimate_id uuid references public.estimates(id) on delete cascade not null,
  description text not null,
  quantity decimal(10,2) not null,
  unit text not null,
  unit_price decimal(10,2) not null,
  total decimal(10,2) generated always as (quantity * unit_price) stored,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =====================================================
-- COMMUNICATION AND ACTIVITY TRACKING
-- =====================================================

-- Communications Log
CREATE TABLE IF NOT EXISTS public.communications (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references public.leads(id) on delete cascade not null,
  user_id uuid references public.users(id) not null,
  type text check (type in ('call', 'sms', 'email')) not null,
  direction text check (direction in ('inbound', 'outbound')) not null,
  content text,
  status text,
  twilio_sid text,
  recording_url text,
  duration_seconds integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Daily Activity Tracking
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) not null,
  lead_id uuid references public.leads(id),
  activity_type text check (activity_type in ('call_made', 'sms_sent', 'email_sent', 'measurement_taken', 'quote_sent', 'note_added')) not null,
  description text,
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =====================================================
-- COMMISSION TRACKING
-- =====================================================

-- Commission Tracking
CREATE TABLE IF NOT EXISTS public.commissions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) not null,
  job_id uuid references public.jobs(id) not null,
  commission_type text check (commission_type in ('frontend', 'backend')) not null,
  amount decimal(10,2) not null,
  paid boolean default false,
  paid_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Leads indexes
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);

-- Jobs indexes
CREATE INDEX IF NOT EXISTS idx_jobs_lead_id ON public.jobs(lead_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON public.jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_jobs_project_type ON public.jobs(project_type);
CREATE INDEX IF NOT EXISTS idx_jobs_service_type ON public.jobs(service_type);
CREATE INDEX IF NOT EXISTS idx_jobs_building_type ON public.jobs(building_type);

-- Measurements indexes
CREATE INDEX IF NOT EXISTS idx_measurements_job_id ON public.measurements(job_id);
CREATE INDEX IF NOT EXISTS idx_measurements_floor_level ON public.measurements(floor_level);
CREATE INDEX IF NOT EXISTS idx_measurements_area_type ON public.measurements(area_type);

-- Service-specific measurement indexes
CREATE INDEX IF NOT EXISTS idx_insulation_measurements_job_id ON public.insulation_measurements(job_id);
CREATE INDEX IF NOT EXISTS idx_hvac_measurements_job_id ON public.hvac_measurements(job_id);
CREATE INDEX IF NOT EXISTS idx_plaster_measurements_job_id ON public.plaster_measurements(job_id);

-- Pricing catalog indexes
CREATE INDEX IF NOT EXISTS idx_pricing_catalog_service_type ON public.pricing_catalog(service_type);

-- Estimates indexes
CREATE INDEX IF NOT EXISTS idx_estimates_job_id ON public.estimates(job_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON public.estimates(status);

-- Communications indexes
CREATE INDEX IF NOT EXISTS idx_communications_lead_id ON public.communications(lead_id);
CREATE INDEX IF NOT EXISTS idx_communications_user_id ON public.communications(user_id);
CREATE INDEX IF NOT EXISTS idx_communications_created_at ON public.communications(created_at);

-- Activities indexes
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON public.activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at);

-- Commissions indexes
CREATE INDEX IF NOT EXISTS idx_commissions_user_id ON public.commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_job_id ON public.commissions(job_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insulation_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hvac_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plaster_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all users" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Leads policies
CREATE POLICY "Users can view all leads" ON public.leads
  FOR SELECT USING (true);

CREATE POLICY "Users can create leads" ON public.leads
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update leads" ON public.leads
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete leads" ON public.leads
  FOR DELETE USING (true);

-- Jobs policies
CREATE POLICY "Users can view all jobs" ON public.jobs
  FOR SELECT USING (true);

CREATE POLICY "Users can create jobs" ON public.jobs
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own jobs" ON public.jobs
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own jobs" ON public.jobs
  FOR DELETE USING (auth.uid() = created_by);

-- Measurements policies (legacy table)
CREATE POLICY "Users can view measurements" ON public.measurements
  FOR SELECT USING (true);

CREATE POLICY "Users can create measurements for their jobs" ON public.measurements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = measurements.job_id 
      AND jobs.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update measurements for their jobs" ON public.measurements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = measurements.job_id 
      AND jobs.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete measurements for their jobs" ON public.measurements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = measurements.job_id 
      AND jobs.created_by = auth.uid()
    )
  );

-- Insulation measurements policies
CREATE POLICY "Users can view insulation measurements" ON public.insulation_measurements
  FOR SELECT USING (true);

CREATE POLICY "Users can create insulation measurements for their jobs" ON public.insulation_measurements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = insulation_measurements.job_id 
      AND jobs.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update insulation measurements for their jobs" ON public.insulation_measurements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = insulation_measurements.job_id 
      AND jobs.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete insulation measurements for their jobs" ON public.insulation_measurements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = insulation_measurements.job_id 
      AND jobs.created_by = auth.uid()
    )
  );

-- HVAC measurements policies
CREATE POLICY "Users can view hvac measurements" ON public.hvac_measurements
  FOR SELECT USING (true);

CREATE POLICY "Users can create hvac measurements for their jobs" ON public.hvac_measurements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = hvac_measurements.job_id 
      AND jobs.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update hvac measurements for their jobs" ON public.hvac_measurements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = hvac_measurements.job_id 
      AND jobs.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete hvac measurements for their jobs" ON public.hvac_measurements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = hvac_measurements.job_id 
      AND jobs.created_by = auth.uid()
    )
  );

-- Plaster measurements policies
CREATE POLICY "Users can view plaster measurements" ON public.plaster_measurements
  FOR SELECT USING (true);

CREATE POLICY "Users can create plaster measurements for their jobs" ON public.plaster_measurements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = plaster_measurements.job_id 
      AND jobs.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update plaster measurements for their jobs" ON public.plaster_measurements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = plaster_measurements.job_id 
      AND jobs.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete plaster measurements for their jobs" ON public.plaster_measurements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = plaster_measurements.job_id 
      AND jobs.created_by = auth.uid()
    )
  );

-- Pricing catalog policies
CREATE POLICY "Users can view pricing catalog" ON public.pricing_catalog
  FOR SELECT USING (true);

CREATE POLICY "Managers can manage pricing catalog" ON public.pricing_catalog
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'manager'
    )
  );

-- Estimates policies
CREATE POLICY "Users can view estimates" ON public.estimates
  FOR SELECT USING (true);

CREATE POLICY "Users can create estimates" ON public.estimates
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own estimates" ON public.estimates
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own estimates" ON public.estimates
  FOR DELETE USING (auth.uid() = created_by);

-- Estimate line items policies
CREATE POLICY "Users can view estimate line items" ON public.estimate_line_items
  FOR SELECT USING (true);

CREATE POLICY "Users can manage line items for their estimates" ON public.estimate_line_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.estimates 
      WHERE estimates.id = estimate_line_items.estimate_id 
      AND estimates.created_by = auth.uid()
    )
  );

-- Communications policies
CREATE POLICY "Users can view communications" ON public.communications
  FOR SELECT USING (true);

CREATE POLICY "Users can create communications" ON public.communications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own communications" ON public.communications
  FOR UPDATE USING (auth.uid() = user_id);

-- Activities policies
CREATE POLICY "Users can view all activities" ON public.activities
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own activities" ON public.activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Commissions policies
CREATE POLICY "Users can view their own commissions" ON public.commissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all commissions" ON public.commissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'manager'
    )
  );

CREATE POLICY "Managers can manage commissions" ON public.commissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'manager'
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_measurements_updated_at BEFORE UPDATE ON public.measurements 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_insulation_measurements_updated_at BEFORE UPDATE ON public.insulation_measurements 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hvac_measurements_updated_at BEFORE UPDATE ON public.hvac_measurements 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plaster_measurements_updated_at BEFORE UPDATE ON public.plaster_measurements 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_catalog_updated_at BEFORE UPDATE ON public.pricing_catalog 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_estimates_updated_at BEFORE UPDATE ON public.estimates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA (Optional - Comment out in production)
-- =====================================================

-- Sample pricing catalog data
-- INSERT INTO public.pricing_catalog (service_type, item_name, unit, base_price, markup_percentage) VALUES
-- ('insulation', 'Closed Cell Spray Foam', 'sq ft', 1.25, 30),
-- ('insulation', 'Open Cell Spray Foam', 'sq ft', 0.75, 30),
-- ('insulation', 'Fiberglass Batt', 'sq ft', 0.50, 25),
-- ('insulation', 'Blown-In Cellulose', 'sq ft', 0.60, 25),
-- ('hvac', 'Central Air Installation', 'ton', 1500.00, 35),
-- ('hvac', 'Heat Pump Installation', 'ton', 1800.00, 35),
-- ('hvac', 'Furnace Installation', 'unit', 2500.00, 30),
-- ('hvac', 'Ductwork Installation', 'linear ft', 25.00, 25),
-- ('hvac', 'Return Vent Installation', 'unit', 150.00, 20),
-- ('hvac', 'Supply Vent Installation', 'unit', 125.00, 20),
-- ('plaster', 'Wall Repair - Good Condition', 'sq ft', 3.50, 40),
-- ('plaster', 'Wall Repair - Fair Condition', 'sq ft', 5.00, 40),
-- ('plaster', 'Wall Repair - Poor Condition', 'sq ft', 7.50, 40),
-- ('plaster', 'Ceiling Repair - Good Condition', 'sq ft', 4.00, 40),
-- ('plaster', 'Ceiling Repair - Fair Condition', 'sq ft', 6.00, 40),
-- ('plaster', 'Ceiling Repair - Poor Condition', 'sq ft', 9.00, 40),
-- ('plaster', 'Prep Work', 'hour', 75.00, 20);

-- =====================================================
-- MIGRATION COMPLETION
-- =====================================================

-- Add migration completion marker
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version text primary key,
  executed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

INSERT INTO public.schema_migrations (version) VALUES ('20250828132934_complete_schema')
ON CONFLICT (version) DO NOTHING;