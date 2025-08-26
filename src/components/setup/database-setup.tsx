"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Database, Copy, ExternalLink } from "lucide-react"

export function DatabaseSetup() {
  const sqlSchema = `-- Enable RLS
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

-- RLS Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Users can read all users
CREATE POLICY "Users can view all users" ON public.users
  FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Anyone can read leads (adjust as needed)
CREATE POLICY "Anyone can view leads" ON public.leads
  FOR SELECT USING (true);

-- Anyone can insert leads
CREATE POLICY "Anyone can insert leads" ON public.leads
  FOR INSERT WITH CHECK (true);

-- Anyone can update leads
CREATE POLICY "Anyone can update leads" ON public.leads
  FOR UPDATE USING (true);

-- Anyone can delete leads
CREATE POLICY "Anyone can delete leads" ON public.leads
  FOR DELETE USING (true);

-- Similar policies for jobs
CREATE POLICY "Anyone can view jobs" ON public.jobs
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert jobs" ON public.jobs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update jobs" ON public.jobs
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete jobs" ON public.jobs
  FOR DELETE USING (true);`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlSchema)
  }

  return (
    <Card className="p-8 max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <Database className="mx-auto h-16 w-16 text-orange-600 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Database Setup Required</h2>
        <p className="text-slate-600">
          The CRM requires database tables to be set up in your Supabase project first.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Steps to set up your database:</h3>
          <ol className="list-decimal list-inside space-y-2 text-slate-600">
            <li>Open your Supabase project dashboard</li>
            <li>Go to the SQL Editor</li>
            <li>Copy the SQL schema below and paste it into a new query</li>
            <li>Run the query to create all required tables and policies</li>
            <li>Refresh this page to start using the CRM</li>
          </ol>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-semibold text-slate-900">SQL Schema</h4>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={copyToClipboard}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy SQL
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                asChild
              >
                <a 
                  href="https://supabase.com/dashboard/project" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Supabase
                </a>
              </Button>
            </div>
          </div>
          
          <div className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96">
            <pre className="text-sm whitespace-pre-wrap">{sqlSchema}</pre>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">💡 Quick Setup Tip</h4>
          <p className="text-blue-800 text-sm">
            After running the SQL, you can immediately start adding leads and they&apos;ll appear on your dashboard. 
            The policies above allow full access for development - you may want to restrict them for production.
          </p>
        </div>
      </div>
    </Card>
  )
}