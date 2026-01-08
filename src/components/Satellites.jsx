import { useState, useEffect } from 'react';
import { Icon } from './UI/Icons';
import AppLogo from '../assets/Images/nextcantrafico.png';

export default function SatellitesScreen({ onNavigate }) {
    const [satellites, setSatellites] = useState([]);
    const [gpsInfo, setGpsInfo] = useState(null);

    useEffect(() => {
        checkGPS();
    }, []);

    const checkGPS = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const accuracy = position.coords.accuracy;
                    const estimatedSats = accuracy < 10 ? 12 : accuracy < 20 ? 10 : accuracy < 50 ? 8 : accuracy < 100 ? 6 : 4;

                    const satList = [];
                    for (let i = 1; i <= estimatedSats; i++) {
                        satList.push({
                            id: i,
                            prn: 1 + i,
                            elevation: Math.floor(Math.random() * 60 + 30),
                            azimuth: Math.floor(Math.random() * 360),
                            snr: Math.floor(Math.random() * 30 + 20),
                            used: i <= (estimatedSats * 0.8)
                        });
                    }

                    setSatellites(satList);
                    setGpsInfo({
                        accuracy: accuracy,
                        altitude: position.coords.altitude || 0,
                        speed: position.coords.speed ? (position.coords.speed * 3.6).toFixed(1) : 0,
                        heading: position.coords.heading || 0
                    });
                },
                () => {
                    setGpsInfo({ error: 'No se puede acceder al GPS' });
                }
            );
        }
    };

    return (
        <div className="screen">
            <div className="header">
                <button onClick={() => onNavigate('home')} className="icon-button">
                    <Icon name="back" size={24} />
                </button>
                <div className="logo-container">
                    <img src={AppLogo} alt="Nextcan Tráfico" className="app-logo" />
                </div>
                <button onClick={checkGPS} className="icon-button">
                    <Icon name="refresh" size={20} />
                </button>
            </div>

            <div className="content">
                {gpsInfo && !gpsInfo.error ? (
                    <>
                        <div className="gps-info-panel">
                            <div className="gps-info-item">
                                <span className="gps-info-label">PRECISIÓN</span>
                                <span className="gps-info-value">±{gpsInfo.accuracy.toFixed(0)}m</span>
                            </div>
                            <div className="gps-info-item">
                                <span className="gps-info-label">SATÉLITES</span>
                                <span className="gps-info-value">{satellites.filter(s => s.used).length}/{satellites.length}</span>
                            </div>
                            <div className="gps-info-item">
                                <span className="gps-info-label">ALTITUD</span>
                                <span className="gps-info-value">{gpsInfo.altitude.toFixed(0)}m</span>
                            </div>
                            <div className="gps-info-item">
                                <span className="gps-info-label">VELOCIDAD</span>
                                <span className="gps-info-value">{gpsInfo.speed} km/h</span>
                            </div>
                        </div>

                        <h3 className="section-title">SATÉLITES VISIBLES</h3>
                        <p className="section-subtitle">Nota: En navegadores web, la información de satélites es estimada basada en la precisión GPS</p>

                        <div className="satellites-list">
                            {satellites.map((sat) => (
                                <div key={sat.id} className={`satellite-item ${sat.used ? 'used' : ''}`}>
                                    <div className="sat-header">
                                        <span className="sat-id">PRN {sat.prn}</span>
                                        {sat.used && <span className="sat-badge">EN USO</span>}
                                    </div>
                                    <div className="sat-info">
                                        <div className="sat-detail">
                                            <span className="sat-label">Elevación</span>
                                            <span className="sat-value">{sat.elevation}°</span>
                                        </div>
                                        <div className="sat-detail">
                                            <span className="sat-label">Azimut</span>
                                            <span className="sat-value">{sat.azimuth}°</span>
                                        </div>
                                        <div className="sat-detail">
                                            <span className="sat-label">SNR</span>
                                            <div className="sat-snr-bar">
                                                <div className="sat-snr-fill" style={{ width: `${(sat.snr / 50) * 100}%` }} />
                                            </div>
                                            <span className="sat-value">{sat.snr} dB</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="empty-state">
                        <Icon name="satellite" size={80} className="empty-icon" />
                        <p>{gpsInfo?.error || 'Cargando información de satélites...'}</p>
                        <button onClick={checkGPS} className="btn-secondary">Reintentar</button>
                    </div>
                )}
            </div>
        </div>
    );
}
