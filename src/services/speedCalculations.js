/**
 * Speed Calculations Service
 * Trafing Methodology: V = d/t using theoretical distance
 */

/**
 * Calculate speed using theoretical distance and travel time
 * V = d / t
 * @param {number} theoreticalDistance - Distance in meters
 * @param {number} travelTimeSeconds - Time in seconds
 * @returns {number} Speed in km/h
 */
export function calculateSpeed(theoreticalDistance, travelTimeSeconds) {
    if (travelTimeSeconds <= 0) return 0;

    // Speed in m/s
    const speedMps = theoreticalDistance / travelTimeSeconds;

    // Convert to km/h (m/s * 3.6 = km/h)
    return speedMps * 3.6;
}

/**
 * Classify a timestamp into AM or PM period
 * AM: 6:00 - 12:00
 * PM: 12:00 - 20:00
 * @param {Date} timestamp - The timestamp to classify
 * @returns {string} "AM", "PM", or "Fuera de horario"
 */
export function classifyPeriod(timestamp) {
    if (!timestamp) return 'N/A';

    const hour = timestamp.getHours();

    if (hour >= 6 && hour < 12) {
        return 'AM';
    } else if (hour >= 12 && hour < 20) {
        return 'PM';
    } else {
        return 'Fuera de horario';
    }
}

/**
 * Group and consolidate speed results
 * @param {Array} samples - Array of speed samples
 *   Each sample: {speed, vehicleType, period, direction}
 * @returns {Object} Consolidated results with averages by group
 */
export function consolidateResults(samples) {
    const groups = {};

    samples.forEach((sample) => {
        const key = `${sample.vehicleType}-${sample.period}-${sample.direction}`;

        if (!groups[key]) {
            groups[key] = {
                vehicleType: sample.vehicleType,
                period: sample.period,
                direction: sample.direction,
                speeds: [],
                count: 0,
            };
        }

        groups[key].speeds.push(sample.speedKmh);
        groups[key].count++;
    });

    // Calculate averages
    const consolidated = Object.values(groups).map((group) => {
        const sum = group.speeds.reduce((a, b) => a + b, 0);
        const average = sum / group.speeds.length;
        const min = Math.min(...group.speeds);
        const max = Math.max(...group.speeds);

        return {
            vehicleType: group.vehicleType,
            period: group.period,
            direction: group.direction,
            sampleCount: group.count,
            averageSpeed: average,
            minSpeed: min,
            maxSpeed: max,
        };
    });

    // Also calculate overall average
    const allSpeeds = samples.map((s) => s.speedKmh);
    const overallAverage = allSpeeds.length > 0
        ? allSpeeds.reduce((a, b) => a + b, 0) / allSpeeds.length
        : 0;

    return {
        groups: consolidated,
        overallAverage,
        totalSamples: samples.length,
    };
}

/**
 * Format travel time in minutes and seconds
 * @param {number} seconds - Travel time in seconds
 * @returns {string} Formatted string "MM:SS"
 */
export function formatTravelTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Calculate standard deviation of speeds
 * @param {Array} speeds - Array of speed values
 * @returns {number} Standard deviation
 */
export function calculateStdDev(speeds) {
    if (speeds.length < 2) return 0;

    const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const squaredDiffs = speeds.map((s) => Math.pow(s - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / speeds.length;

    return Math.sqrt(avgSquaredDiff);
}
