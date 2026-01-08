import { useState } from 'react';
import { Icon } from '../UI/Icons';
import AppLogo from '../../assets/Images/nextcantrafico.png';
import MasterRoutesList from './MasterRoutesList';
import MasterRouteEditor from './MasterRouteEditor';
import AnalysisWorkspace from './AnalysisWorkspace';

export default function OficinaDashboard({ onBack }) {
    const [activeSection, setActiveSection] = useState('dashboard');
    const [selectedRoute, setSelectedRoute] = useState(null);

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: 'home' },
        { id: 'master-routes', label: 'Rutas Maestras', icon: 'map' },
        { id: 'analysis', label: 'Tramificación', icon: 'analytics' },
        { id: 'results', label: 'Resultados', icon: 'table' },
    ];

    const handleEditRoute = (route) => {
        setSelectedRoute(route);
        setActiveSection('edit-route');
    };

    const handleNewRoute = () => {
        setSelectedRoute(null);
        setActiveSection('edit-route');
    };

    const handleBackFromEditor = () => {
        setActiveSection('master-routes');
        setSelectedRoute(null);
    };

    const renderContent = () => {
        switch (activeSection) {
            case 'dashboard':
                return <DashboardContent onNavigate={setActiveSection} />;
            case 'master-routes':
                return (
                    <MasterRoutesList
                        onEdit={handleEditRoute}
                        onNew={handleNewRoute}
                    />
                );
            case 'edit-route':
                return (
                    <MasterRouteEditor
                        route={selectedRoute}
                        onBack={handleBackFromEditor}
                    />
                );
            case 'analysis':
                return <AnalysisWorkspace />;
            case 'results':
                return <ResultsContent />;
            default:
                return <DashboardContent onNavigate={setActiveSection} />;
        }
    };

    return (
        <div className="oficina-container">
            <aside className="oficina-sidebar">
                <div className="sidebar-header">
                    <img src={AppLogo} alt="Nextcan Tráfico" className="sidebar-logo" />
                    <p className="sidebar-subtitle">Oficina de Análisis</p>
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            className={`sidebar-item ${activeSection === item.id ? 'active' : ''}`}
                            onClick={() => setActiveSection(item.id)}
                        >
                            <Icon name={item.icon} size={20} />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button className="sidebar-back" onClick={onBack}>
                        <Icon name="back" size={18} />
                        <span>Volver al Inicio</span>
                    </button>
                </div>
            </aside>

            <main className="oficina-main">
                {renderContent()}
            </main>
        </div>
    );
}

// Dashboard Content
function DashboardContent({ onNavigate }) {
    return (
        <div className="oficina-content">
            <div className="oficina-header">
                <h1 className="oficina-title">Panel de Control</h1>
                <p className="oficina-subtitle">Resumen de actividad y accesos rápidos</p>
            </div>

            <div className="dashboard-cards">
                <div className="dash-card" onClick={() => onNavigate('master-routes')}>
                    <div className="dash-card-icon">
                        <Icon name="map" size={32} />
                    </div>
                    <div className="dash-card-info">
                        <h3>Rutas Maestras</h3>
                        <p>Definir segmentos de control y puertas virtuales</p>
                    </div>
                    <Icon name="navigation" size={20} className="dash-card-arrow" />
                </div>

                <div className="dash-card" onClick={() => onNavigate('analysis')}>
                    <div className="dash-card-icon">
                        <Icon name="analytics" size={32} />
                    </div>
                    <div className="dash-card-info">
                        <h3>Tramificación</h3>
                        <p>Cruzar GPX con rutas patrón y calcular velocidades</p>
                    </div>
                    <Icon name="navigation" size={20} className="dash-card-arrow" />
                </div>

                <div className="dash-card" onClick={() => onNavigate('results')}>
                    <div className="dash-card-icon">
                        <Icon name="table" size={32} />
                    </div>
                    <div className="dash-card-info">
                        <h3>Resultados</h3>
                        <p>Ver consolidado de velocidades por grupo</p>
                    </div>
                    <Icon name="navigation" size={20} className="dash-card-arrow" />
                </div>
            </div>

            <div className="dashboard-info">
                <h2>Metodología Trafing</h2>
                <p>
                    El sistema utiliza la fórmula <strong>V = d/t</strong> donde la distancia teórica
                    de la Ruta Maestra es la que prevalece sobre la medición GPS, eliminando
                    errores de precisión del dispositivo.
                </p>
                <div className="methodology-steps">
                    <div className="method-step">
                        <span className="step-number">1</span>
                        <span>Definir Ruta Maestra con Hitos A y B</span>
                    </div>
                    <div className="method-step">
                        <span className="step-number">2</span>
                        <span>Seleccionar muestras GPX de campo</span>
                    </div>
                    <div className="method-step">
                        <span className="step-number">3</span>
                        <span>Ejecutar tramificación (snapping)</span>
                    </div>
                    <div className="method-step">
                        <span className="step-number">4</span>
                        <span>Obtener velocidades y promedios</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Results Content (placeholder)
function ResultsContent() {
    return (
        <div className="oficina-content">
            <div className="oficina-header">
                <h1 className="oficina-title">Resultados Consolidados</h1>
                <p className="oficina-subtitle">Velocidades calculadas agrupadas por tipo de vehículo, período y sentido</p>
            </div>

            <div className="empty-state oficina-empty">
                <Icon name="table" size={64} className="empty-icon" />
                <p>No hay resultados de análisis todavía</p>
                <p className="empty-hint">Ejecuta una tramificación para ver los resultados aquí</p>
            </div>
        </div>
    );
}
