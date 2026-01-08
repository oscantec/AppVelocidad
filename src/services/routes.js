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

        // Format route name as AAAAMMDDHHMMSS-(nombre de la Ruta)-Tipo Vehiculo
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;
        const vehicleType = routeData.vehicleType || 'Público';
        const formattedName = `${timestamp}-${routeData.name}-${vehicleType}`;

        // Save metadata to database
        const routeRecord = {
            id: routeId,
            name: formattedName,
            date: now.toISOString(),
            duration: routeData.duration,
            distance: parseFloat(routeData.distance),
            avg_speed: parseFloat(routeData.avgSpeed),
            max_speed: routeData.maxSpeed,
            points: routeData.pointsCount,
            gpx_url: urlData.publicUrl,
            vehicle_type: vehicleType
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
