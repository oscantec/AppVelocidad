import { useState } from 'react';
import LoginScreen from './components/Login';
import HomeScreen from './components/Home';
import RecordingScreen from './components/Recording';
import RoutesScreen from './components/Routes';
import RouteDetailScreen from './components/RouteDetail';
import SatellitesScreen from './components/Satellites';
import './App.css';

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

export default App;
