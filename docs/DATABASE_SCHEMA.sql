-- Baraa Raed Car Showroom Management System
-- PostgreSQL baseline schema. Use UUID primary keys and append-only audit tables for enterprise traceability.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE car_status AS ENUM ('available', 'reserved', 'sold', 'maintenance', 'not_ready', 'archived');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'interested', 'not_interested', 'converted');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
CREATE TYPE sync_state AS ENUM ('pending', 'synced', 'failed', 'conflict');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  description text NOT NULL
);

CREATE TABLE role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  address text NOT NULL,
  phone text,
  manager_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles(id),
  branch_id uuid REFERENCES branches(id),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  refresh_token_hash text,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES users(id),
  branch_id uuid REFERENCES branches(id),
  name text NOT NULL,
  role_title text NOT NULL,
  salary numeric(14,2) NOT NULL DEFAULT 0,
  commission_rate numeric(5,2) NOT NULL DEFAULT 0,
  hired_at date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES branches(id),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  address text,
  id_number text,
  id_image_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  address text,
  balance numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES branches(id),
  supplier_id uuid REFERENCES suppliers(id),
  internal_vehicle_number text UNIQUE NOT NULL,
  vin text UNIQUE NOT NULL,
  plate_number text,
  manufacturer text NOT NULL,
  model text NOT NULL,
  trim text,
  production_year int NOT NULL CHECK (production_year BETWEEN 1950 AND 2100),
  exterior_color text,
  interior_color text,
  fuel_type text,
  transmission text,
  mileage int NOT NULL DEFAULT 0,
  purchase_price numeric(14,2) NOT NULL DEFAULT 0,
  sale_price numeric(14,2) NOT NULL DEFAULT 0,
  minimum_sale_price numeric(14,2) NOT NULL DEFAULT 0,
  maintenance_cost numeric(14,2) NOT NULL DEFAULT 0,
  transportation_cost numeric(14,2) NOT NULL DEFAULT 0,
  status car_status NOT NULL DEFAULT 'available',
  qr_code text,
  barcode text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE car_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  alt_text text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE car_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_url text NOT NULL,
  expires_at date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id),
  car_id uuid UNIQUE REFERENCES cars(id),
  purchase_date date NOT NULL,
  purchase_price numeric(14,2) NOT NULL,
  transport_cost numeric(14,2) NOT NULL DEFAULT 0,
  document_url text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id),
  car_id uuid UNIQUE NOT NULL REFERENCES cars(id),
  employee_id uuid REFERENCES employees(id),
  sale_date timestamptz NOT NULL DEFAULT now(),
  payment_type text NOT NULL CHECK (payment_type IN ('cash', 'bank_transfer', 'installment', 'mixed')),
  subtotal numeric(14,2) NOT NULL,
  discount numeric(14,2) NOT NULL DEFAULT 0,
  tax numeric(14,2) NOT NULL DEFAULT 0,
  fees numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL,
  commission numeric(14,2) NOT NULL DEFAULT 0,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(14,2) NOT NULL,
  total numeric(14,2) NOT NULL
);

CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id),
  customer_id uuid REFERENCES customers(id),
  invoice_number text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'issued',
  total numeric(14,2) NOT NULL,
  pdf_url text,
  issued_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric(14,2) NOT NULL
);

CREATE TABLE installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id),
  down_payment numeric(14,2) NOT NULL DEFAULT 0,
  remaining_balance numeric(14,2) NOT NULL,
  number_of_installments int NOT NULL CHECK (number_of_installments > 0),
  interest_rate numeric(5,2) NOT NULL DEFAULT 0,
  contract_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE installment_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_id uuid NOT NULL REFERENCES installments(id) ON DELETE CASCADE,
  due_date date NOT NULL,
  paid_at timestamptz,
  amount numeric(14,2) NOT NULL,
  paid_amount numeric(14,2) NOT NULL DEFAULT 0,
  status payment_status NOT NULL DEFAULT 'pending',
  receipt_url text
);

CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES branches(id),
  name text NOT NULL,
  account_type text NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  balance numeric(14,2) NOT NULL DEFAULT 0
);

CREATE TABLE revenues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES accounts(id),
  sale_id uuid REFERENCES sales(id),
  amount numeric(14,2) NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES accounts(id),
  branch_id uuid REFERENCES branches(id),
  category text NOT NULL,
  amount numeric(14,2) NOT NULL,
  description text,
  document_url text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id),
  car_id uuid NOT NULL REFERENCES cars(id),
  employee_id uuid REFERENCES employees(id),
  deposit numeric(14,2) NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  receipt_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE test_drives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id),
  car_id uuid NOT NULL REFERENCES cars(id),
  employee_id uuid REFERENCES employees(id),
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  notes text
);

