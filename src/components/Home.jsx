import { useState, useEffect } from 'react';
import { getRoutesFromSupabase } from '../services/routes';
import { Icon, GPSSignalBars } from './UI/Icons';
import AppLogo from '../assets/Images/nextcantrafico.png';

export default function HomeScreen({ onNavigate }) {
  const [routeName, setRouteName] = useState("");
  const [vehicleType, setVehicleType] = useState("Público");
  const [recentRoutes, setRecentRoutes] = useState([]);
  const [gpsQuality, setGpsQuality] = useState(null);

  useEffect(() => {
    loadRecentRoutes();
    checkGPS();
  }, []);

  const checkGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsQuality({
            status: 'Conectado y estable',
            precision: position.coords.accuracy < 20 ? 'Excelente'
              : position.coords.accuracy < 50 ? 'Buena'
                : position.coords.accuracy < 100 ? 'Media' : 'Baja',
            accuracy: position.coords.accuracy
          });
        },
        () => {
          setGpsQuality({ status: 'Sin señal', precision: 'Sin señal', accuracy: 0 });
        }
      );
    }
  };

  const loadRecentRoutes = async () => {
    const routes = await getRoutesFromSupabase();
    setRecentRoutes(routes.slice(0, 2));
  };

  const handleStart = () => {
    if (!routeName.trim()) {
      alert('Por favor ingresa un nombre para la ruta');
      return;
    }
    onNavigate('recording', { routeName, vehicleType });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="screen home-screen">
      <div className="header">
        <div className="logo-container">
          <img src={AppLogo} alt="Nextcan Tráfico" className="app-logo" />
        </div>
        <div className="header-buttons">
          <button onClick={() => onNavigate('satellites')} className="icon-button" title="Ver Satélites">
            <Icon name="satellite" size={20} />
          </button>
          <button onClick={() => onNavigate('routes')} className="icon-button" title="Mis Rutas">
            <Icon name="folder" size={20} />
          </button>
        </div>
      </div>

      <div className="content">
        <div className="badge">
          <span className="pulse-dot"></span>
          MODO CAPTURA
        </div>

        <h1 className="screen-title">Nueva Sesión</h1>
        <p className="screen-subtitle">Ingresa los detalles de la ruta para comenzar la recolección de datos de velocidad.</p>

        <div className="form-group">
          <label className="form-label">NOMBRE DE LA RUTA</label>
          <div className="input-wrapper">
            <span className="input-icon"><Icon name="route" size={20} /></span>
            <input
              type="text"
              className="input-field"
              placeholder="Ingresa el nombre de la ruta"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">TIPO DE VEHÍCULO</label>
          <div className="vehicle-type-selector">
            <button
              className={`vehicle-btn ${vehicleType === 'Público' ? 'active' : ''}`}
              onClick={() => setVehicleType('Público')}
            >
              <Icon name="bus" size={32} className="vehicle-icon" />
              <span>Público</span>
            </button>
            <button
              className={`vehicle-btn ${vehicleType === 'Privado' ? 'active' : ''}`}
              onClick={() => setVehicleType('Privado')}
            >
              <Icon name="car" size={32} className="vehicle-icon" />
              <span>Privado</span>
            </button>
          </div>
        </div>

        <div className="gps-status-card">
          <div className="gps-main">
            <div className="gps-icon-wrapper">
              <Icon name="gps" size={24} />
            </div>
            <div className="gps-info">
              <p className="gps-title">Señal GPS</p>
              <p className="gps-subtitle">{gpsQuality?.status || 'Verificando...'}</p>
              {gpsQuality?.accuracy > 0 && (
                <p className="gps-accuracy">Precisión: ±{gpsQuality.accuracy.toFixed(0)}m</p>
              )}
            </div>
          </div>
          <div className="gps-side">
            <p className="gps-quality-label">CALIDAD</p>
            <GPSSignalBars quality={gpsQuality?.precision || 'Sin señal'} />
            <p className="gps-quality-value">{gpsQuality?.precision || '...'}</p>
          </div>
        </div>

        <button onClick={handleStart} className="btn-primary large">
          <Icon name="play" size={20} className="btn-icon" />
          INICIAR ESTUDIO
        </button>
        <p className="btn-hint">Asegúrate de estar en el punto de inicio</p>

        {recentRoutes.length > 0 && (
          <div className="recent-routes">
            <div className="recent-header">
              <h3>RUTAS RECIENTES</h3>
              <button onClick={() => onNavigate('routes')} className="link-button">Ver todas</button>
            </div>
            <div className="routes-list-small">
              {recentRoutes.map((route) => (
                <div key={route.id} className="route-item-small" onClick={() => onNavigate('route-detail', route)}>
                  <Icon name="navigation" size={24} className="route-icon" />
                  <div className="route-info-small">
                    <p className="route-name-small">{route.name}</p>
                    <p className="route-meta-small">{formatDate(route.date)} • {Math.floor(route.duration / 60)} min</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
