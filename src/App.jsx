import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

// Supabase Configuration
const SUPABASE_URL = 'https://ggzibmendycytqafzxci.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PvH5aWjH1zabWFKnUlalsw_q7NaBNBz';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [screenData, setScreenData] = useState(null);

  const navigate = (screen, data) => {
    setCurrentScreen(screen);
    setScreenData(data);
  };

  return (
    <div className="app-container">
      {currentScreen === 'home' && <HomeScreen onNavigate={navigate} />}
      {currentScreen === 'recording' && <RecordingScreen onNavigate={navigate} routeName={screenData} supabase={supabase} />}
      {currentScreen === 'routes' && <RoutesScreen onNavigate={navigate} supabase={supabase} />}
      {currentScreen === 'route-detail' && <RouteDetailScreen onNavigate={navigate} route={screenData} />}
    </div>
  );
}

// HOME SCREEN
function HomeScreen({ onNavigate }) {
  const [routeName, setRouteName] = useState("");

  const handleStart = () => {
    if (!routeName.trim()) {
      alert('Por favor ingresa un nombre para la ruta');
      return;
    }
    onNavigate('recording', routeName);
  };

  return (
    <div className="screen">
      <div className="header">
        <h2>TrafficSpeed Analytics</h2>
        <div className="header-buttons">
          <button onClick={() => onNavigate('routes')} className="icon-button">📁</button>
          <button className="icon-button">⚙️</button>
        </div>
      </div>
      
      <div className="content">
        <div className="badge">
          <span className="pulse-dot"></span>
          MODO CAPTURA
        </div>
        <h1>Nueva Sesión</h1>
        <p className="subtitle">Ingresa el nombre de la ruta para comenzar.</p>
        
        <input 
          type="text"
          className="input-field"
          placeholder="Ej. Av. Reforma - Norte" 
          value={routeName}
          onChange={(e) => setRouteName(e.target.value)}
        />
        
        <div className="gps-status">
          <div className="gps-icon">📡</div>
          <div>
            <p className="gps-title">Señal GPS</p>
            <p className="gps-subtitle">Conectado y estable</p>
          </div>
          <div className="gps-quality">Alta</div>
        </div>
        
        <button onClick={handleStart} className="btn-primary">
          ▶ INICIAR ESTUDIO
        </button>
      </div>
    </div>
  );
}

// RECORDING SCREEN
function RecordingScreen({ onNavigate, routeName, supabase }) {
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [points, setPoints] = useState([]);
  const [distance, setDistance] = useState(0);

  // Timer Effect
  useState(() => {
    const interval = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return { h, m, s };
  };

  const handleStop = async () => {
    const time = formatTime(duration);
    alert(`✅ Ruta "${routeName}" guardada!\nDuración: ${time.h}:${time.m}:${time.s}`);
    onNavigate('routes');
  };

  const time = formatTime(duration);

  return (
    <div className="screen">
      <div className="header">
        <button onClick={() => onNavigate('home')} className="back-button">←</button>
        <h2>{routeName}</h2>
        <div></div>
      </div>
      
      <div className="content">
        <div className="timer">
          <p className="timer-label">TIEMPO TRANSCURRIDO</p>
          <div className="timer-display">
            <div className="time-unit">
              <div className="time-box">{time.h}</div>
              <span>hr</span>
            </div>
            <span className="time-sep">:</span>
            <div className="time-unit">
              <div className="time-box">{time.m}</div>
              <span>min</span>
            </div>
            <span className="time-sep">:</span>
            <div className="time-unit">
              <div className="time-box primary">{time.s}</div>
              <span>sec</span>
            </div>
          </div>
        </div>

        <div className="speed-gauge">
          <div className="gauge-circle">
            <span className="gauge-icon">⚡</span>
            <h1 className="speed-value">{speed}</h1>
            <p className="speed-unit">km/h</p>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span>📍</span>
            <p className="stat-label">Puntos</p>
            <p className="stat-value">{points.length}</p>
          </div>
          <div className="stat-card">
            <span>🛣️</span>
            <p className="stat-label">Distancia</p>
            <p className="stat-value">{distance.toFixed(1)} km</p>
          </div>
          <div className="stat-card">
            <span>⚡</span>
            <p className="stat-label">Máxima</p>
            <p className="stat-value">{maxSpeed}</p>
          </div>
        </div>

        <button onClick={handleStop} className="btn-primary">
          ⏹ FINALIZAR Y GUARDAR
        </button>
      </div>
    </div>
  );
}

// ROUTES SCREEN
function RoutesScreen({ onNavigate, supabase }) {
  return (
    <div className="screen">
      <div className="header">
        <button onClick={() => onNavigate('home')} className="back-button">←</button>
        <h2>Mis Rutas</h2>
        <button className="icon-button">🔄</button>
      </div>
      
      <div className="content">
        <div className="empty-state">
          <span className="empty-icon">🗺️</span>
          <p>No hay rutas guardadas</p>
          <button onClick={() => onNavigate('home')} className="btn-secondary">
            Crear primera ruta
          </button>
        </div>
      </div>
    </div>
  );
}

// ROUTE DETAIL SCREEN
function RouteDetailScreen({ onNavigate, route }) {
  return (
    <div className="screen">
      <div className="header">
        <button onClick={() => onNavigate('routes')} className="back-button">←</button>
        <h2>Detalle de Ruta</h2>
        <div></div>
      </div>
      
      <div className="content">
        <p>Detalles de la ruta...</p>
      </div>
    </div>
  );
}

export default App;
