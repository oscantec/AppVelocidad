import { supabase } from '../config/supabase';

/**
 * Get all master routes from Supabase
 */
export const getMasterRoutes = async () => {
    try {
        const { data, error } = await supabase
            .from('master_routes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching master routes:', error);
        return [];
    }
};

/**
 * Get a single master route by ID
 */
export const getMasterRouteById = async (id) => {
    try {
        const { data, error } = await supabase
            .from('master_routes')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching master route:', error);
        return null;
    }
};

/**
 * Save a new master route
 */
export const saveMasterRoute = async (routeData) => {
    try {
        const { data, error } = await supabase
            .from('master_routes')
            .insert([routeData])
            .select();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error saving master route:', error);
        return { success: false, error };
    }
};

/**
 * Update an existing master route
 */
export const updateMasterRoute = async (id, routeData) => {
    try {
        const { data, error } = await supabase
            .from('master_routes')
            .update(routeData)
            .eq('id', id)
            .select();

        if (error) throw error;
        return { success: true, data };
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
