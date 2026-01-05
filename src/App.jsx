import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { GoogleMap, useJsApiLoader, Polyline, Marker } from '@react-google-maps/api';
import './App.css';

// Supabase Configuration
const SUPABASE_URL = 'https://ggzibmendycytqafzxci.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PvH5aWjH1zabWFKnUlalsw_q7NaBNBz';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = 'AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8';

// Temporary credentials
const TEMP_USER = 'oscar';
const TEMP_PASS = '123';

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

    console.log('📤 Subiendo GPX a storage...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('gpx-files')
      .upload(fileName, new Blob([gpxContent], { type: 'application/gpx+xml' }), {
        contentType: 'application/gpx+xml',
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('❌ Error en storage:', uploadError);
      throw uploadError;
    }

    console.log('✅ GPX subido, obteniendo URL...');
    const { data: urlData } = supabase.storage
      .from('gpx-files')
      .getPublicUrl(fileName);

    console.log('💾 Guardando metadata en base de datos...');
    const routeRecord = {
      id: routeId,
      name: routeData.name,
      date: new Date().toISOString(),
      duration: routeData.duration,
      distance: parseFloat(routeData.distance),
      avg_speed: parseFloat(routeData.avgSpeed),
      max_speed: routeData.maxSpeed,
      points: routeData.pointsCount,
      gpx_url: urlData.publicUrl,
      vehicle_type: routeData.vehicleType || 'Público'
    };

    console.log('📋 Datos a insertar:', routeRecord);

    const { data: dbData, error: dbError } = await supabase
      .from('routes')
      .insert([routeRecord])
      .select();

    if (dbError) {
      console.error('❌ Error en base de datos:', dbError);
      console.error('Detalles completos:', JSON.stringify(dbError, null, 2));
      throw dbError;
    }

    console.log('✅ Ruta guardada exitosamente:', dbData);
    return { success: true, routeId, data: dbData };
  } catch (error) {
    console.error('💥 Error completo:', error);
    console.error('Tipo de error:', error.constructor.name);
    console.error('Mensaje:', error.message);
    console.error('Detalles:', error.details);
    console.error('Hint:', error.hint);
    console.error('Code:', error.code);
    return { success: false, error };
  }
};

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

const getRouteGPX = async (gpxUrl) => {
  try {
    const response = await fetch(gpxUrl);
    return await response.text();
  } catch (error) {
    console.error('Error fetching GPX:', error);
    return null;
  }
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('home');
  const [screenData, setScreenData] = useState(null);

  const navigate = (screen, data) => {
    setCurrentScreen(screen);
    setScreenData(data);
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="app-container">
      {currentScreen === 'home' && <HomeScreen onNavigate={navigate} />}
      {currentScreen === 'recording' && <RecordingScreen onNavigate={navigate} routeConfig={screenData} />}
      {currentScreen === 'routes' && <RoutesScreen onNavigate={navigate} />}
      {currentScreen === 'route-detail' && <RouteDetailScreen onNavigate={navigate} route={screenData} />}
      {currentScreen === 'satellites' && <SatellitesScreen onNavigate={navigate} />}
    </div>
  );
}

