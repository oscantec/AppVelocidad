import { useState, useEffect } from 'react';
import { Icon } from '../UI/Icons';
import { getMasterRoutes, deleteMasterRoute } from '../../services/masterRoutes';

export default function MasterRoutesList({ onEdit, onNew }) {
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRoutes();
    }, []);

    const loadRoutes = async () => {
        setLoading(true);
        const data = await getMasterRoutes();
        setRoutes(data);
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar esta ruta maestra?')) {
            await deleteMasterRoute(id);
            loadRoutes();
        }
    };

    if (loading) {
        return (
            <div className="oficina-content">
                <div className="oficina-header">
                    <h1 className="oficina-title">Rutas Maestras</h1>
                </div>
                <div className="empty-state oficina-empty">
                    <Icon name="route" size={48} className="empty-icon loading" />
                    <p>Cargando rutas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="oficina-content">
            <div className="oficina-header">
                <div className="header-with-action">
                    <div>
                        <h1 className="oficina-title">Rutas Maestras</h1>
                        <p className="oficina-subtitle">
                            Segmentos de control con Hitos A y B para tramificación
                        </p>
                    </div>
                    <button className="btn-primary" onClick={onNew}>
                        <Icon name="plus" size={18} />
                        Nueva Ruta Maestra
                    </button>
                </div>
            </div>

            {routes.length === 0 ? (
                <div className="empty-state oficina-empty">
                    <Icon name="map" size={64} className="empty-icon" />
                    <p>No hay rutas maestras definidas</p>
                    <p className="empty-hint">
                        Crea tu primera ruta maestra para comenzar a tramificar
                    </p>
                    <button className="btn-primary" onClick={onNew}>
                        <Icon name="plus" size={18} />
                        Crear Ruta Maestra
                    </button>
                </div>
            ) : (
                <div className="master-routes-grid">
                    {routes.map((route) => (
                        <div key={route.id} className="master-route-card">
                            <div className="mr-card-header">
                                <h3 className="mr-card-title">{route.name}</h3>
                                <div className="mr-card-actions">
                                    <button
                                        className="icon-button-small"
                                        onClick={() => onEdit(route)}
                                        title="Editar"
                                    >
                                        <Icon name="settings" size={16} />
                                    </button>
                                    <button
                                        className="icon-button-small danger"
                                        onClick={() => handleDelete(route.id)}
                                        title="Eliminar"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>

                            {route.description && (
                                <p className="mr-card-desc">{route.description}</p>
                            )}

                            <div className="mr-card-hitos">
                                <div className="hito-badge hito-a">
                                    <span className="hito-label">A</span>
                                    <span className="hito-name">{route.hito_a_name || 'Punto A'}</span>
                                </div>
                                <div className="hito-connector">
                                    <div className="connector-line"></div>
                                    <span className="connector-distance">
                                        {route.theoretical_distance?.toLocaleString()} m
                                    </span>
                                </div>
                                <div className="hito-badge hito-b">
                                    <span className="hito-label">B</span>
                                    <span className="hito-name">{route.hito_b_name || 'Punto B'}</span>
                                </div>
                            </div>

                            <div className="mr-card-meta">
                                <span className="meta-item">
                                    <Icon name="navigation" size={14} />
                                    {route.direction || 'Sin sentido'}
                                </span>
                                <span className="meta-item">
                                    <Icon name="route" size={14} />
                                    {route.road_type || 'Vía'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
