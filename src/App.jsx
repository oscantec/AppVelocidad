import { useState } from 'react';
import LoginScreen from './components/Login';
import HomeScreen from './components/Home';
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
      <div className="temp-message">
        <p>🚧 Componentes Recording, Routes, RouteDetail, Satellites en construcción...</p>
        <p>✅ Login y Home funcionando</p>
        <p>📦 Próximo: Mapa OpenStreetMap + Reproductor + Gráficas</p>
      </div>
    </div>
  );
}

export default App;