// LOGIN SCREEN
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (username === TEMP_USER && password === TEMP_PASS) {
      onLogin();
    } else {
      setError('Usuario o contraseña incorrectos');
    }
  };

  return (
    <div className="screen login-screen">
      <div className="login-content">
        <div className="login-header">
          <h1 className="login-title">TrafficSpeed Analytics</h1>
          <p className="login-subtitle">Sistema de Captura GPS</p>
        </div>

        <div className="login-form">
          <div className="form-group">
            <label className="form-label">USUARIO</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ingresa tu usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <div className="form-group">
            <label className="form-label">CONTRASEÑA</label>
            <input
              type="password"
              className="input-field"
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button onClick={handleLogin} className="btn-primary large">
            INICIAR SESIÓN
          </button>

          <div className="login-hint">
            <p className="hint-title">💡 Credenciales temporales:</p>
            <p className="hint-text">Usuario: <strong>oscar</strong> | Contraseña: <strong>123</strong></p>
            <p className="hint-note">*En futuras versiones se implementará autenticación con Supabase</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// GPS Signal Bars Component
function GPSSignalBars({ quality }) {
  const bars = quality === 'Excelente' ? 5 : quality === 'Buena' ? 4 : quality === 'Media' ? 3 : quality === 'Baja' ? 2 : 1;

  return (
    <div className="signal-bars">
      {[1, 2, 3, 4, 5].map((bar) => (
        <div
          key={bar}
          className={`signal-bar ${bar <= bars ? 'active' : ''}`}
          style={{ height: `${bar * 20}%` }}
        />
      ))}
    </div>
  );
}

// HOME SCREEN
function HomeScreen({ onNavigate }) {
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
            precision: position.coords.accuracy < 20 ? 'Excelente' : position.coords.accuracy < 50 ? 'Buena' : position.coords.accuracy < 100 ? 'Media' : 'Baja',
            accuracy: position.coords.accuracy
          });
        },
        () => {
          setGpsQuality({
            status: 'Sin señal',
            precision: 'Sin señal',
            accuracy: 0
          });
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
        <h2 className="app-title">TrafficSpeed Analytics</h2>
        <div className="header-buttons">
          <button onClick={() => onNavigate('satellites')} className="icon-button" title="Ver Satélites">
            🛰️
          </button>
          <button onClick={() => onNavigate('routes')} className="icon-button" title="Mis Rutas">
            📁
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
            <span className="input-icon">📝</span>
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
              <span className="vehicle-icon">🚌</span>
              <span>Público</span>
            </button>
            <button
              className={`vehicle-btn ${vehicleType === 'Privado' ? 'active' : ''}`}
              onClick={() => setVehicleType('Privado')}
            >
              <span className="vehicle-icon">🚗</span>
              <span>Privado</span>
            </button>
          </div>
        </div>

        <div className="gps-status-card">
          <div className="gps-main">
            <div className="gps-icon-wrapper">
              <span className="gps-icon">📡</span>
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

// SATELLITES SCREEN
function SatellitesScreen({ onNavigate }) {
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

          // Simular satélites (en web no hay acceso directo a info de satélites)
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
        <button onClick={() => onNavigate('home')} className="back-button">←</button>
        <h2>Satélites GPS</h2>
        <button onClick={checkGPS} className="icon-button">🔄</button>
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
                        <div
                          className="sat-snr-fill"
                          style={{ width: `${(sat.snr / 50) * 100}%` }}
                        />
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
            <span className="empty-icon">🛰️</span>
            <p>{gpsInfo?.error || 'Cargando información de satélites...'}</p>
            <button onClick={checkGPS} className="btn-secondary">Reintentar</button>
          </div>
        )}
      </div>
    </div>
  );
}

