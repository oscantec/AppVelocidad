import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { Icon } from '../UI/Icons';
import { getMasterRoutes } from '../../services/masterRoutes';
import { getRoutesFromSupabase, getRouteGPX } from '../../services/routes';
import { parseGPXToPoints, extractSegmentBetweenHitos } from '../../utils/gpxAnalysis';
import { calculateSpeed, classifyPeriod } from '../../services/speedCalculations';

// Custom marker icons
const hitoAIcon = L.divIcon({
    className: 'custom-hito-marker',
    html: `<div style="background:#22c55e;color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">A</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

const hitoBIcon = L.divIcon({
    className: 'custom-hito-marker',
    html: `<div style="background:#ef4444;color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">B</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

export default function AnalysisWorkspace() {
    const [masterRoutes, setMasterRoutes] = useState([]);
    const [gpxRoutes, setGpxRoutes] = useState([]);
    const [selectedMasterRoute, setSelectedMasterRoute] = useState(null);
    const [selectedGPXIds, setSelectedGPXIds] = useState([]);
    const [results, setResults] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [mapCenter] = useState([4.6097, -74.0817]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [masters, gpxs] = await Promise.all([
            getMasterRoutes(),
            getRoutesFromSupabase(),
        ]);
        setMasterRoutes(masters);
        setGpxRoutes(gpxs);
    };

    const toggleGPXSelection = (id) => {
        setSelectedGPXIds((prev) =>
            prev.includes(id)
                ? prev.filter((x) => x !== id)
                : [...prev, id]
        );
    };

    const selectAllGPX = () => {
        if (selectedGPXIds.length === gpxRoutes.length) {
            setSelectedGPXIds([]);
        } else {
            setSelectedGPXIds(gpxRoutes.map((r) => r.id));
        }
    };

    const runTramification = async () => {
        if (!selectedMasterRoute) {
            alert('Selecciona una Ruta Maestra');
            return;
        }
        if (selectedGPXIds.length === 0) {
            alert('Selecciona al menos un archivo GPX');
            return;
        }

        setProcessing(true);
        setResults([]);

        const newResults = [];

        for (const gpxId of selectedGPXIds) {
            const gpxRoute = gpxRoutes.find((r) => r.id === gpxId);
            if (!gpxRoute?.gpx_url) continue;

            try {
                const gpxContent = await getRouteGPX(gpxRoute.gpx_url);
                if (!gpxContent) continue;

                const points = parseGPXToPoints(gpxContent);
                if (points.length === 0) continue;

                const hitoA = {
                    lat: selectedMasterRoute.hito_a_lat,
                    lng: selectedMasterRoute.hito_a_lng,
                    tolerance: selectedMasterRoute.hito_a_tolerance || 50,
                };
                const hitoB = {
                    lat: selectedMasterRoute.hito_b_lat,
                    lng: selectedMasterRoute.hito_b_lng,
                    tolerance: selectedMasterRoute.hito_b_tolerance || 50,
                };

                const segment = extractSegmentBetweenHitos(points, hitoA, hitoB);

                if (segment.found) {
                    const speed = calculateSpeed(
                        selectedMasterRoute.theoretical_distance,
                        segment.travelTimeSeconds
                    );
                    const period = classifyPeriod(new Date(segment.entryTime));

                    newResults.push({
                        gpxId,
                        gpxName: gpxRoute.name,
                        gpxDate: gpxRoute.date,
                        vehicleType: gpxRoute.vehicle_type || 'Público',
                        entryTime: segment.entryTime,
                        exitTime: segment.exitTime,
                        travelTimeSeconds: segment.travelTimeSeconds,
                        speedKmh: speed,
                        period,
                        direction: selectedMasterRoute.direction,
                        found: true,
                        subtrack: segment.subtrack,
                    });
                } else {
                    newResults.push({
                        gpxId,
                        gpxName: gpxRoute.name,
                        found: false,
                        error: 'No cruza los hitos',
                    });
                }
            } catch (error) {
                console.error('Error processing GPX:', error);
                newResults.push({
                    gpxId,
                    gpxName: gpxRoute.name,
                    found: false,
                    error: 'Error al procesar',
                });
            }
        }

        setResults(newResults);
        setProcessing(false);
    };

    const successfulResults = results.filter((r) => r.found);
    const averageSpeed =
        successfulResults.length > 0
            ? successfulResults.reduce((sum, r) => sum + r.speedKmh, 0) / successfulResults.length
            : 0;

    return (
        <div className="oficina-content analysis-layout">
            <div className="analysis-panel">
                <div className="oficina-header compact">
                    <h1 className="oficina-title">Tramificación</h1>
                    <p className="oficina-subtitle">
                        Cruza GPX de campo con Rutas Maestras
                    </p>
                </div>

                {/* Master Route Selector */}
                <div className="form-group">
                    <label className="form-label">RUTA MAESTRA</label>
                    <select
                        className="input-field"
                        value={selectedMasterRoute?.id || ''}
                        onChange={(e) => {
                            const route = masterRoutes.find((r) => r.id === e.target.value);
                            setSelectedMasterRoute(route || null);
                            setResults([]);
                        }}
                    >
                        <option value="">Selecciona una ruta patrón...</option>
                        {masterRoutes.map((route) => (
                            <option key={route.id} value={route.id}>
                                {route.name} ({route.theoretical_distance}m)
                            </option>
                        ))}
                    </select>
                </div>

                {selectedMasterRoute && (
                    <div className="selected-route-info">
                        <div className="sri-hitos">
                            <span className="hito-badge-mini hito-a">A</span>
                            <span className="sri-arrow">→</span>
                            <span className="hito-badge-mini hito-b">B</span>
                        </div>
                        <p className="sri-distance">
                            Distancia teórica: <strong>{selectedMasterRoute.theoretical_distance}m</strong>
                        </p>
                    </div>
                )}

                {/* GPX Selection */}
                <div className="gpx-selection">
                    <div className="gpx-header">
                        <label className="form-label">MUESTRAS GPX</label>
                        <button className="btn-link" onClick={selectAllGPX}>
                            {selectedGPXIds.length === gpxRoutes.length
                                ? 'Deseleccionar todo'
                                : 'Seleccionar todo'}
                        </button>
                    </div>
                    <div className="gpx-list">
                        {gpxRoutes.map((route) => (
                            <label key={route.id} className="gpx-item">
                                <input
                                    type="checkbox"
                                    checked={selectedGPXIds.includes(route.id)}
                                    onChange={() => toggleGPXSelection(route.id)}
                                />
                                <span className="gpx-item-name">{route.name}</span>
                                <span className="gpx-item-type">{route.vehicle_type}</span>
                            </label>
                        ))}
                    </div>
                    <p className="selection-count">
                        {selectedGPXIds.length} de {gpxRoutes.length} seleccionadas
                    </p>
                </div>

                <button
                    className="btn-primary large"
                    onClick={runTramification}
                    disabled={processing || !selectedMasterRoute || selectedGPXIds.length === 0}
                >
                    {processing ? (
                        <>Procesando...</>
                    ) : (
                        <>
                            <Icon name="analytics" size={18} />
                            Ejecutar Tramificación
                        </>
                    )}
                </button>

                {/* Results Summary */}
                {results.length > 0 && (
                    <div className="results-summary">
                        <h3>Resumen</h3>
                        <div className="summary-stats">
                            <div className="summary-stat">
                                <span className="stat-value">{successfulResults.length}</span>
                                <span className="stat-label">Exitosas</span>
                            </div>
                            <div className="summary-stat">
                                <span className="stat-value">{results.length - successfulResults.length}</span>
                                <span className="stat-label">Sin cruce</span>
                            </div>
                            <div className="summary-stat highlight">
                                <span className="stat-value">{averageSpeed.toFixed(1)}</span>
                                <span className="stat-label">km/h promedio</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="analysis-main">
                {/* Map */}
                <div className="analysis-map-container">
                    <MapContainer
                        center={mapCenter}
                        zoom={13}
                        className="analysis-map"
                        style={{ height: '300px', width: '100%' }}
                    >
                        <TileLayer
                            attribution='&copy; OpenStreetMap'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {selectedMasterRoute && (
                            <>
                                <Marker
                                    position={[selectedMasterRoute.hito_a_lat, selectedMasterRoute.hito_a_lng]}
                                    icon={hitoAIcon}
                                />
                                <Marker
                                    position={[selectedMasterRoute.hito_b_lat, selectedMasterRoute.hito_b_lng]}
                                    icon={hitoBIcon}
                                />
                                <Polyline
                                    positions={[
                                        [selectedMasterRoute.hito_a_lat, selectedMasterRoute.hito_a_lng],
                                        [selectedMasterRoute.hito_b_lat, selectedMasterRoute.hito_b_lng],
                                    ]}
                                    color="#f27f0d"
                                    weight={3}
                                    dashArray="8, 8"
                                />
                            </>
                        )}
                        {/* Show extracted segments */}
                        {successfulResults.map((result, idx) => (
                            result.subtrack && (
                                <Polyline
                                    key={idx}
                                    positions={result.subtrack.map((p) => [p.lat, p.lng])}
                                    color="#22c55e"
                                    weight={2}
                                    opacity={0.7}
                                />
                            )
                        ))}
                    </MapContainer>
                </div>

                {/* Results Table */}
                {results.length > 0 && (
                    <div className="results-table-container">
                        <h3>Resultados Detallados</h3>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Muestra</th>
                                    <th>Vehículo</th>
                                    <th>Período</th>
                                    <th>Tiempo</th>
                                    <th>Velocidad</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((result, idx) => (
                                    <tr key={idx} className={result.found ? '' : 'row-error'}>
                                        <td>{result.gpxName}</td>
                                        <td>{result.vehicleType || '-'}</td>
                                        <td>{result.period || '-'}</td>
                                        <td>
                                            {result.found
                                                ? `${Math.floor(result.travelTimeSeconds / 60)}:${String(
                                                    Math.floor(result.travelTimeSeconds % 60)
                                                ).padStart(2, '0')}`
                                                : '-'}
                                        </td>
                                        <td className={result.found ? 'speed-cell' : ''}>
                                            {result.found ? `${result.speedKmh.toFixed(1)} km/h` : '-'}
                                        </td>
                                        <td>
                                            {result.found ? (
                                                <span className="status-success">✓ OK</span>
                                            ) : (
                                                <span className="status-error">{result.error}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
