-- ==============================================================================
-- SRI GOKULAM VEG RESTAURANT — PRODUCTION POSTGRESQL / SUPABASE SCHEMA
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. DINING TABLES TABLE
CREATE TABLE IF NOT EXISTS public.dining_tables (
    id TEXT PRIMARY KEY,
    table_number TEXT NOT NULL UNIQUE,
    section TEXT NOT NULL DEFAULT 'GROUND_FLOOR',
    capacity INTEGER NOT NULL DEFAULT 4,
    shape TEXT NOT NULL DEFAULT 'SQUARE',
    status TEXT NOT NULL DEFAULT 'AVAILABLE',
    assigned_waiter TEXT,
    active_order_id TEXT,
    active_session_id TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL UNIQUE,
    order_number TEXT,
    table_number TEXT,
    tables JSONB DEFAULT '[]'::jsonb,
    order_type TEXT NOT NULL DEFAULT 'DINE_IN',
    guest_name TEXT NOT NULL,
    customer_name TEXT,
    guest_phone TEXT,
    guest_email TEXT,
    guest_count INTEGER DEFAULT 2,
    cooking_notes TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    cgst NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    sgst NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    station_routing JSONB,
    status TEXT NOT NULL DEFAULT 'otp_pending', -- 'otp_pending', 'cooking', 'plating', 'served', 'completed', 'PAID_SETTLED', 'cancelled'
    otp TEXT NOT NULL,
    verified_by TEXT,
    verified_at TIMESTAMPTZ,
    payment_status TEXT NOT NULL DEFAULT 'PENDING',
    payment_mode TEXT,
    bill_number TEXT,
    settled_bill_number TEXT,
    prep_time_minutes INTEGER DEFAULT 12,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    placed_at TEXT
);

-- 4. BILLS TABLE
CREATE TABLE IF NOT EXISTS public.bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_number TEXT NOT NULL UNIQUE,
    table_number TEXT NOT NULL,
    order_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    guest_name TEXT NOT NULL,
    guest_phone TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    cgst NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    sgst NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    service_charge NUMERIC(10, 2) DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) DEFAULT 0.00,
    round_off NUMERIC(10, 2) DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PAID'
    settlement_mode TEXT,
    transaction_id TEXT,
    thermal_slip TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    timestamp TEXT
);

-- 5. RESERVATIONS TABLE
CREATE TABLE IF NOT EXISTS public.reservations (
    id TEXT PRIMARY KEY,
    reservation_number TEXT NOT NULL UNIQUE,
    guest_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    party_size INTEGER NOT NULL DEFAULT 2,
    section TEXT NOT NULL DEFAULT 'AC_MAIN',
    date DATE NOT NULL,
    time_slot TEXT NOT NULL,
    special_requests TEXT,
    status TEXT NOT NULL DEFAULT 'CONFIRMED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    loyalty_points INTEGER DEFAULT 0,
    total_spent NUMERIC(10, 2) DEFAULT 0.00,
    total_orders INTEGER DEFAULT 0,
    otp_hash TEXT,
    otp_expires_at TIMESTAMPTZ,
    otp_last_requested_at TIMESTAMPTZ,
    dietary_preferences JSONB,
    saved_addresses JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CUSTOMER SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.customer_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token TEXT NOT NULL UNIQUE,
    customer_id TEXT REFERENCES public.customers(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    device TEXT,
    ip TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- 8. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_orders_table ON public.orders(table_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON public.orders(guest_phone);
CREATE INDEX IF NOT EXISTS idx_bills_table ON public.bills(table_number);
CREATE INDEX IF NOT EXISTS idx_bills_status ON public.bills(payment_status);
CREATE INDEX IF NOT EXISTS idx_reservations_phone ON public.reservations(phone);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_token ON public.customer_sessions(token);

-- 9. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.dining_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_sessions ENABLE ROW LEVEL SECURITY;

-- Read policies for dining tables and public menu
CREATE POLICY "Public dining tables read access" ON public.dining_tables FOR SELECT USING (true);