// RECORDING SCREEN (sin cambios mayores, solo ajustes menores)
function RecordingScreen({ onNavigate, routeConfig }) {
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
  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

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
          setCurrentPosition({ lat: latitude, lng: longitude });

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

    console.log('📊 Guardando ruta:', points.length, 'puntos,', distance.toFixed(2), 'km');

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

  const mapContainerStyle = {
    width: '100%',
    height: '220px',
    borderRadius: '1rem',
    overflow: 'hidden'
  };

  const mapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    styles: [
      { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
      { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
      { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
      { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] }
    ]
  };

  const pathCoordinates = points.map(p => ({ lat: p.lat, lng: p.lon }));

  return (
    <div className="screen recording-screen">
      <div className="header">
        <button onClick={() => onNavigate('home')} className="back-button">←</button>
        <h2>Grabación de Estudio</h2>
        <button onClick={() => onNavigate('satellites')} className="icon-button">🛰️</button>
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

        <div className="gps-stats-panel">
          <div className="gps-stat-item">
            <span className="gps-stat-icon">📡</span>
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
            <span className="gps-stat-icon">🛰️</span>
            <div>
              <p className="gps-stat-label">SATÉLITES</p>
              <p className="gps-stat-value">{gpsStatus.satellites}</p>
            </div>
          </div>
          <div className="gps-stat-item">
            <span className="gps-stat-icon">📍</span>
            <div>
              <p className="gps-stat-label">PUNTOS</p>
              <p className="gps-stat-value">{points.length}</p>
            </div>
          </div>
        </div>

        {isLoaded && currentPosition && (
          <div className="map-section">
            <div className="map-header">
              <span className="map-icon">📍</span>
              <span className="map-label">Ubicación actual</span>
            </div>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={currentPosition}
              zoom={16}
              options={mapOptions}
              onLoad={map => { mapRef.current = map; }}
            >
              {pathCoordinates.length > 0 && (
                <Polyline
                  path={pathCoordinates}
                  options={{
                    strokeColor: '#f27f0d',
                    strokeOpacity: 1,
                    strokeWeight: 4
                  }}
                />
              )}
              {currentPosition && (
                <Marker
                  position={currentPosition}
                  icon={{
                    path: window.google.maps.SymbolPath.CIRCLE,
                    fillColor: '#22c55e',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 3,
                    scale: 10
                  }}
                />
              )}
            </GoogleMap>
          </div>
        )}

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
        <h2>Mis Rutas / GPX Trackers</h2>
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
                {route.vehicle_type && (
                  <div className="route-vehicle-badge">
                    {route.vehicle_type === 'Público' ? '🚌' : '🚗'} {route.vehicle_type}
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

// ROUTE DETAIL SCREEN with MAP
function RouteDetailScreen({ onNavigate, route }) {
  const [gpxData, setGpxData] = useState(null);
  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  useEffect(() => {
    if (route && route.gpx_url) {
      loadGPXData();
    }
  }, [route]);

  const loadGPXData = async () => {
    const gpxText = await getRouteGPX(route.gpx_url);
    if (!gpxText) return;

    const parser = new DOMParser();
    const gpxDoc = parser.parseFromString(gpxText, 'text/xml');
    const trkpts = gpxDoc.querySelectorAll('trkpt');

    const coords = Array.from(trkpts).map(pt => ({
      lat: parseFloat(pt.getAttribute('lat')),
      lng: parseFloat(pt.getAttribute('lon'))
    }));

    setGpxData(coords);
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

  const mapContainerStyle = {
    width: '100%',
    height: '300px',
    borderRadius: '1rem',
    overflow: 'hidden',
    marginBottom: '1.5rem'
  };

  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    styles: [
      { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
      { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
      { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] }
    ]
  };

  return (
    <div className="screen">
      <div className="header">
        <button onClick={() => onNavigate('routes')} className="back-button">←</button>
        <h2>{route.name}</h2>
        <div></div>
      </div>

      <div className="content detail-content">
        {isLoaded && gpxData && gpxData.length > 0 && (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={gpxData[0]}
            zoom={13}
            options={mapOptions}
            onLoad={map => {
              mapRef.current = map;
              const bounds = new window.google.maps.LatLngBounds();
              gpxData.forEach(coord => bounds.extend(coord));
              map.fitBounds(bounds);
            }}
          >
            <Polyline
              path={gpxData}
              options={{
                strokeColor: '#f27f0d',
                strokeOpacity: 1,
                strokeWeight: 4
              }}
            />
            <Marker
              position={gpxData[0]}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: '#22c55e',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
                scale: 10
              }}
              title="Inicio"
            />
            <Marker
              position={gpxData[gpxData.length - 1]}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: '#ef4444',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
                scale: 10
              }}
              title="Fin"
            />
          </GoogleMap>
        )}

        <div className="detail-stats-grid">
          <div className="detail-stat-card">
            <span className="detail-stat-icon">🛣️</span>
            <p className="detail-stat-label">Distancia</p>
            <p className="detail-stat-value">{route.distance} <span className="detail-stat-unit">km</span></p>
          </div>
          <div className="detail-stat-card">
            <span className="detail-stat-icon">⚡</span>
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
            <span className="detail-stat-icon">📍</span>
            <p className="detail-stat-label">Puntos GPS</p>
            <p className="detail-stat-value">{route.points}</p>
          </div>
          <div className="detail-stat-card">
            <span className="detail-stat-icon">{route.vehicle_type === 'Público' ? '🚌' : '🚗'}</span>
            <p className="detail-stat-label">Vehículo</p>
            <p className="detail-stat-value">{route.vehicle_type || 'N/A'}</p>
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
