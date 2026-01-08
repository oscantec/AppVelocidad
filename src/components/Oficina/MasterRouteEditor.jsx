import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Icon } from '../UI/Icons';
import { saveMasterRoute, updateMasterRoute, getWaypoints } from '../../services/masterRoutes';

// Custom marker icons
const createMarkerIcon = (label, color) => {
    return L.divIcon({
        className: 'custom-hito-marker',
        html: `<div style="
            background: ${color};
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">${label}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });
};

const startIcon = createMarkerIcon('I', '#22c55e');
const endIcon = createMarkerIcon('F', '#ef4444');
const intermediateIcon = (index) => createMarkerIcon(index + 1, '#f27f0d');

// Map click handler component
function MapClickHandler({ onMapClick, activePoint }) {
    useMapEvents({
        click: (e) => {
            if (activePoint) {
                onMapClick(e.latlng, activePoint);
            }
        },
    });
    return null;
}

export default function MasterRouteEditor({ route, onBack }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        theoretical_distance: '',
        direction: 'Norte-Sur',
        road_type: 'Principal',
    });

    // Waypoints state
    const [startPoint, setStartPoint] = useState({ lat: null, lng: null, name: '', tolerance: 50, id: null });
    const [endPoint, setEndPoint] = useState({ lat: null, lng: null, name: '', tolerance: 50, id: null });
    const [intermediatePoints, setIntermediatePoints] = useState([]);

    // UI state
    const [activePoint, setActivePoint] = useState(null); // 'start', 'end', or index for intermediate
    const [saving, setSaving] = useState(false);
    const [existingWaypoints, setExistingWaypoints] = useState([]);
    const [showWaypointPicker, setShowWaypointPicker] = useState(null);
    const [mapCenter] = useState([4.6097, -74.0817]); // Bogotá default

    useEffect(() => {
        loadExistingWaypoints();
        if (route) {
            loadRouteData();
        }
    }, [route]);

    const loadExistingWaypoints = async () => {
        const waypoints = await getWaypoints();
        setExistingWaypoints(waypoints);
    };

    const loadRouteData = () => {
        setFormData({
            name: route.name || '',
            description: route.description || '',
            theoretical_distance: route.theoretical_distance || '',
            direction: route.direction || 'Norte-Sur',
            road_type: route.road_type || 'Principal',
        });

        if (route.start_waypoint) {
            setStartPoint({
                id: route.start_waypoint.id,
                lat: route.start_waypoint.lat,
                lng: route.start_waypoint.lng,
                name: route.start_waypoint.name || '',
                tolerance: route.start_waypoint.tolerance || 50,
            });
        }

        if (route.end_waypoint) {
            setEndPoint({
                id: route.end_waypoint.id,
                lat: route.end_waypoint.lat,
                lng: route.end_waypoint.lng,
                name: route.end_waypoint.name || '',
                tolerance: route.end_waypoint.tolerance || 50,
            });
        }

        if (route.intermediate_waypoints) {
            setIntermediatePoints(
                route.intermediate_waypoints.map((rw) => ({
                    id: rw.waypoint?.id,
                    lat: rw.waypoint?.lat,
                    lng: rw.waypoint?.lng,
                    name: rw.waypoint?.name || '',
                    tolerance: rw.waypoint?.tolerance || 50,
                    segment_distance: rw.segment_distance,
                }))
            );
        }
    };

    const handleMapClick = (latlng, pointType) => {
        if (pointType === 'start') {
            setStartPoint((prev) => ({ ...prev, lat: latlng.lat, lng: latlng.lng, id: null }));
        } else if (pointType === 'end') {
            setEndPoint((prev) => ({ ...prev, lat: latlng.lat, lng: latlng.lng, id: null }));
        } else if (typeof pointType === 'number') {
            setIntermediatePoints((prev) => {
                const updated = [...prev];
                updated[pointType] = { ...updated[pointType], lat: latlng.lat, lng: latlng.lng, id: null };
                return updated;
            });
        }
        setActivePoint(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const addIntermediatePoint = () => {
        setIntermediatePoints((prev) => [
            ...prev,
            { lat: null, lng: null, name: '', tolerance: 50, segment_distance: null, id: null }
        ]);
    };

    const removeIntermediatePoint = (index) => {
        setIntermediatePoints((prev) => prev.filter((_, i) => i !== index));
    };

    const updateIntermediatePoint = (index, field, value) => {
        setIntermediatePoints((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const selectExistingWaypoint = (waypoint, targetType) => {
        if (targetType === 'start') {
            setStartPoint({
                id: waypoint.id,
                lat: waypoint.lat,
                lng: waypoint.lng,
                name: waypoint.name,
                tolerance: waypoint.tolerance || 50,
            });
        } else if (targetType === 'end') {
            setEndPoint({
                id: waypoint.id,
                lat: waypoint.lat,
                lng: waypoint.lng,
                name: waypoint.name,
                tolerance: waypoint.tolerance || 50,
            });
        } else if (typeof targetType === 'number') {
            setIntermediatePoints((prev) => {
                const updated = [...prev];
                updated[targetType] = {
                    id: waypoint.id,
                    lat: waypoint.lat,
                    lng: waypoint.lng,
                    name: waypoint.name,
                    tolerance: waypoint.tolerance || 50,
                    segment_distance: updated[targetType]?.segment_distance,
                };
                return updated;
            });
        }
        setShowWaypointPicker(null);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            alert('Por favor ingresa un nombre para la ruta');
            return;
        }
        if (!startPoint.lat || !endPoint.lat) {
            alert('Por favor define al menos el punto inicial y final');
            return;
        }
        if (!formData.theoretical_distance) {
            alert('Por favor ingresa la distancia teórica total');
            return;
        }

        setSaving(true);
        try {
            const routeInfo = {
                name: formData.name,
                description: formData.description,
                theoretical_distance: parseFloat(formData.theoretical_distance),
                direction: formData.direction,
                road_type: formData.road_type,
            };

            let result;
            if (route?.id) {
                result = await updateMasterRoute(
                    route.id,
                    routeInfo,
                    startPoint,
                    intermediatePoints.filter((p) => p.lat),
                    endPoint
                );
            } else {
                result = await saveMasterRoute(
                    routeInfo,
                    startPoint,
                    intermediatePoints.filter((p) => p.lat),
                    endPoint
                );
            }

            if (result.success) {
                onBack();
            } else {
                alert('Error al guardar la ruta');
            }
        } catch (error) {
            console.error('Error saving route:', error);
            alert('Error al guardar la ruta');
        } finally {
            setSaving(false);
        }
    };

    // Build polyline positions
    const getPolylinePositions = () => {
        const positions = [];
        if (startPoint.lat) positions.push([startPoint.lat, startPoint.lng]);
        intermediatePoints.forEach((p) => {
            if (p.lat) positions.push([p.lat, p.lng]);
        });
        if (endPoint.lat) positions.push([endPoint.lat, endPoint.lng]);
        return positions;
    };

    return (
        <div className="oficina-content editor-layout">
            <div className="editor-sidebar">
                <div className="editor-header">
                    <button className="back-button-small" onClick={onBack}>
                        <Icon name="back" size={18} />
                    </button>
                    <h2>{route ? 'Editar Ruta Maestra' : 'Nueva Ruta Maestra'}</h2>
                </div>

                <div className="editor-form">
                    <div className="form-group">
                        <label className="form-label">NOMBRE DEL TRAMO</label>
                        <input
                            type="text"
                            name="name"
                            className="input-field oficina-input"
                            placeholder="Ej: Av. Caracas - Calle 26 a Calle 72"
                            value={formData.name}
                            onChange={handleInputChange}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">DESCRIPCIÓN (opcional)</label>
                        <textarea
                            name="description"
                            className="input-field oficina-input textarea"
                            placeholder="Notas adicionales..."
                            value={formData.description}
                            onChange={handleInputChange}
                            rows={2}
                        />
                    </div>

                    {/* START POINT */}
                    <div className="waypoint-section">
                        <h3 className="section-title">
                            <span className="waypoint-badge start">I</span>
                            Punto de Inicio
                        </h3>
                        <div className="waypoint-controls">
                            <input
                                type="text"
                                className="input-field oficina-input small"
                                placeholder="Nombre del punto"
                                value={startPoint.name}
                                onChange={(e) => setStartPoint((prev) => ({ ...prev, name: e.target.value }))}
                            />
                            <div className="waypoint-actions">
                                <button
                                    className={`btn-select-map ${activePoint === 'start' ? 'active' : ''}`}
                                    onClick={() => setActivePoint(activePoint === 'start' ? null : 'start')}
                                >
                                    {activePoint === 'start' ? 'Click mapa...' : '📍 Mapa'}
                                </button>
                                <button
                                    className="btn-select-existing"
                                    onClick={() => setShowWaypointPicker('start')}
                                >
                                    🔗 Existente
                                </button>
                            </div>
                        </div>
                        {startPoint.lat && (
                            <p className="coords-display">
                                📍 {startPoint.lat.toFixed(6)}, {startPoint.lng.toFixed(6)}
                                {startPoint.id && <span className="linked-badge">vinculado</span>}
                            </p>
                        )}
                    </div>

                    {/* INTERMEDIATE POINTS */}
                    <div className="waypoint-section">
                        <div className="section-header-row">
                            <h3 className="section-title">
                                <span className="waypoint-badge intermediate">+</span>
                                Puntos Intermedios
                            </h3>
                            <button className="btn-add-point" onClick={addIntermediatePoint}>
                                + Agregar
                            </button>
                        </div>

                        {intermediatePoints.length === 0 ? (
                            <p className="empty-points-msg">Sin puntos intermedios</p>
                        ) : (
                            <div className="intermediate-list">
                                {intermediatePoints.map((point, index) => (
                                    <div key={index} className="intermediate-item">
                                        <div className="intermediate-header">
                                            <span className="intermediate-number">{index + 1}</span>
                                            <input
                                                type="text"
                                                className="input-field oficina-input small flex-1"
                                                placeholder={`Punto ${index + 1}`}
                                                value={point.name}
                                                onChange={(e) => updateIntermediatePoint(index, 'name', e.target.value)}
                                            />
                                            <button
                                                className="btn-remove-point"
                                                onClick={() => removeIntermediatePoint(index)}
                                            >
                                                ×
                                            </button>
                                        </div>
                                        <div className="waypoint-actions">
                                            <button
                                                className={`btn-select-map ${activePoint === index ? 'active' : ''}`}
                                                onClick={() => setActivePoint(activePoint === index ? null : index)}
                                            >
                                                {activePoint === index ? 'Click mapa...' : '📍 Mapa'}
                                            </button>
                                            <button
                                                className="btn-select-existing"
                                                onClick={() => setShowWaypointPicker(index)}
                                            >
                                                🔗 Existente
                                            </button>
                                        </div>
                                        {point.lat && (
                                            <p className="coords-display small">
                                                {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                                                {point.id && <span className="linked-badge">vinculado</span>}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* END POINT */}
                    <div className="waypoint-section">
                        <h3 className="section-title">
                            <span className="waypoint-badge end">F</span>
                            Punto Final
                        </h3>
                        <div className="waypoint-controls">
                            <input
                                type="text"
                                className="input-field oficina-input small"
                                placeholder="Nombre del punto"
                                value={endPoint.name}
                                onChange={(e) => setEndPoint((prev) => ({ ...prev, name: e.target.value }))}
                            />
                            <div className="waypoint-actions">
                                <button
                                    className={`btn-select-map ${activePoint === 'end' ? 'active' : ''}`}
                                    onClick={() => setActivePoint(activePoint === 'end' ? null : 'end')}
                                >
                                    {activePoint === 'end' ? 'Click mapa...' : '📍 Mapa'}
                                </button>
                                <button
                                    className="btn-select-existing"
                                    onClick={() => setShowWaypointPicker('end')}
                                >
                                    🔗 Existente
                                </button>
                            </div>
                        </div>
                        {endPoint.lat && (
                            <p className="coords-display">
                                📍 {endPoint.lat.toFixed(6)}, {endPoint.lng.toFixed(6)}
                                {endPoint.id && <span className="linked-badge">vinculado</span>}
                            </p>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">DISTANCIA TEÓRICA TOTAL (metros)</label>
                        <input
                            type="number"
                            name="theoretical_distance"
                            className="input-field oficina-input"
                            placeholder="Ej: 1200"
                            value={formData.theoretical_distance}
                            onChange={handleInputChange}
                        />
                        <p className="form-hint">Distancia total de inicio a fin pasando por todos los puntos</p>
                    </div>

                    <div className="form-row">
                        <div className="form-group flex-1">
                            <label className="form-label">SENTIDO</label>
                            <select
                                name="direction"
                                className="input-field oficina-input"
                                value={formData.direction}
                                onChange={handleInputChange}
                            >
                                <option value="Norte-Sur">Norte-Sur</option>
                                <option value="Sur-Norte">Sur-Norte</option>
                                <option value="Este-Oeste">Este-Oeste</option>
                                <option value="Oeste-Este">Oeste-Este</option>
                            </select>
                        </div>
                        <div className="form-group flex-1">
                            <label className="form-label">TIPO VÍA</label>
                            <select
                                name="road_type"
                                className="input-field oficina-input"
                                value={formData.road_type}
                                onChange={handleInputChange}
                            >
                                <option value="Principal">Principal</option>
                                <option value="Secundaria">Secundaria</option>
                                <option value="Autopista">Autopista</option>
                                <option value="Local">Local</option>
                            </select>
                        </div>
                    </div>

                    <button
                        className="btn-primary large"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? 'Guardando...' : route ? 'Actualizar Ruta' : 'Guardar Ruta Maestra'}
                    </button>
                </div>
            </div>

            <div className="editor-map-container">
                <div className="map-instructions">
                    {activePoint !== null ? (
                        <span className="instruction-active">
                            Haz click en el mapa para ubicar el punto {
                                activePoint === 'start' ? 'inicial' :
                                    activePoint === 'end' ? 'final' :
                                        `intermedio ${activePoint + 1}`
                            }
                        </span>
                    ) : (
                        <span>Selecciona "📍 Mapa" junto a cada punto para ubicarlo</span>
                    )}
                </div>
                <MapContainer
                    center={mapCenter}
                    zoom={13}
                    className="editor-map"
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapClickHandler onMapClick={handleMapClick} activePoint={activePoint} />

                    {startPoint.lat && (
                        <Marker
                            position={[startPoint.lat, startPoint.lng]}
                            icon={startIcon}
                        />
                    )}

                    {intermediatePoints.map((point, index) =>
                        point.lat ? (
                            <Marker
                                key={index}
                                position={[point.lat, point.lng]}
                                icon={intermediateIcon(index)}
                            />
                        ) : null
                    )}

                    {endPoint.lat && (
                        <Marker
                            position={[endPoint.lat, endPoint.lng]}
                            icon={endIcon}
                        />
                    )}

                    {getPolylinePositions().length >= 2 && (
                        <Polyline
                            positions={getPolylinePositions()}
                            color="#f27f0d"
                            weight={4}
                            dashArray="10, 10"
                        />
                    )}
                </MapContainer>
            </div>

            {/* Waypoint Picker Modal */}
            {showWaypointPicker !== null && (
                <div className="modal-overlay" onClick={() => setShowWaypointPicker(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Seleccionar Punto Existente</h3>
                        <p className="modal-subtitle">Vincula un punto ya definido en otras rutas</p>
                        {existingWaypoints.length === 0 ? (
                            <p className="empty-modal-msg">No hay puntos existentes</p>
                        ) : (
                            <div className="waypoint-picker-list">
                                {existingWaypoints.map((wp) => (
                                    <button
                                        key={wp.id}
                                        className="waypoint-picker-item"
                                        onClick={() => selectExistingWaypoint(wp, showWaypointPicker)}
                                    >
                                        <span className="wp-name">{wp.name}</span>
                                        <span className="wp-coords">
                                            {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                        <button className="btn-secondary" onClick={() => setShowWaypointPicker(null)}>
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
