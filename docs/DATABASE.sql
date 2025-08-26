-- Enable RLS
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Users Profile
CREATE TABLE public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  role text check (role in ('manager', 'salesperson')) default 'salesperson',
  phone text,
  commission_rate decimal(4,2) default 0.05,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Leads
CREATE TABLE public.leads (
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

-- Jobs (Measurement Sessions)
CREATE TABLE public.jobs (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references public.leads(id) on delete cascade not null,
  job_name text not null,
  measurement_type text check (measurement_type in ('field', 'drawings')) not null,
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

-- Individual Wall/Ceiling Measurements
CREATE TABLE public.measurements (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id) on delete cascade not null,
  room_name text not null,
  surface_type text check (surface_type in ('wall', 'ceiling')) not null,
  height decimal(8,2) not null,
  width decimal(8,2) not null,
  square_feet decimal(8,2) generated always as (height * width) stored,
  photo_url text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Communications Log
CREATE TABLE public.communications (
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

-- Commission Tracking
CREATE TABLE public.commissions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) not null,
  job_id uuid references public.jobs(id) not null,
  commission_type text check (commission_type in ('frontend', 'backend')) not null,
  amount decimal(10,2) not null,
  paid boolean default false,
  paid_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Daily Activity Tracking
CREATE TABLE public.activities (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) not null,
  lead_id uuid references public.leads(id),
  activity_type text check (activity_type in ('call_made', 'sms_sent', 'email_sent', 'measurement_taken', 'quote_sent', 'note_added')) not null,
  description text,
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);