-- Analytics Enhancement Functions
-- Generated: 2025-09-01

-- =====================================================
-- STORED PROCEDURES FOR BETTER ANALYTICS PERFORMANCE
-- =====================================================

-- Function to update daily metrics (call nightly)
CREATE OR REPLACE FUNCTION update_daily_metrics(target_date date DEFAULT CURRENT_DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO public.daily_metrics (
    date,
    user_id,
    leads_created,
    calls_made,
    appointments_scheduled,
    estimates_sent,
    jobs_completed,
    revenue_generated
  )
  SELECT 
    target_date,
    u.id,
    COALESCE(leads.count, 0),
    COALESCE(calls.count, 0),
    COALESCE(appointments.count, 0),
    COALESCE(estimates.count, 0),
    COALESCE(jobs.count, 0),
    COALESCE(revenue.amount, 0)
  FROM public.users u
  LEFT JOIN (
    SELECT assigned_to as user_id, COUNT(*) as count
    FROM public.leads 
    WHERE DATE(created_at) = target_date
    GROUP BY assigned_to
  ) leads ON leads.user_id = u.id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as count
    FROM public.communications 
    WHERE type = 'call' AND DATE(created_at) = target_date
    GROUP BY user_id
  ) calls ON calls.user_id = u.id
  LEFT JOIN (
    SELECT l.assigned_to as user_id, COUNT(*) as count
    FROM public.leads l
    WHERE l.status = 'measurement_scheduled' AND DATE(l.updated_at) = target_date
    GROUP BY l.assigned_to
  ) appointments ON appointments.user_id = u.id
  LEFT JOIN (
    SELECT created_by as user_id, COUNT(*) as count
    FROM public.estimates 
    WHERE DATE(created_at) = target_date
    GROUP BY created_by
  ) estimates ON estimates.user_id = u.id
  LEFT JOIN (
    SELECT j.created_by as user_id, COUNT(*) as count
    FROM public.jobs j
    WHERE j.status = 'completed' AND DATE(j.updated_at) = target_date
    GROUP BY j.created_by
  ) jobs ON jobs.user_id = u.id
  LEFT JOIN (
    SELECT e.created_by as user_id, SUM(e.subtotal) as amount
    FROM public.estimates e
    WHERE e.status = 'approved' AND DATE(e.approved_at) = target_date
    GROUP BY e.created_by
  ) revenue ON revenue.user_id = u.id
  ON CONFLICT (date, user_id) 
  DO UPDATE SET
    leads_created = EXCLUDED.leads_created,
    calls_made = EXCLUDED.calls_made,
    appointments_scheduled = EXCLUDED.appointments_scheduled,
    estimates_sent = EXCLUDED.estimates_sent,
    jobs_completed = EXCLUDED.jobs_completed,
    revenue_generated = EXCLUDED.revenue_generated;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate lead scoring automatically
CREATE OR REPLACE FUNCTION calculate_lead_score(lead_id uuid)
RETURNS integer AS $$
DECLARE
  score integer := 0;
  lead_data record;
  days_since_contact integer;
  communication_count integer;
BEGIN
  -- Get lead data
  SELECT * INTO lead_data FROM public.leads WHERE id = lead_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Base scoring by lead source (higher quality sources get more points)
  CASE lead_data.lead_source
    WHEN 'referral' THEN score := score + 30;
    WHEN 'website' THEN score := score + 20;
    WHEN 'permit' THEN score := score + 25;
    WHEN 'drive_by' THEN score := score + 15;
    ELSE score := score + 10;
  END CASE;
  
  -- Status progression scoring
  CASE lead_data.status
    WHEN 'new' THEN score := score + 5;
    WHEN 'contacted' THEN score := score + 15;
    WHEN 'measurement_scheduled' THEN score := score + 30;
    WHEN 'measured' THEN score := score + 40;
    WHEN 'quoted' THEN score := score + 50;
    WHEN 'proposal_sent' THEN score := score + 60;
    WHEN 'closed_won' THEN score := score + 100;
    WHEN 'closed_lost' THEN score := score - 50;
  END CASE;
  
  -- Communication frequency scoring
  SELECT COUNT(*) INTO communication_count
  FROM public.communications 
  WHERE lead_id = lead_data.id;
  
  score := score + LEAST(communication_count * 5, 25); -- Max 25 points for communications
  
  -- Recency scoring (penalize old leads without contact)
  IF lead_data.last_contact_date IS NOT NULL THEN
    days_since_contact := EXTRACT(days FROM NOW() - lead_data.last_contact_date);
    IF days_since_contact <= 7 THEN
      score := score + 15;
    ELSIF days_since_contact <= 14 THEN
      score := score + 10;
    ELSIF days_since_contact <= 30 THEN
      score := score + 5;
    ELSE
      score := score - 10; -- Penalize very old leads
    END IF;
  END IF;
  
  -- Ensure score is between 0 and 100
  score := GREATEST(0, LEAST(100, score));
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Function to update lead temperature based on score and activity
CREATE OR REPLACE FUNCTION update_lead_temperature(lead_id uuid)
RETURNS text AS $$
DECLARE
  score integer;
  days_since_contact integer;
  temperature text;
  lead_data record;
