-- ============================================
-- TrafficSpeed Analytics - Supabase Schema
-- Tables for Master Routes and Speed Results
-- ============================================

-- Master Routes Table
-- Stores control segments (Route Patterns) with entry/exit points
CREATE TABLE IF NOT EXISTS master_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    
    -- Hito A (Entry Point)
    hito_a_lat DOUBLE PRECISION NOT NULL,
    hito_a_lng DOUBLE PRECISION NOT NULL,
    hito_a_name TEXT,
    hito_a_tolerance DOUBLE PRECISION DEFAULT 50, -- meters
    
    -- Hito B (Exit Point)
    hito_b_lat DOUBLE PRECISION NOT NULL,
    hito_b_lng DOUBLE PRECISION NOT NULL,
    hito_b_name TEXT,
    hito_b_tolerance DOUBLE PRECISION DEFAULT 50, -- meters
    
    -- Route metadata
    theoretical_distance DOUBLE PRECISION NOT NULL, -- meters
    direction TEXT, -- Norte-Sur, Sur-Norte, etc.
    road_type TEXT, -- Principal, Secundaria, Autopista
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Speed Results Table
-- Stores calculated speed results from tramification analysis
CREATE TABLE IF NOT EXISTS speed_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_route_id UUID REFERENCES master_routes(id) ON DELETE CASCADE,
    route_id TEXT, -- Reference to original GPX route
    
    -- Timing data
    entry_time TIMESTAMPTZ,
    exit_time TIMESTAMPTZ,
    travel_time_seconds DOUBLE PRECISION,
    
    -- Calculated values
    calculated_speed_kmh DOUBLE PRECISION,
    
    -- Classification
    vehicle_type TEXT,
    period TEXT, -- AM, PM
    direction TEXT,
    lane TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (optional, adjust as needed)
-- ALTER TABLE master_routes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE speed_results ENABLE ROW LEVEL SECURITY;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_master_routes_created_at ON master_routes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_speed_results_master_route ON speed_results(master_route_id);
CREATE INDEX IF NOT EXISTS idx_speed_results_period ON speed_results(period);
CREATE INDEX IF NOT EXISTS idx_speed_results_vehicle_type ON speed_results(vehicle_type);

-- ============================================
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Paste this entire script
-- 4. Click "Run" to create the tables
-- ============================================
