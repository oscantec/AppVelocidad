import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Icon } from '../UI/Icons';
import { saveMasterRoute, updateMasterRoute } from '../../services/masterRoutes';

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

const hitoAIcon = createMarkerIcon('A', '#22c55e');
const hitoBIcon = createMarkerIcon('B', '#ef4444');

// Map click handler component
function MapClickHandler({ onMapClick, activeHito }) {
    useMapEvents({
        click: (e) => {
            if (activeHito) {
                onMapClick(e.latlng, activeHito);
            }
        },
    });
    return null;
}

export default function MasterRouteEditor({ route, onBack }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        hito_a_lat: null,
        hito_a_lng: null,
        hito_a_name: '',
        hito_a_tolerance: 50,
        hito_b_lat: null,
        hito_b_lng: null,
        hito_b_name: '',
        hito_b_tolerance: 50,
        theoretical_distance: '',
        direction: 'Norte-Sur',
        road_type: 'Principal',
    });
    const [activeHito, setActiveHito] = useState(null);
    const [saving, setSaving] = useState(false);
    const [mapCenter] = useState([4.6097, -74.0817]); // Bogotá default

    useEffect(() => {
        if (route) {
            setFormData({
                name: route.name || '',
                description: route.description || '',
                hito_a_lat: route.hito_a_lat,
                hito_a_lng: route.hito_a_lng,
                hito_a_name: route.hito_a_name || '',
                hito_a_tolerance: route.hito_a_tolerance || 50,
                hito_b_lat: route.hito_b_lat,
                hito_b_lng: route.hito_b_lng,
                hito_b_name: route.hito_b_name || '',
                hito_b_tolerance: route.hito_b_tolerance || 50,
                theoretical_distance: route.theoretical_distance || '',
                direction: route.direction || 'Norte-Sur',
                road_type: route.road_type || 'Principal',
            });
        }
    }, [route]);

    const handleMapClick = (latlng, hito) => {
        if (hito === 'A') {
            setFormData((prev) => ({
                ...prev,
                hito_a_lat: latlng.lat,
                hito_a_lng: latlng.lng,
            }));
        } else if (hito === 'B') {
            setFormData((prev) => ({
                ...prev,
                hito_b_lat: latlng.lat,
                hito_b_lng: latlng.lng,
            }));
        }
        setActiveHito(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            alert('Por favor ingresa un nombre para la ruta');
            return;
        }
        if (!formData.hito_a_lat || !formData.hito_b_lat) {
            alert('Por favor selecciona ambos hitos en el mapa');
            return;
        }
        if (!formData.theoretical_distance) {
            alert('Por favor ingresa la distancia teórica');
            return;
        }

        setSaving(true);
        try {
            const dataToSave = {
                ...formData,
                theoretical_distance: parseFloat(formData.theoretical_distance),
                hito_a_tolerance: parseFloat(formData.hito_a_tolerance),
                hito_b_tolerance: parseFloat(formData.hito_b_tolerance),
            };

            if (route?.id) {
                await updateMasterRoute(route.id, dataToSave);
            } else {
                await saveMasterRoute(dataToSave);
            }
            onBack();
        } catch (error) {
            console.error('Error saving route:', error);
            alert('Error al guardar la ruta');
        } finally {
            setSaving(false);
        }
    };

    const polylinePositions =
        formData.hito_a_lat && formData.hito_b_lat
            ? [
                [formData.hito_a_lat, formData.hito_a_lng],
                [formData.hito_b_lat, formData.hito_b_lng],
            ]
            : [];

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
                            className="input-field"
                            placeholder="Ej: Av. Caracas - Calle 26 a Calle 72"
                            value={formData.name}
                            onChange={handleInputChange}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">DESCRIPCIÓN (opcional)</label>
                        <textarea
                            name="description"
                            className="input-field textarea"
                            placeholder="Notas adicionales..."
                            value={formData.description}
                            onChange={handleInputChange}
                            rows={2}
                        />
                    </div>

                    <div className="hitos-section">
                        <h3 className="section-title">Hitos de Control</h3>

                        <div className="hito-form-group">
                            <div className="hito-header-row">
                                <span className="hito-badge-small hito-a">A</span>
                                <span className="hito-title">Punto de Entrada</span>
                                <button
                                    className={`btn-select-map ${activeHito === 'A' ? 'active' : ''}`}
                                    onClick={() => setActiveHito(activeHito === 'A' ? null : 'A')}
                                >
                                    {activeHito === 'A' ? 'Click en mapa...' : 'Seleccionar'}
                                </button>
                            </div>
                            <input
                                type="text"
                                name="hito_a_name"
                                className="input-field small"
                                placeholder="Nombre del punto A"
                                value={formData.hito_a_name}
                                onChange={handleInputChange}
                            />
                            {formData.hito_a_lat && (
                                <p className="coords-display">
                                    📍 {formData.hito_a_lat.toFixed(6)}, {formData.hito_a_lng.toFixed(6)}
                                </p>
                            )}
                        </div>

                        <div className="hito-form-group">
                            <div className="hito-header-row">
                                <span className="hito-badge-small hito-b">B</span>
                                <span className="hito-title">Punto de Salida</span>
                                <button
                                    className={`btn-select-map ${activeHito === 'B' ? 'active' : ''}`}
                                    onClick={() => setActiveHito(activeHito === 'B' ? null : 'B')}
                                >
                                    {activeHito === 'B' ? 'Click en mapa...' : 'Seleccionar'}
                                </button>
                            </div>
                            <input
                                type="text"
                                name="hito_b_name"
                                className="input-field small"
                                placeholder="Nombre del punto B"
                                value={formData.hito_b_name}
                                onChange={handleInputChange}
                            />
                            {formData.hito_b_lat && (
                                <p className="coords-display">
                                    📍 {formData.hito_b_lat.toFixed(6)}, {formData.hito_b_lng.toFixed(6)}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">DISTANCIA TEÓRICA (metros)</label>
                        <input
                            type="number"
                            name="theoretical_distance"
                            className="input-field"
                            placeholder="Ej: 1200"
                            value={formData.theoretical_distance}
                            onChange={handleInputChange}
                        />
                        <p className="form-hint">Esta distancia se usará para calcular V = d/t</p>
                    </div>

                    <div className="form-row">
                        <div className="form-group flex-1">
                            <label className="form-label">SENTIDO</label>
                            <select
                                name="direction"
                                className="input-field"
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
                                className="input-field"
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
                    {activeHito ? (
                        <span className="instruction-active">
                            Haz click en el mapa para ubicar el Hito {activeHito}
                        </span>
                    ) : (
                        <span>Selecciona "Seleccionar" junto a cada hito para ubicarlo en el mapa</span>
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
                    <MapClickHandler onMapClick={handleMapClick} activeHito={activeHito} />

                    {formData.hito_a_lat && (
                        <Marker
                            position={[formData.hito_a_lat, formData.hito_a_lng]}
                            icon={hitoAIcon}
                        />
                    )}
                    {formData.hito_b_lat && (
                        <Marker
                            position={[formData.hito_b_lat, formData.hito_b_lng]}
                            icon={hitoBIcon}
                        />
                    )}
                    {polylinePositions.length === 2 && (
                        <Polyline
                            positions={polylinePositions}
                            color="#f27f0d"
                            weight={4}
                            dashArray="10, 10"
                        />
                    )}
                </MapContainer>
            </div>
        </div>
    );
}