BEGIN
  SELECT * INTO lead_data FROM public.leads WHERE id = lead_id;
  score := calculate_lead_score(lead_id);
  
  -- Calculate days since last contact
  IF lead_data.last_contact_date IS NOT NULL THEN
    days_since_contact := EXTRACT(days FROM NOW() - lead_data.last_contact_date);
  ELSE
    days_since_contact := 999; -- Very high number for no contact
  END IF;
  
  -- Determine temperature
  IF score >= 70 AND days_since_contact <= 7 THEN
    temperature := 'hot';
  ELSIF score >= 50 AND days_since_contact <= 14 THEN
    temperature := 'warm';
  ELSE
    temperature := 'cold';
  END IF;
  
  -- Update the lead
  UPDATE public.leads 
  SET 
    lead_score = score,
    temperature = temperature
  WHERE id = lead_id;
  
  RETURN temperature;
END;
$$ LANGUAGE plpgsql;

-- Function to get conversion rate by source
CREATE OR REPLACE FUNCTION get_conversion_rates()
RETURNS TABLE (
  lead_source text,
  total_leads bigint,
  won_leads bigint,
  conversion_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.lead_source,
    COUNT(*) as total_leads,
    COUNT(CASE WHEN l.status = 'closed_won' THEN 1 END) as won_leads,
    ROUND(
      COUNT(CASE WHEN l.status = 'closed_won' THEN 1 END)::numeric / 
      NULLIF(COUNT(*)::numeric, 0) * 100, 2
    ) as conversion_rate
  FROM public.leads l
  WHERE l.lead_source IS NOT NULL
  GROUP BY l.lead_source
  ORDER BY conversion_rate DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get monthly revenue trends
CREATE OR REPLACE FUNCTION get_monthly_revenue_trend(months_back integer DEFAULT 12)
RETURNS TABLE (
  month date,
  total_estimates bigint,
  approved_estimates bigint,
  total_revenue numeric,
  avg_deal_size numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('month', e.created_at)::date as month,
    COUNT(*) as total_estimates,
    COUNT(CASE WHEN e.status = 'approved' THEN 1 END) as approved_estimates,
    SUM(CASE WHEN e.status = 'approved' THEN e.subtotal ELSE 0 END) as total_revenue,
    AVG(CASE WHEN e.status = 'approved' THEN e.subtotal END) as avg_deal_size
  FROM public.estimates e
  WHERE e.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month' * months_back)
  GROUP BY DATE_TRUNC('month', e.created_at)
  ORDER BY month DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get user performance leaderboard
CREATE OR REPLACE FUNCTION get_performance_leaderboard(
  period text DEFAULT 'month',
  metric text DEFAULT 'revenue'
)
RETURNS TABLE (
  user_name text,
  user_role text,
  metric_value numeric,
  rank integer
) AS $$
DECLARE
  date_filter timestamp;
BEGIN
  -- Set date filter based on period
  CASE period
    WHEN 'week' THEN date_filter := CURRENT_DATE - INTERVAL '7 days';
    WHEN 'month' THEN date_filter := CURRENT_DATE - INTERVAL '30 days';
    WHEN 'quarter' THEN date_filter := CURRENT_DATE - INTERVAL '90 days';
    ELSE date_filter := CURRENT_DATE - INTERVAL '30 days';
  END CASE;
  
  -- Return results based on metric
  IF metric = 'revenue' THEN
    RETURN QUERY
    SELECT 
      u.full_name as user_name,
      u.role as user_role,
      COALESCE(SUM(e.subtotal), 0) as metric_value,
      RANK() OVER (ORDER BY COALESCE(SUM(e.subtotal), 0) DESC) as rank
    FROM public.users u
    LEFT JOIN public.estimates e ON e.created_by = u.id 
      AND e.status = 'approved' 
      AND e.approved_at >= date_filter
    GROUP BY u.id, u.full_name, u.role
    ORDER BY metric_value DESC;
  ELSIF metric = 'leads' THEN
    RETURN QUERY
    SELECT 
      u.full_name as user_name,
      u.role as user_role,
      COALESCE(COUNT(l.id), 0)::numeric as metric_value,
      RANK() OVER (ORDER BY COALESCE(COUNT(l.id), 0) DESC) as rank
    FROM public.users u
    LEFT JOIN public.leads l ON l.assigned_to = u.id 
      AND l.created_at >= date_filter
    GROUP BY u.id, u.full_name, u.role
    ORDER BY metric_value DESC;
  END IF;
END;
$$ LANGUAGE plpgsql;
