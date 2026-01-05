import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

// Supabase Configuration
const SUPABASE_URL = 'https://ggzibmendycytqafzxci.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PvH5aWjH1zabWFKnUlalsw_q7NaBNBz';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// GPX Generator
const generateGPX = (routeData) => {
  const { name, points, startTime } = routeData;

  let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="TrafficSpeed Analytics">
  <metadata>
    <name>${name}</name>
    <time>${startTime}</time>
  </metadata>
  <trk>
    <name>${name}</name>
    <trkseg>
`;

  points.forEach(point => {
    gpxContent += `      <trkpt lat="${point.lat}" lon="${point.lon}">
        <ele>${point.ele || 0}</ele>
        <time>${point.time}</time>
        <extensions>
          <speed>${point.speed}</speed>
        </extensions>
      </trkpt>
`;
  });

  gpxContent += `    </trkseg>
  </trk>
</gpx>`;

  return gpxContent;
};

// Save to Supabase
const saveRouteToSupabase = async (routeData, gpxContent) => {
  try {
    const routeId = Date.now().toString();
    const fileName = `route_${routeId}.gpx`;

    // Upload GPX to Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('gpx-files')
      .upload(fileName, new Blob([gpxContent], { type: 'application/gpx+xml' }), {
        contentType: 'application/gpx+xml',
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('gpx-files')
      .getPublicUrl(fileName);

    // Save metadata to Database
    const { data: dbData, error: dbError } = await supabase
      .from('routes')
      .insert([{
        id: routeId,
        name: routeData.name,
        date: new Date().toISOString(),
        duration: routeData.duration,
        distance: parseFloat(routeData.distance),
        avg_speed: parseFloat(routeData.avgSpeed),
        max_speed: routeData.maxSpeed,
        points: routeData.pointsCount,
        gpx_url: urlData.publicUrl,
        created_at: new Date().toISOString()
      }])
      .select();

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    return { success: true, routeId, data: dbData };
  } catch (error) {
    console.error('Error saving route:', error);
    return { success: false, error };
  }
};

// Get routes from Supabase
const getRoutesFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching routes:', error);
    return [];
  }
};

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
      {currentScreen === 'recording' && <RecordingScreen onNavigate={navigate} routeName={screenData} />}
      {currentScreen === 'routes' && <RoutesScreen onNavigate={navigate} />}
      {currentScreen === 'route-detail' && <RouteDetailScreen onNavigate={navigate} route={screenData} />}
    </div>
  );
}

// HOME SCREEN
function HomeScreen({ onNavigate }) {
  const [routeName, setRouteName] = useState("");
  const [recentRoutes, setRecentRoutes] = useState([]);

  useEffect(() => {
    loadRecentRoutes();
  }, []);

  const loadRecentRoutes = async () => {
    const routes = await getRoutesFromSupabase();
    setRecentRoutes(routes.slice(0, 2)); // Solo las 2 más recientes
  };

  const handleStart = () => {
    if (!routeName.trim()) {
      alert('Por favor ingresa un nombre para la ruta');
      return;
    }
    onNavigate('recording', routeName);
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
        <h2 className="app-title">TrafficSpeed Analytics</h2>
        <button className="icon-button settings">⚙️</button>
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
            <span className="input-icon">📝</span>
            <input
              type="text"
              className="input-field"
              placeholder="Ej. Av. Reforma - Norte"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
            />
          </div>
        </div>

        <div className="gps-status-card">
          <div className="gps-main">
            <div className="gps-icon-wrapper">
              <span className="gps-icon">📡</span>
            </div>
            <div className="gps-info">
              <p className="gps-title">Señal GPS</p>
              <p className="gps-subtitle">Conectado y estable</p>
            </div>
          </div>
          <div className="gps-side">
            <p className="gps-quality-label">PRECISIÓN</p>
            <p className="gps-quality-value">Alta</p>
          </div>
        </div>

        <button onClick={handleStart} className="btn-primary large">
          <span className="btn-icon">▶</span>
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
                  <span className="route-icon">🔄</span>
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

// RECORDING SCREEN with REAL GPS
function RecordingScreen({ onNavigate, routeName }) {
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [points, setPoints] = useState([]);
  const [distance, setDistance] = useState(0);
  const [gpsActive, setGpsActive] = useState(false);
  const startTimeRef = useRef(new Date().toISOString());
  const watchIdRef = useRef(null);

  // Timer Effect
  useEffect(() => {
    const interval = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // GPS Tracking
  useEffect(() => {
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setGpsActive(true);
          const { latitude, longitude, altitude, speed: gpsSpeed } = position.coords;
          const currentSpeed = gpsSpeed ? Math.round(gpsSpeed * 3.6) : 0; // m/s to km/h

          setSpeed(currentSpeed);
          setMaxSpeed(prev => Math.max(prev, currentSpeed));

          const newPoint = {
            lat: latitude,
            lon: longitude,
            ele: altitude || 0,
            speed: currentSpeed,
            time: new Date().toISOString()
          };

          setPoints(prev => {
            const updated = [...prev, newPoint];

            // Calculate distance if we have previous points
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
          setGpsActive(false);
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
    const R = 6371; // Earth radius in km
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
      alert('⚠️ No se capturaron puntos GPS. Asegúrate de tener señal GPS activa.');
      onNavigate('home');
      return;
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
      maxSpeed: maxSpeed
    };

    const gpxContent = generateGPX(routeData);
    const result = await saveRouteToSupabase(routeData, gpxContent);

    if (result.success) {
      alert(`✅ Ruta "${routeName}" guardada exitosamente!\n\n📊 Estadísticas:\n• ${points.length} puntos GPS\n• ${distance.toFixed(2)} km\n• ${avgSpeed.toFixed(1)} km/h promedio`);
      onNavigate('routes');
    } else {
      alert('❌ Error al guardar la ruta en Supabase.\n\n' + (result.error && result.error.message || 'Error desconocido') + '\n\nVerifica tu conexión y configuración de Supabase.');
      onNavigate('home');
    }
  };

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return { h, m, s };
  };

  const time = formatTime(duration);

  return (
    <div className="screen recording-screen">
      <div className="header">
        <button onClick={() => onNavigate('home')} className="back-button">←</button>
        <h2>Grabación de Estudio</h2>
        <button className="icon-button">⚙️</button>
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
              <span className="gauge-icon">⚡</span>
              <h1 className="speed-value">{speed}</h1>
              <p className="speed-unit">km/h</p>
            </div>
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-card-compact">
            <span className="stat-icon-compact">📡</span>
            <div className="stat-content-compact">
              <p className="stat-label-compact">ESTADO GPS</p>
              <p className="stat-value-compact">{gpsActive ? 'Activo' : 'Buscando...'}</p>
            </div>
          </div>
          <div className="stat-card-compact">
            <span className="stat-icon-compact">📍</span>
            <div className="stat-content-compact">
              <p className="stat-label-compact">PUNTOS CAPTURADOS</p>
              <p className="stat-value-compact">{points.length}</p>
            </div>
          </div>
        </div>

        <button onClick={handleStop} className="btn-primary large stop">
          <span className="btn-icon">⏹</span>
          FINALIZAR Y ENVIAR
        </button>
      </div>
    </div>
  );
}

// ROUTES SCREEN
function RoutesScreen({ onNavigate }) {
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
        <button onClick={() => onNavigate('home')} className="back-button">←</button>
        <h2>Mis Rutas</h2>
        <button onClick={loadRoutes} className="icon-button">🔄</button>
      </div>

      <div className="content">
        {loading ? (
          <div className="empty-state">
            <span className="empty-icon loading">⏳</span>
            <p>Cargando rutas...</p>
          </div>
        ) : routes.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🗺️</span>
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
                  <span className="route-card-icon">→</span>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ROUTE DETAIL SCREEN
function RouteDetailScreen({ onNavigate, route }) {
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

  return (
    <div className="screen">
      <div className="header">
        <button onClick={() => onNavigate('routes')} className="back-button">←</button>
        <h2>{route.name}</h2>
        <div></div>
      </div>

      <div className="content detail-content">
        <div className="detail-stats-grid">
          <div className="detail-stat-card">
            <span className="detail-stat-icon">🛣️</span>
            <p className="detail-stat-label">Distancia</p>
            <p className="detail-stat-value">{route.distance} <span className="detail-stat-unit">km</span></p>
          </div>
          <div className="detail-stat-card">
            <span className="detail-stat-icon">⚡</span>
            <p className="detail-stat-label">Velocidad Promedio</p>
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
            <span className="detail-stat-icon">📍</span>
            <p className="detail-stat-label">Puntos GPS</p>
            <p className="detail-stat-value">{route.points}</p>
          </div>
        </div>

        <a
          href={route.gpx_url}
          download={`${route.name}.gpx`}
          className="btn-primary"
        >
          <span className="btn-icon">⬇</span>
          Descargar GPX
        </a>
      </div>
    </div>
  );
}

export default App;