CREATE TABLE maintenance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES cars(id),
  vendor_name text,
  description text NOT NULL,
  cost numeric(14,2) NOT NULL DEFAULT 0,
  started_at date,
  completed_at date,
  document_url text
);

CREATE TABLE insurance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid REFERENCES cars(id),
  customer_id uuid REFERENCES customers(id),
  provider text NOT NULL,
  policy_number text NOT NULL,
  starts_at date NOT NULL,
  expires_at date NOT NULL,
  document_url text
);

CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES branches(id),
  assigned_employee_id uuid REFERENCES employees(id),
  car_id uuid REFERENCES cars(id),
  name text NOT NULL,
  phone text NOT NULL,
  source text NOT NULL,
  status lead_status NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lead_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id),
  due_at timestamptz NOT NULL,
  completed_at timestamptz,
  notes text
);

CREATE TABLE offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid REFERENCES cars(id),
  title text NOT NULL,
  discount_amount numeric(14,2) NOT NULL DEFAULT 0,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id),
  requested_by uuid REFERENCES users(id),
  amount numeric(14,2) NOT NULL,
  reason text NOT NULL,
  approval_request_id uuid
);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  title text NOT NULL,
  body text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  lead_id uuid REFERENCES leads(id),
  template_key text NOT NULL,
  destination_phone text NOT NULL,
  message_body text NOT NULL,
  sent_at timestamptz,
  delivery_status text
);

CREATE TABLE sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  operation text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  payload jsonb NOT NULL,
  status sync_state NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  synced_at timestamptz
);

CREATE TABLE sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  pending_count int NOT NULL DEFAULT 0,
  conflict_count int NOT NULL DEFAULT 0,
  status text NOT NULL
);

CREATE TABLE conflict_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_queue_id uuid REFERENCES sync_queue(id),
  entity_type text NOT NULL,
  entity_id uuid,
  local_payload jsonb NOT NULL,
  server_payload jsonb NOT NULL,
  resolution text,
  resolved_by uuid REFERENCES users(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  before_state jsonb,
  after_state jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  logo_url text,
  address text,
  phone text,
  email text,
  tax_number text,
  commercial_registration text,
  stamp_url text,
  manager_signature_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE invoice_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_html text NOT NULL,
  is_default boolean NOT NULL DEFAULT false
);

CREATE TABLE contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contract_type text NOT NULL,
  template_html text NOT NULL,
  is_default boolean NOT NULL DEFAULT false
);

CREATE TABLE printed_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL,
  entity_id uuid,
  printed_by uuid REFERENCES users(id),
  printed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id),
  amount numeric(14,2) NOT NULL,
  payment_method text NOT NULL,
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE car_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE car_condition_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  inspector_id uuid REFERENCES employees(id),
  report jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  request_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  payload jsonb NOT NULL,
  status approval_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE invoice_revision_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  revised_by uuid REFERENCES users(id),
  previous_payload jsonb NOT NULL,
  revised_payload jsonb NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE daily_dashboard_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES branches(id),
  log_date date NOT NULL,
  metrics jsonb NOT NULL,
  UNIQUE (branch_id, log_date)
);

CREATE TABLE print_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  document_type text NOT NULL,
  entity_id uuid,
  printer_type text NOT NULL CHECK (printer_type IN ('a4', 'thermal', 'pdf')),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE print_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES branches(id),
  printer_type text NOT NULL,
  settings jsonb NOT NULL
);

CREATE TABLE export_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  export_type text NOT NULL,
  entity_type text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE device_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  device_id text NOT NULL,
  platform text NOT NULL,
  app_version text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);

CREATE TABLE pwa_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  device_id text NOT NULL,
  browser text,
  installed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE offline_cache_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  cache_name text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE button_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  button_key text NOT NULL,
  page_key text NOT NULL,
  result text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  device_id text,
  severity text NOT NULL,
  message text NOT NULL,
  stack_trace text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES users(id),
  storage_path text NOT NULL,
  checksum text NOT NULL,
  size_bytes bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cars_branch_status ON cars(branch_id, status);
CREATE INDEX idx_cars_vin ON cars(vin);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_leads_status_followup ON leads(status, created_at);
CREATE INDEX idx_installment_payments_due ON installment_payments(status, due_date);
CREATE INDEX idx_sync_queue_device_status ON sync_queue(device_id, status, created_at);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at);
