import { Icon } from './UI/Icons';
import AppLogo from '../assets/Images/nextcantrafico.png';

export default function ModuleSelector({ onSelectModule }) {
    return (
        <div className="screen module-selector-screen">
            <div className="module-selector-content">
                <div className="module-header">
                    <img src={AppLogo} alt="Nextcan Tráfico" className="module-logo" />
                    <h1 className="module-title">TrafficSpeed Analytics</h1>
                    <p className="module-subtitle">Sistema de Análisis de Velocidades de Tránsito</p>
                </div>

                <div className="module-cards">
                    <div
                        className="module-card campo-card"
                        onClick={() => onSelectModule('campo')}
                    >
                        <div className="module-card-icon">
                            <Icon name="gps" size={48} />
                        </div>
                        <h2 className="module-card-title">Captura en Campo</h2>
                        <p className="module-card-desc">
                            APK móvil para recolección de datos GPS.
                            Activa el GPS, registra tracks y guarda archivos GPX.
                        </p>
                        <div className="module-card-features">
                            <span className="feature-tag">📍 GPS en tiempo real</span>
                            <span className="feature-tag">📁 Guardado GPX</span>
                            <span className="feature-tag">📱 Móvil/Tablet</span>
                        </div>
                        <button className="btn-primary module-btn">
                            <Icon name="play" size={16} />
                            INICIAR CAPTURA
                        </button>
                    </div>

                    <div
                        className="module-card oficina-card"
                        onClick={() => onSelectModule('oficina')}
                    >
                        <div className="module-card-icon">
                            <Icon name="analytics" size={48} />
                        </div>
                        <h2 className="module-card-title">Oficina de Análisis</h2>
                        <p className="module-card-desc">
                            Herramienta de escritorio para procesamiento de datos.
                            Tramificación, cálculo de velocidades y reportes.
                        </p>
                        <div className="module-card-features">
                            <span className="feature-tag">📊 Análisis de datos</span>
                            <span className="feature-tag">🗺️ Rutas Maestras</span>
                            <span className="feature-tag">🖥️ Desktop</span>
                        </div>
                        <button className="btn-secondary module-btn">
                            <Icon name="folder" size={16} />
                            ABRIR OFICINA
                        </button>
                    </div>
                </div>

                <p className="module-footer">
                    Metodología Trafing • Ingeniería de Tránsito
                </p>
            </div>
        </div>
    );
}
