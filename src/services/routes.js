import { supabase } from '../config/supabase';

export const saveRouteToSupabase = async (routeData, gpxContent) => {
    try {
        const routeId = Date.now().toString();
        const fileName = `route_${routeId}.gpx`;

        // Upload GPX to storage
        const { error: uploadError } = await supabase.storage
            .from('gpx-files')
            .upload(fileName, new Blob([gpxContent], { type: 'application/gpx+xml' }), {
                contentType: 'application/gpx+xml',
                cacheControl: '3600'
            });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('gpx-files')
            .getPublicUrl(fileName);

        // Save metadata to database
        const routeRecord = {
            id: routeId,
            name: routeData.name,
            date: new Date().toISOString(),
            duration: routeData.duration,
            distance: parseFloat(routeData.distance),
            avg_speed: parseFloat(routeData.avgSpeed),
            max_speed: routeData.maxSpeed,
            points: routeData.pointsCount,
            gpx_url: urlData.publicUrl,
            vehicle_type: routeData.vehicleType || 'Público'
        };

        const { data: dbData, error: dbError } = await supabase
            .from('routes')
            .insert([routeRecord])
            .select();

        if (dbError) throw dbError;

        return { success: true, routeId, data: dbData };
    } catch (error) {
        console.error('Error saving route:', error);
        return { success: false, error };
    }
};

export const getRoutesFromSupabase = async () => {
    try {
        const { data, error } = await supabase
            .from('routes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching routes:', error);
        return [];
    }
};

export const getRouteGPX = async (gpxUrl) => {
    try {
        const response = await fetch(gpxUrl);
        return await response.text();
    } catch (error) {
        console.error('Error fetching GPX:', error);
        return null;
    }
};
