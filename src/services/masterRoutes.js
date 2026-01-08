import { supabase } from '../config/supabase';

// ==========================================
// WAYPOINTS CRUD
// ==========================================

/**
 * Get all waypoints
 */
export const getWaypoints = async () => {
    try {
        const { data, error } = await supabase
            .from('waypoints')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching waypoints:', error);
        return [];
    }
};

/**
 * Get a single waypoint by ID
 */
export const getWaypointById = async (id) => {
    try {
        const { data, error } = await supabase
            .from('waypoints')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching waypoint:', error);
        return null;
    }
};

/**
 * Save a new waypoint
 */
export const saveWaypoint = async (waypointData) => {
    try {
        const { data, error } = await supabase
            .from('waypoints')
            .insert([waypointData])
            .select();

        if (error) throw error;
        return { success: true, data: data[0] };
    } catch (error) {
        console.error('Error saving waypoint:', error);
        return { success: false, error };
    }
};

/**
 * Update an existing waypoint
 */
export const updateWaypoint = async (id, waypointData) => {
    try {
        const { data, error } = await supabase
            .from('waypoints')
            .update({ ...waypointData, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select();

        if (error) throw error;
        return { success: true, data: data[0] };
    } catch (error) {
        console.error('Error updating waypoint:', error);
        return { success: false, error };
    }
};

/**
 * Delete a waypoint
 */
export const deleteWaypoint = async (id) => {
    try {
        const { error } = await supabase
            .from('waypoints')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting waypoint:', error);
        return { success: false, error };
    }
};

// ==========================================
// MASTER ROUTES CRUD
// ==========================================

/**
 * Get all master routes with their waypoints
 */
export const getMasterRoutes = async () => {
    try {
        // Get routes with start and end waypoints
        const { data: routes, error: routesError } = await supabase
            .from('master_routes')
            .select(`
                *,
                start_waypoint:waypoints!master_routes_start_waypoint_id_fkey(*),
                end_waypoint:waypoints!master_routes_end_waypoint_id_fkey(*)
            `)
            .order('created_at', { ascending: false });

        if (routesError) throw routesError;

        // Get intermediate waypoints for each route
        for (const route of routes || []) {
            const { data: intermediates, error: intError } = await supabase
                .from('route_waypoints')
                .select(`
                    *,
                    waypoint:waypoints(*)
                `)
                .eq('master_route_id', route.id)
                .order('order_index', { ascending: true });

            if (!intError) {
                route.intermediate_waypoints = intermediates || [];
            }
        }

        return routes || [];
    } catch (error) {
        console.error('Error fetching master routes:', error);
        return [];
    }
};

/**
 * Get a single master route by ID with all waypoints
 */
export const getMasterRouteById = async (id) => {
    try {
        const { data: route, error } = await supabase
            .from('master_routes')
            .select(`
                *,
                start_waypoint:waypoints!master_routes_start_waypoint_id_fkey(*),
                end_waypoint:waypoints!master_routes_end_waypoint_id_fkey(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        // Get intermediate waypoints
        const { data: intermediates } = await supabase
            .from('route_waypoints')
            .select(`
                *,
                waypoint:waypoints(*)
            `)
            .eq('master_route_id', id)
            .order('order_index', { ascending: true });

        route.intermediate_waypoints = intermediates || [];

        return route;
    } catch (error) {
        console.error('Error fetching master route:', error);
        return null;
    }
};

/**
 * Save a new master route with waypoints
 * @param {Object} routeData - Route metadata
 * @param {Object} startWaypoint - Start waypoint (existing ID or new data)
 * @param {Array} intermediateWaypoints - Array of intermediate waypoints
 * @param {Object} endWaypoint - End waypoint (existing ID or new data)
 */
export const saveMasterRoute = async (routeData, startWaypoint, intermediateWaypoints = [], endWaypoint) => {
    try {
        // 1. Handle start waypoint
        let startWaypointId = startWaypoint.id;
        if (!startWaypointId && startWaypoint.lat) {
            const result = await saveWaypoint({
                name: startWaypoint.name || 'Punto Inicial',
                lat: startWaypoint.lat,
                lng: startWaypoint.lng,
                tolerance: startWaypoint.tolerance || 50,
                point_type: 'start'
            });
            if (result.success) startWaypointId = result.data.id;
        }

        // 2. Handle end waypoint
        let endWaypointId = endWaypoint.id;
        if (!endWaypointId && endWaypoint.lat) {
            const result = await saveWaypoint({
                name: endWaypoint.name || 'Punto Final',
                lat: endWaypoint.lat,
                lng: endWaypoint.lng,
                tolerance: endWaypoint.tolerance || 50,
                point_type: 'end'
            });
            if (result.success) endWaypointId = result.data.id;
        }

        // 3. Create the master route
        const { data: routeResult, error: routeError } = await supabase
            .from('master_routes')
            .insert([{
                name: routeData.name,
                description: routeData.description,
                start_waypoint_id: startWaypointId,
                end_waypoint_id: endWaypointId,
                theoretical_distance: routeData.theoretical_distance,
                direction: routeData.direction,
                road_type: routeData.road_type
            }])
            .select();

        if (routeError) throw routeError;

        const newRouteId = routeResult[0].id;

        // 4. Handle intermediate waypoints
        for (let i = 0; i < intermediateWaypoints.length; i++) {
            const wp = intermediateWaypoints[i];
            let waypointId = wp.id;

            // Create new waypoint if needed
            if (!waypointId && wp.lat) {
                const result = await saveWaypoint({
                    name: wp.name || `Punto Intermedio ${i + 1}`,
                    lat: wp.lat,
                    lng: wp.lng,
                    tolerance: wp.tolerance || 50,
                    point_type: 'intermediate'
                });
                if (result.success) waypointId = result.data.id;
            }

            // Link to route
            if (waypointId) {
                await supabase
                    .from('route_waypoints')
                    .insert([{
                        master_route_id: newRouteId,
                        waypoint_id: waypointId,
                        order_index: i,
                        segment_distance: wp.segment_distance || null
                    }]);
            }
        }

        return { success: true, data: routeResult[0] };
    } catch (error) {
        console.error('Error saving master route:', error);
        return { success: false, error };
    }
};

/**
 * Update an existing master route with waypoints
 */
export const updateMasterRoute = async (id, routeData, startWaypoint, intermediateWaypoints = [], endWaypoint) => {
    try {
        // 1. Handle start waypoint
        let startWaypointId = startWaypoint.id;
        if (!startWaypointId && startWaypoint.lat) {
            const result = await saveWaypoint({
                name: startWaypoint.name || 'Punto Inicial',
                lat: startWaypoint.lat,
                lng: startWaypoint.lng,
                tolerance: startWaypoint.tolerance || 50,
                point_type: 'start'
            });
            if (result.success) startWaypointId = result.data.id;
        }

        // 2. Handle end waypoint
        let endWaypointId = endWaypoint.id;
        if (!endWaypointId && endWaypoint.lat) {
            const result = await saveWaypoint({
                name: endWaypoint.name || 'Punto Final',
                lat: endWaypoint.lat,
                lng: endWaypoint.lng,
                tolerance: endWaypoint.tolerance || 50,
                point_type: 'end'
            });
            if (result.success) endWaypointId = result.data.id;
        }

        // 3. Update the master route
        const { data: routeResult, error: routeError } = await supabase
            .from('master_routes')
            .update({
                name: routeData.name,
                description: routeData.description,
                start_waypoint_id: startWaypointId,
                end_waypoint_id: endWaypointId,
                theoretical_distance: routeData.theoretical_distance,
                direction: routeData.direction,
                road_type: routeData.road_type,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select();

        if (routeError) throw routeError;

        // 4. Remove old intermediate waypoints links
        await supabase
            .from('route_waypoints')
            .delete()
            .eq('master_route_id', id);

        // 5. Add new intermediate waypoints
        for (let i = 0; i < intermediateWaypoints.length; i++) {
            const wp = intermediateWaypoints[i];
            let waypointId = wp.id;

            // Create new waypoint if needed
            if (!waypointId && wp.lat) {
                const result = await saveWaypoint({
                    name: wp.name || `Punto Intermedio ${i + 1}`,
                    lat: wp.lat,
                    lng: wp.lng,
                    tolerance: wp.tolerance || 50,
                    point_type: 'intermediate'
                });
                if (result.success) waypointId = result.data.id;
            }

            // Link to route
            if (waypointId) {
                await supabase
                    .from('route_waypoints')
                    .insert([{
                        master_route_id: id,
                        waypoint_id: waypointId,
                        order_index: i,
                        segment_distance: wp.segment_distance || null
                    }]);
            }
        }

        return { success: true, data: routeResult[0] };
    } catch (error) {
        console.error('Error updating master route:', error);
        return { success: false, error };
    }
};

/**
 * Delete a master route
 */
export const deleteMasterRoute = async (id) => {
    try {
        // Route waypoints will be deleted automatically due to CASCADE
        const { error } = await supabase
            .from('master_routes')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting master route:', error);
        return { success: false, error };
    }
};
