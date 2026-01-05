import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
import { getRouteGPX } from '../services/routes';
import { parseGPX } from '../utils/gpx';
import { Icon } from './UI/Icons';

export default function RouteDetailScreen({ onNavigate, route }) {
    const [gpxPoints, setGpxPoints] = useState([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (route && route.gpx_url) {
            loadGPXData();
        }
    }, [route]);

    useEffect(() => {
        let interval;
        if (isPlaying && gpxPoints.length > 0) {
            interval = setInterval(() => {
                setCurrentIndex(prev => {
                    if (prev >= gpxPoints.length - 1) {
                        setIsPlaying(false);
                        return 0;
                    }
                    return prev + 1;
                });
            }, 500);
        }
        return () => clearInterval(interval);
    }, [isPlaying, gpxPoints.length]);

    const loadGPXData = async () => {
        const gpxText = await getRouteGPX(route.gpx_url);
        if (!gpxText) return;
        const points = parseGPX(gpxText);
        setGpxPoints(points);
    };

    if (!route) {
        return (
            <div className="screen">
                <div className="empty-state">
                    <p>Ruta no encontrada</p>
                    <button onClick={() => onNavigate('routes')} className="btn-secondary">
                        Volver a rutas
                    </button>
                </div>
            </div>
        );
    }

    const formatDuration = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    };

    const pathCoordinates = gpxPoints.map(p => [p.lat, p.lon]);
    const currentPosition = gpxPoints[currentIndex] ? [gpxPoints[currentIndex].lat, gpxPoints[currentIndex].lon] : null;

    return (
        <div className="screen">
            <div className="header">
                <button onClick={() => onNavigate('routes')} className="icon-button">
                    <Icon name="back" size={24} />
                </button>
                <h2>{route.name}</h2>
                <div></div>
            </div>

            <div className="content detail-content">
                {gpxPoints.length > 0 && (
                    <>
                        <MapContainer
                            center={pathCoordinates[0]}
                            zoom={13}
                            style={{ height: '300px', width: '100%', borderRadius: '1rem', marginBottom: '1.5rem' }}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; OpenStreetMap'
                            />
                            <Polyline positions={pathCoordinates} pathOptions={{ color: '#f27f0d', weight: 4 }} />
                            {currentPosition && (
                                <Marker position={currentPosition} />
                            )}
                        </MapContainer>

                        <div className="player-controls">
                            <button
                                onClick={() => setIsPlaying(!isPlaying)}
                                className="btn-secondary"
                            >
                                <Icon name={isPlaying ? 'pause' : 'play'} size={20} />
                                {isPlaying ? 'Pausar' : 'Reproducir'} Ruta
                            </button>
                            <p className="player-info">
                                Punto {currentIndex + 1} de {gpxPoints.length} • {gpxPoints[currentIndex]?.speed || 0} km/h
                            </p>
                        </div>
                    </>
                )}

                <div className="detail-stats-grid">
                    <div className="detail-stat-card">
                        <Icon name="route" size={32} className="detail-stat-icon" />
                        <p className="detail-stat-label">Distancia</p>
                        <p className="detail-stat-value">{route.distance} <span className="detail-stat-unit">km</span></p>
                    </div>
                    <div className="detail-stat-card">
                        <Icon name="speedometer" size={32} className="detail-stat-icon" />
                        <p className="detail-stat-label">Vel. Promedio</p>
                        <p className="detail-stat-value">{route.avg_speed} <span className="detail-stat-unit">km/h</span></p>
                    </div>
                    <div className="detail-stat-card">
                        <span className="detail-stat-icon">⏱️</span>
                        <p className="detail-stat-label">Duración</p>
                        <p className="detail-stat-value">{formatDuration(route.duration)}</p>
                    </div>
                    <div className="detail-stat-card">
                        <span className="detail-stat-icon">📊</span>
                        <p className="detail-stat-label">Vel. Máxima</p>
                        <p className="detail-stat-value">{route.max_speed} <span className="detail-stat-unit">km/h</span></p>
                    </div>
                    <div className="detail-stat-card">
                        <Icon name="navigation" size={32} className="detail-stat-icon" />
                        <p className="detail-stat-label">Puntos GPS</p>
                        <p className="detail-stat-value">{route.points}</p>
                    </div>
                    <div className="detail-stat-card">
                        <Icon name={route.vehicle_type === 'Público' ? 'bus' : 'car'} size={32} className="detail-stat-icon" />
                        <p className="detail-stat-label">Vehículo</p>
                        <p className="detail-stat-value">{route.vehicle_type || 'N/A'}</p>
                    </div>
                </div>

                <a
                    href={route.gpx_url}
                    download={`${route.name}.gpx`}
                    className="btn-primary"
                >
                    <Icon name="download" size={20} className="btn-icon" />
                    Descargar GPX
                </a>
            </div>
        </div>
    );
}
