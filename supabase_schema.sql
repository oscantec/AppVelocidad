-- ============================================
-- TrafficSpeed Analytics - Supabase Schema v2
-- Updated: Support for multiple waypoints
-- ============================================

-- Waypoints Table (Puntos reutilizables)
-- Stores all control points that can be shared across multiple routes
CREATE TABLE IF NOT EXISTS waypoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    tolerance DOUBLE PRECISION DEFAULT 50, -- meters for snapping
    point_type TEXT DEFAULT 'intermediate', -- 'start', 'intermediate', 'end', 'any'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Master Routes Table
-- Stores control segments (Route Patterns)
CREATE TABLE IF NOT EXISTS master_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    
    -- Start Point (FK to waypoints)
    start_waypoint_id UUID REFERENCES waypoints(id) ON DELETE SET NULL,
    
    -- End Point (FK to waypoints)  
    end_waypoint_id UUID REFERENCES waypoints(id) ON DELETE SET NULL,
    
    -- Route metadata
    theoretical_distance DOUBLE PRECISION NOT NULL, -- meters (total)
    direction TEXT, -- Norte-Sur, Sur-Norte, etc.
    road_type TEXT, -- Principal, Secundaria, Autopista
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Intermediate Waypoints Junction Table
-- Links master routes to their intermediate points (ordered)
CREATE TABLE IF NOT EXISTS route_waypoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_route_id UUID REFERENCES master_routes(id) ON DELETE CASCADE,
    waypoint_id UUID REFERENCES waypoints(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL, -- Position in the route (0 = first intermediate, 1 = second, etc.)
    segment_distance DOUBLE PRECISION, -- Distance from previous point to this one (meters)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(master_route_id, waypoint_id),
    UNIQUE(master_route_id, order_index)
);

-- Speed Results Table
-- Stores calculated speed results from tramification analysis
CREATE TABLE IF NOT EXISTS speed_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_route_id UUID REFERENCES master_routes(id) ON DELETE CASCADE,
    route_id TEXT, -- Reference to original GPX route
    
    -- Which segment was analyzed (start_waypoint to end_waypoint)
    from_waypoint_id UUID REFERENCES waypoints(id),
    to_waypoint_id UUID REFERENCES waypoints(id),
    
    -- Timing data
    entry_time TIMESTAMPTZ,
    exit_time TIMESTAMPTZ,
    travel_time_seconds DOUBLE PRECISION,
    
    -- Calculated values
    calculated_speed_kmh DOUBLE PRECISION,
    segment_distance DOUBLE PRECISION, -- Distance used for this calculation
    
    -- Classification
    vehicle_type TEXT,
    period TEXT, -- AM, PM
    direction TEXT,
    lane TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_waypoints_type ON waypoints(point_type);
CREATE INDEX IF NOT EXISTS idx_master_routes_created_at ON master_routes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_route_waypoints_route ON route_waypoints(master_route_id);
CREATE INDEX IF NOT EXISTS idx_route_waypoints_order ON route_waypoints(master_route_id, order_index);
CREATE INDEX IF NOT EXISTS idx_speed_results_master_route ON speed_results(master_route_id);
CREATE INDEX IF NOT EXISTS idx_speed_results_period ON speed_results(period);
CREATE INDEX IF NOT EXISTS idx_speed_results_vehicle_type ON speed_results(vehicle_type);

-- ============================================
-- MIGRATION: If you already have the old schema,
-- run this to migrate existing data:
-- ============================================
-- 
-- 1. First backup your data
-- 2. Drop old columns if they exist:
--    ALTER TABLE master_routes DROP COLUMN IF EXISTS hito_a_lat;
--    ALTER TABLE master_routes DROP COLUMN IF EXISTS hito_a_lng;
--    (etc for all old hito columns)
-- 
-- ============================================

-- ============================================
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Paste this entire script
-- 4. Click "Run" to create the tables
-- ============================================
