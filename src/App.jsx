import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginScreen from './components/Login';
import ModuleSelector from './components/ModuleSelector';
import HomeScreen from './components/Home';
import RecordingScreen from './components/Recording';
import RoutesScreen from './components/Routes';
import RouteDetailScreen from './components/RouteDetail';
import SatellitesScreen from './components/Satellites';
// Oficina components
import OficinaDashboard from './components/Oficina/OficinaDashboard';
import './App.css';

// Campo Module - Field Capture
function CampoModule() {
  const navigate = useNavigate();
  const [currentScreen, setCurrentScreen] = useState('home');
  const [screenData, setScreenData] = useState(null);

  const handleNavigate = (screen, data) => {
    setCurrentScreen(screen);
    setScreenData(data);
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="app-container">
      {currentScreen === 'home' && <HomeScreen onNavigate={handleNavigate} onBack={handleBack} />}
      {currentScreen === 'recording' && <RecordingScreen onNavigate={handleNavigate} routeConfig={screenData} />}
      {currentScreen === 'routes' && <RoutesScreen onNavigate={handleNavigate} />}
      {currentScreen === 'route-detail' && <RouteDetailScreen onNavigate={handleNavigate} route={screenData} />}
      {currentScreen === 'satellites' && <SatellitesScreen onNavigate={handleNavigate} />}
    </div>
  );
}

// Oficina Module - Office Analysis
function OficinaModule() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/');
  };

  return <OficinaDashboard onBack={handleBack} />;
}

// Module Selection Screen Wrapper
function ModuleSelectorWrapper() {
  const navigate = useNavigate();

  const handleSelectModule = (module) => {
    navigate(`/${module}`);
  };

  return <ModuleSelector onSelectModule={handleSelectModule} />;
}

// Main App with Authentication
function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <Routes>
      <Route path="/" element={<ModuleSelectorWrapper />} />
      <Route path="/campo/*" element={<CampoModule />} />
      <Route path="/oficina/*" element={<OficinaModule />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
