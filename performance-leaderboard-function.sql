-- Database function for optimized performance leaderboard
-- Run this in your Supabase SQL editor

CREATE OR REPLACE FUNCTION get_performance_leaderboard(start_date timestamptz)
RETURNS TABLE (
    user_id uuid,
    full_name text,
    calls_made bigint,
    leads_converted bigint,
    revenue_generated numeric
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH user_calls AS (
        SELECT 
            u.id as user_id,
            u.full_name,
            COUNT(c.id) as calls_made
        FROM users u
        LEFT JOIN communications c ON u.id = c.user_id 
            AND c.type = 'call' 
            AND c.direction = 'outbound' 
            AND c.created_at >= start_date
        WHERE u.role = 'salesperson'
        GROUP BY u.id, u.full_name
    ),
    user_leads AS (
        SELECT 
            u.id as user_id,
            COUNT(l.id) as leads_converted
        FROM users u
        LEFT JOIN leads l ON u.id = l.assigned_to 
            AND l.status = 'closed_won' 
            AND l.updated_at >= start_date
        WHERE u.role = 'salesperson'
        GROUP BY u.id
    ),
    user_revenue AS (
        SELECT 
            l.assigned_to as user_id,
            COALESCE(SUM(j.quote_amount), 0) as revenue_generated
        FROM jobs j
        INNER JOIN leads l ON j.lead_id = l.id
        WHERE l.assigned_to IS NOT NULL
            AND j.quote_amount IS NOT NULL
            AND j.updated_at >= start_date
        GROUP BY l.assigned_to
    )
    SELECT 
        uc.user_id,
        uc.full_name,
        uc.calls_made,
        COALESCE(ul.leads_converted, 0) as leads_converted,
        COALESCE(ur.revenue_generated, 0) as revenue_generated
    FROM user_calls uc
    LEFT JOIN user_leads ul ON uc.user_id = ul.user_id
    LEFT JOIN user_revenue ur ON uc.user_id = ur.user_id
    ORDER BY (uc.calls_made + (COALESCE(ul.leads_converted, 0) * 10) + (COALESCE(ur.revenue_generated, 0) / 1000)) DESC;
END;
$$;