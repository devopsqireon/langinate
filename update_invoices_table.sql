-- Complete SQL script to add all missing columns to invoices table
-- Run this in Supabase SQL Editor

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS job_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS paid_date DATE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_reference TEXT,
ADD COLUMN IF NOT EXISTS payment_notes TEXT,
ADD COLUMN IF NOT EXISTS payment_instructions TEXT,
ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add constraints
ALTER TABLE invoices
DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE invoices
ADD CONSTRAINT invoices_status_check
CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'));

ALTER TABLE invoices
DROP CONSTRAINT IF EXISTS invoices_currency_check;

ALTER TABLE invoices
ADD CONSTRAINT invoices_currency_check
CHECK (currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD'));

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(user_id, issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(user_id, invoice_number);

-- Create unique constraint for invoice numbers per user
DROP INDEX IF EXISTS idx_invoices_user_number;
CREATE UNIQUE INDEX idx_invoices_user_number ON invoices(user_id, invoice_number);

-- Create or replace function for updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
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
DROP TRIGGER IF EXISTS calculate_invoice_totals_trigger ON invoices;
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
  IF NEW.paid_date IS NOT NULL AND (OLD.paid_date IS NULL OR OLD.paid_date IS DISTINCT FROM NEW.paid_date) THEN
    NEW.status = 'paid';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update status
DROP TRIGGER IF EXISTS update_invoice_status_trigger ON invoices;
CREATE TRIGGER update_invoice_status_trigger
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_status();

-- Enable RLS if not already enabled
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can insert own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete own invoices" ON invoices;

-- Create RLS policies
CREATE POLICY "Users can view own invoices" ON invoices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices" ON invoices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices" ON invoices
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices" ON invoices
  FOR DELETE USING (auth.uid() = user_id);
