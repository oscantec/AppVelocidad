import { useState } from 'react';
import { TEMP_USER, TEMP_PASS } from '../config/supabase';

export default function LoginScreen({ onLogin }) {
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
