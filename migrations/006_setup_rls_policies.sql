-- Additional RLS setup and helper functions

-- Create a function to check if a user owns a resource
CREATE OR REPLACE FUNCTION auth.user_owns_resource(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get the current user's profile
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS users AS $$
DECLARE
  user_profile users;
BEGIN
  SELECT * INTO user_profile FROM users WHERE id = auth.uid();
  RETURN user_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for RLS performance
CREATE INDEX idx_users_auth_uid ON users(id);
CREATE INDEX idx_clients_auth_uid ON clients(user_id);
CREATE INDEX idx_jobs_auth_uid ON jobs(user_id);
CREATE INDEX idx_invoices_auth_uid ON invoices(user_id);
CREATE INDEX idx_training_records_auth_uid ON training_records(user_id);

-- Create views for easier data access

-- Dashboard stats view
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
  u.id as user_id,
  (SELECT COUNT(*) FROM jobs j WHERE j.user_id = u.id AND j.status IN ('draft', 'in_progress', 'under_review')) as active_jobs,
  (SELECT COUNT(*) FROM clients c WHERE c.user_id = u.id) as total_clients,
  (SELECT COALESCE(SUM(i.total_amount), 0) FROM invoices i WHERE i.user_id = u.id AND i.issue_date >= date_trunc('month', CURRENT_DATE)) as monthly_revenue,
  (SELECT COUNT(*) FROM invoices i WHERE i.user_id = u.id AND i.status IN ('sent', 'viewed', 'overdue')) as pending_invoices
FROM users u;

-- Enable RLS on the view
ALTER VIEW dashboard_stats SET (security_invoker = true);

-- Recent jobs view
CREATE OR REPLACE VIEW recent_jobs AS
SELECT
  j.*,
  c.name as client_name,
  c.company_name as client_company
FROM jobs j
LEFT JOIN clients c ON j.client_id = c.id
WHERE j.user_id = auth.uid()
ORDER BY j.created_at DESC
LIMIT 10;

-- Enable RLS on the view
ALTER VIEW recent_jobs SET (security_invoker = true);

-- Upcoming deadlines view
CREATE OR REPLACE VIEW upcoming_deadlines AS
SELECT
  j.id,
  j.title,
  j.deadline,
  j.status,
  j.type,
  c.name as client_name
FROM jobs j
LEFT JOIN clients c ON j.client_id = c.id
WHERE j.user_id = auth.uid()
  AND j.deadline IS NOT NULL
  AND j.deadline > NOW()
  AND j.status NOT IN ('completed', 'cancelled')
ORDER BY j.deadline ASC
LIMIT 5;

-- Enable RLS on the view
ALTER VIEW upcoming_deadlines SET (security_invoker = true);

-- Overdue invoices view
CREATE OR REPLACE VIEW overdue_invoices AS
SELECT
  i.*,
  c.name as client_name,
  c.company_name as client_company,
  (CURRENT_DATE - i.due_date) as days_overdue
FROM invoices i
LEFT JOIN clients c ON i.client_id = c.id
WHERE i.user_id = auth.uid()
  AND i.status = 'overdue'
ORDER BY i.due_date ASC;

-- Enable RLS on the view
ALTER VIEW overdue_invoices SET (security_invoker = true);

-- Training expiring soon view
CREATE OR REPLACE VIEW training_expiring_soon AS
SELECT
  tr.*,
  (tr.expiry_date - CURRENT_DATE) as days_until_expiry
FROM training_records tr
WHERE tr.user_id = auth.uid()
  AND tr.status = 'completed'
  AND tr.expiry_date IS NOT NULL
  AND tr.expiry_date > CURRENT_DATE
  AND tr.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
ORDER BY tr.expiry_date ASC;

-- Enable RLS on the view
ALTER VIEW training_expiring_soon SET (security_invoker = true);

-- Grant appropriate permissions
GRANT ALL ON users TO authenticated;
GRANT ALL ON clients TO authenticated;
GRANT ALL ON jobs TO authenticated;
GRANT ALL ON invoices TO authenticated;
GRANT ALL ON training_records TO authenticated;

GRANT SELECT ON dashboard_stats TO authenticated;
GRANT SELECT ON recent_jobs TO authenticated;
GRANT SELECT ON upcoming_deadlines TO authenticated;
GRANT SELECT ON overdue_invoices TO authenticated;
GRANT SELECT ON training_expiring_soon TO authenticated;