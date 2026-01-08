import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { saveRouteToSupabase } from '../services/routes';
import { generateGPX } from '../utils/gpx';
import { Icon, GPSSignalBars } from './UI/Icons';
import AppLogo from '../assets/Images/nextcantrafico.png';

// Componente para auto-centrar el mapa
function MapUpdater({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
}

export default function RecordingScreen({ onNavigate, routeConfig }) {
    const { routeName, vehicleType } = routeConfig;
    const [duration, setDuration] = useState(0);
    const [speed, setSpeed] = useState(0);
    const [maxSpeed, setMaxSpeed] = useState(0);
    const [points, setPoints] = useState([]);
    const [distance, setDistance] = useState(0);
    const [gpsStatus, setGpsStatus] = useState({ active: false, quality: 'Buscando...', satellites: 0 });
    const [currentPosition, setCurrentPosition] = useState(null);

    const startTimeRef = useRef(new Date().toISOString());
    const watchIdRef = useRef(null);

    useEffect(() => {
        const interval = setInterval(() => {
            setDuration(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (navigator.geolocation) {
            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude, altitude, speed: gpsSpeed, accuracy } = position.coords;
                    const currentSpeed = gpsSpeed ? Math.round(gpsSpeed * 3.6) : 0;

                    setGpsStatus({
                        active: true,
                        quality: accuracy < 20 ? 'Excelente' : accuracy < 50 ? 'Buena' : accuracy < 100 ? 'Media' : 'Baja',
                        accuracy: accuracy,
                        satellites: accuracy < 10 ? '10-12' : accuracy < 20 ? '8-10' : accuracy < 50 ? '6-8' : '4-6'
                    });

                    setSpeed(currentSpeed);
                    setMaxSpeed(prev => Math.max(prev, currentSpeed));
                    setCurrentPosition([latitude, longitude]);

                    const newPoint = {
                        lat: latitude,
                        lon: longitude,
                        ele: altitude || 0,
                        speed: currentSpeed,
                        time: new Date().toISOString()
                    };

                    setPoints(prev => {
                        const updated = [...prev, newPoint];

                        if (updated.length > 1) {
                            const lastPoint = updated[updated.length - 2];
                            const dist = calculateDistance(
                                lastPoint.lat, lastPoint.lon,
                                newPoint.lat, newPoint.lon
                            );
                            setDistance(prevDist => prevDist + dist);
                        }

                        return updated;
                    });
                },
                (error) => {
                    console.error('GPS Error:', error);
                    setGpsStatus({ active: false, quality: 'Sin señal', satellites: 0 });
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 5000
                }
            );
        }

        return () => {
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const handleStop = async () => {
        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }

        if (points.length === 0) {
            alert('⚠️ No se capturaron puntos GPS.\n\nPara guardar una ruta necesitas:\n• Estar al aire libre\n• Tener GPS activado\n• Permitir acceso a ubicación\n• Moverte al menos 50 metros\n\nIntenta de nuevo en un lugar con buena señal GPS.');
            onNavigate('home');
            return;
        }

        if (points.length < 5) {
            const continuar = window.confirm('⚠️ Muy pocos puntos GPS capturados.\n\nSolo tienes ' + points.length + ' puntos. Para una ruta confiable se recomiendan al menos 5.\n\n¿Continuar de todos modos?');
            if (!continuar) {
                return;
            }
        }

        const avgSpeed = points.reduce((acc, p) => acc + p.speed, 0) / points.length;

        const routeData = {
            name: routeName,
            points: points,
            pointsCount: points.length,
            startTime: startTimeRef.current,
            duration: duration,
            distance: distance.toFixed(2),
            avgSpeed: avgSpeed.toFixed(1),
            maxSpeed: maxSpeed,
            vehicleType: vehicleType
        };

        const gpxContent = generateGPX(routeData);
        const result = await saveRouteToSupabase(routeData, gpxContent);

        if (result.success) {
            alert(`✅ Ruta "${routeName}" guardada exitosamente!\n\n📊 Estadísticas:\n• ${points.length} puntos GPS capturados\n• ${distance.toFixed(2)} km recorridos\n• ${avgSpeed.toFixed(1)} km/h velocidad promedio\n• ${maxSpeed} km/h velocidad máxima\n• Vehículo: ${vehicleType}`);
            onNavigate('routes');
        } else {
            const errorMsg = result.error && result.error.message ? result.error.message : 'Error desconocido';
            alert(`❌ Error al guardar la ruta:\n\n${errorMsg}\n\nLa ruta NO se guardó. Por favor intenta de nuevo.`);
            console.error('Error completo:', result.error);
        }
    };

    const formatTime = (totalSeconds) => {
        const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return { h, m, s };
    };

    const time = formatTime(duration);
    const pathCoordinates = points.map(p => [p.lat, p.lon]);

    return (
        <div className="screen recording-screen">
            <div className="header">
                <button onClick={() => onNavigate('home')} className="icon-button">
                    <Icon name="back" size={24} />
                </button>
                <div className="logo-container">
                    <img src={AppLogo} alt="Nextcan Tráfico" className="app-logo" />
                </div>
                <button onClick={() => onNavigate('satellites')} className="icon-button">
                    <Icon name="satellite" size={20} />
                </button>
            </div>

            <div className="content">
                <p className="timer-label">TIEMPO TRANSCURRIDO</p>
                <div className="timer-display">
                    <div className="time-unit">
                        <div className="time-box">{time.h}</div>
                        <span className="time-label">hr</span>
                    </div>
                    <span className="time-sep">:</span>
                    <div className="time-unit">
                        <div className="time-box">{time.m}</div>
                        <span className="time-label">min</span>
                    </div>
                    <span className="time-sep">:</span>
                    <div className="time-unit">
                        <div className="time-box primary">{time.s}</div>
                        <span className="time-label primary">sec</span>
                    </div>
                </div>

                <div className="speed-gauge">
                    <div className="gauge-ring" style={{
                        background: `conic-gradient(#f27f0d ${speed * 2.5}deg, rgba(242, 127, 13, 0.1) 0deg)`
                    }}>
                        <div className="gauge-inner">
                            <Icon name="speedometer" size={40} className="gauge-icon" />
                            <h1 className="speed-value">{speed}</h1>
                            <p className="speed-unit">km/h</p>
                        </div>
                    </div>
                </div>

                <div className="gps-stats-panel">
                    <div className="gps-stat-item">
                        <Icon name="gps" size={24} className="gps-stat-icon" />
                        <div>
                            <p className="gps-stat-label">ESTADO GPS</p>
                            <p className="gps-stat-value">{gpsStatus.active ? 'Activo' : 'Buscando...'}</p>
                        </div>
                    </div>
                    <div className="gps-stat-item">
                        <GPSSignalBars quality={gpsStatus.quality} />
                        <div>
                            <p className="gps-stat-label">CALIDAD</p>
                            <p className="gps-stat-value">{gpsStatus.quality}</p>
                        </div>
                    </div>
                    <div className="gps-stat-item">
                        <Icon name="satellite" size={24} className="gps-stat-icon" />
                        <div>
                            <p className="gps-stat-label">SATÉLITES</p>
                            <p className="gps-stat-value">{gpsStatus.satellites}</p>
                        </div>
                    </div>
                    <div className="gps-stat-item">
                        <Icon name="navigation" size={24} className="gps-stat-icon" />
                        <div>
                            <p className="gps-stat-label">PUNTOS</p>
                            <p className="gps-stat-value">{points.length}</p>
                        </div>
                    </div>
                </div>

                {currentPosition && (
                    <div className="map-section">
                        <div className="map-header">
                            <Icon name="navigation" size={20} className="map-icon" />
                            <span className="map-label">Ubicación actual</span>
                        </div>
                        <MapContainer
                            center={currentPosition}
                            zoom={16}
                            style={{ height: '220px', width: '100%', borderRadius: '1rem' }}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            />
                            <MapUpdater center={currentPosition} />
                            {pathCoordinates.length > 0 && (
                                <Polyline positions={pathCoordinates} pathOptions={{ color: '#f27f0d', weight: 4 }} />
                            )}
                            {currentPosition && (
                                <Marker position={currentPosition} />
                            )}
                        </MapContainer>
                    </div>
                )}

                <button onClick={handleStop} className="btn-primary large stop">
                    <Icon name="stop" size={20} className="btn-icon" />
                    FINALIZAR Y ENVIAR
                </button>
            </div>
        </div>
    );
}
