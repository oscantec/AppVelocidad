/**
 * GPX Analysis Utilities
 * Tools for parsing GPX files and extracting segments between control points
 */

/**
 * Parse GPX XML content to an array of track points
 * @param {string} gpxContent - Raw GPX XML string
 * @returns {Array} Array of {lat, lng, time, elevation}
 */
export function parseGPXToPoints(gpxContent) {
    const points = [];

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(gpxContent, 'application/xml');

        // Get all track points
        const trkpts = doc.querySelectorAll('trkpt');

        trkpts.forEach((trkpt) => {
            const lat = parseFloat(trkpt.getAttribute('lat'));
            const lng = parseFloat(trkpt.getAttribute('lon'));
            const timeEl = trkpt.querySelector('time');
            const eleEl = trkpt.querySelector('ele');

            if (!isNaN(lat) && !isNaN(lng)) {
                points.push({
                    lat,
                    lng,
                    time: timeEl ? new Date(timeEl.textContent) : null,
                    elevation: eleEl ? parseFloat(eleEl.textContent) : null,
                });
            }
        });
    } catch (error) {
        console.error('Error parsing GPX:', error);
    }

    return points;
}

/**
 * Calculate the Haversine distance between two points (in meters)
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth's radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

    const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) *
        Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Find the closest point in a GPX track to a given hito (control point)
 * @param {Array} gpxPoints - Array of track points
 * @param {Object} hito - {lat, lng, tolerance} - The control point to find
 * @returns {Object|null} The closest point that falls within tolerance, or null
 */
export function findClosestPointToHito(gpxPoints, hito) {
    let closestPoint = null;
    let closestDistance = Infinity;
    let closestIndex = -1;

    for (let i = 0; i < gpxPoints.length; i++) {
        const point = gpxPoints[i];
        const distance = haversineDistance(point.lat, point.lng, hito.lat, hito.lng);

        if (distance < closestDistance) {
            closestDistance = distance;
            closestPoint = point;
            closestIndex = i;
        }
    }

    // Check if within tolerance
    if (closestDistance <= hito.tolerance) {
        return {
            point: closestPoint,
            distance: closestDistance,
            index: closestIndex,
        };
    }

    return null;
}

/**
 * Extract the segment of a GPX track that passes between two hitos
 * @param {Array} gpxPoints - Full track points array
 * @param {Object} hitoA - Entry point {lat, lng, tolerance}
 * @param {Object} hitoB - Exit point {lat, lng, tolerance}
 * @returns {Object} Result with found flag, times, and subtrack
 */
export function extractSegmentBetweenHitos(gpxPoints, hitoA, hitoB) {
    const result = {
        found: false,
        entryTime: null,
        exitTime: null,
        travelTimeSeconds: 0,
        subtrack: [],
    };

    // Find entry point (Hito A)
    const entryMatch = findClosestPointToHito(gpxPoints, hitoA);
    if (!entryMatch) {
        return result;
    }

    // Find exit point (Hito B) - only search AFTER the entry point
    const pointsAfterEntry = gpxPoints.slice(entryMatch.index);
    const exitMatch = findClosestPointToHito(pointsAfterEntry, hitoB);
    if (!exitMatch) {
        return result;
    }

    // Calculate actual indices in original array
    const entryIndex = entryMatch.index;
    const exitIndex = entryMatch.index + exitMatch.index;

    // Extract subtrack
    const subtrack = gpxPoints.slice(entryIndex, exitIndex + 1);

    // Calculate travel time
    const entryTime = gpxPoints[entryIndex].time;
    const exitTime = gpxPoints[exitIndex].time;

    if (entryTime && exitTime) {
        const travelTimeMs = exitTime.getTime() - entryTime.getTime();
        result.travelTimeSeconds = travelTimeMs / 1000;
    }

    result.found = true;
    result.entryTime = entryTime;
    result.exitTime = exitTime;
    result.subtrack = subtrack;

    return result;
}

/**
 * Calculate the total distance of a track segment
 * @param {Array} points - Array of track points
 * @returns {number} Total distance in meters
 */
export function calculateTrackDistance(points) {
    let totalDistance = 0;

    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        totalDistance += haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);
    }

    return totalDistance;
}
