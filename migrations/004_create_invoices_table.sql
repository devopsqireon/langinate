-- Create invoices table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,

  -- Invoice details
  title TEXT,
  description TEXT,

  -- Job references (array of job IDs)
  job_ids UUID[] DEFAULT '{}',

  -- Financial details
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,4) DEFAULT 0, -- e.g., 0.08 for 8% tax
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD')),

  -- Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  paid_date DATE,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled')),

  -- Payment details
  payment_method TEXT,
  payment_reference TEXT,
  payment_notes TEXT,

  -- Line items (JSON array for flexible invoice items)
  line_items JSONB DEFAULT '[]',

  -- Additional details
  notes TEXT,
  terms_and_conditions TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(user_id, status);
CREATE INDEX idx_invoices_due_date ON invoices(user_id, due_date);
CREATE INDEX idx_invoices_issue_date ON invoices(user_id, issue_date DESC);
CREATE INDEX idx_invoices_number ON invoices(user_id, invoice_number);

-- Create unique constraint for invoice numbers per user
CREATE UNIQUE INDEX idx_invoices_user_number ON invoices(user_id, invoice_number);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own invoices" ON invoices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices" ON invoices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices" ON invoices
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices" ON invoices
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate invoice totals
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate tax amount if tax rate is provided
  IF NEW.tax_rate IS NOT NULL AND NEW.tax_rate > 0 THEN
    NEW.tax_amount = NEW.subtotal * NEW.tax_rate;
  ELSE
    NEW.tax_amount = 0;
  END IF;

  -- Calculate total amount
  NEW.total_amount = NEW.subtotal + NEW.tax_amount;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate totals
CREATE TRIGGER calculate_invoice_totals_trigger
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION calculate_invoice_totals();

-- Create function to update invoice status based on dates
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark as overdue if past due date and not paid
  IF NEW.due_date < CURRENT_DATE AND NEW.status NOT IN ('paid', 'cancelled') THEN
    NEW.status = 'overdue';
  END IF;

  -- Mark as paid if paid_date is set
  IF NEW.paid_date IS NOT NULL AND OLD.paid_date IS NULL THEN
    NEW.status = 'paid';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update status
CREATE TRIGGER update_invoice_status_trigger
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_status();