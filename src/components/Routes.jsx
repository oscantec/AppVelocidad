import { useState, useEffect } from 'react';
import { getRoutesFromSupabase } from '../services/routes';
import { Icon } from './UI/Icons';

export default function RoutesScreen({ onNavigate }) {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    setLoading(true);
    const data = await getRoutesFromSupabase();
    setRoutes(data);
    setLoading(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="screen">
      <div className="header">
        <button onClick={() => onNavigate('home')} className="icon-button">
          <Icon name="back" size={24} />
        </button>
        <h2>Mis Rutas / GPX Trackers</h2>
        <button onClick={loadRoutes} className="icon-button">
          <Icon name="refresh" size={20} />
        </button>
      </div>

      <div className="content">
        {loading ? (
          <div className="empty-state">
            <span className="empty-icon loading">⏳</span>
            <p>Cargando rutas...</p>
          </div>
        ) : routes.length === 0 ? (
          <div className="empty-state">
            <Icon name="folder" size={80} className="empty-icon" />
            <p>No hay rutas guardadas</p>
            <button onClick={() => onNavigate('home')} className="btn-secondary">
              Crear primera ruta
            </button>
          </div>
        ) : (
          <div className="routes-grid">
            {routes.map((route) => (
              <div
                key={route.id}
                onClick={() => onNavigate('route-detail', route)}
                className="route-card"
              >
                <div className="route-card-header">
                  <h3 className="route-card-title">{route.name}</h3>
                  <Icon name="navigation" size={24} className="route-card-icon" />
                </div>
                <p className="route-card-date">{formatDate(route.date)}</p>
                <div className="route-card-stats">
                  <div className="route-stat">
                    <span className="route-stat-value">{route.distance} km</span>
                    <span className="route-stat-label">Distancia</span>
                  </div>
                  <div className="route-stat">
                    <span className="route-stat-value">{route.avg_speed} km/h</span>
                    <span className="route-stat-label">Velocidad</span>
                  </div>
                  <div className="route-stat">
                    <span className="route-stat-value">{Math.floor(route.duration / 60)} min</span>
                    <span className="route-stat-label">Duración</span>
                  </div>
                </div>
                {route.vehicle_type && (
                  <div className="route-vehicle-badge">
                    <Icon name={route.vehicle_type === 'Público' ? 'bus' : 'car'} size={16} />
                    {route.vehicle_type}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
