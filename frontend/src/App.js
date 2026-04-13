import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Create Auth Context
const AuthContext = createContext();

// API Service
const API_BASE = process.env.REACT_APP_API_URL || '/api';

const apiService = {
  // Authentication
  login: async (credentials) => {
    const response = await axios.post(`${API_BASE}/auth/login`, credentials);
    return response.data;
  },
  
  getProfile: async () => {
    const response = await axios.get(`${API_BASE}/auth/profile`);
    return response.data;
  },
  
  // Configuration
  getConfig: async () => {
    const response = await axios.get(`${API_BASE}/config`);
    return response.data;
  },
  
  getConfigSetting: async (key) => {
    const response = await axios.get(`${API_BASE}/config/${key}`);
    return response.data;
  },
  
  // Health check
  healthCheck: async () => {
    const response = await axios.get(`${API_BASE}/health`);
    return response.data;
  }
};

// Set up axios interceptors for authentication
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth Provider Component
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      // Verify token is still valid
      apiService.getProfile()
        .then(response => {
          setUser(response.user);
        })
        .catch(() => {
          logout();
        });
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      const response = await apiService.login(credentials);
      if (response.success) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        setUser(response.user);
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for using auth context
function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  return user ? children : <Navigate to="/login" />;
}

// Login Component
function Login() {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const result = await login(credentials);
    
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h2>🔐 Azure App Config Demo</h2>
        <p>Sign in to access configuration dashboard</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={credentials.username}
              onChange={(e) => setCredentials({...credentials, username: e.target.value})}
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Password:</label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              placeholder="Enter your password"
              required
            />
          </div>
          
          {error && <div className="error">{error}</div>}
          
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div className="demo-credentials">
          <h4>Demo Credentials:</h4>
          <p>Email: demo@ltimindtree.com</p>
          <p>Password: password123</p>
        </div>
      </div>
    </div>
  );
}

// Navigation Component
function Navigation() {
  const { user, logout } = useAuth();

  return (
    <nav className="navigation">
      <div className="nav-brand">
        <Link to="/dashboard">☁️ Azure Config Demo</Link>
      </div>
      <div className="nav-links">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/config">Configuration</Link>
        <span className="user-info">👤 {user?.name}</span>
        <button onClick={logout} className="logout-btn">Logout</button>
      </div>
    </nav>
  );
}

// Dashboard Component
function Dashboard() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await apiService.getConfig();
      if (response.success) {
        setConfig(response.config);
      } else {
        setError('Failed to load configuration');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading configuration...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="dashboard">
      <h1>Configuration Dashboard</h1>
      
      {config?.promoBanner && (
        <div 
          className="promo-banner" 
          style={{ backgroundColor: config.promoBanner.color }}
        >
          {config.promoBanner.text}
        </div>
      )}
      
      <div className="config-grid">
        <div className="config-card">
          <h3>🎨 Promotional Banner</h3>
          <p><strong>Text:</strong> {config?.promoBanner?.text}</p>
          <p><strong>Color:</strong> {config?.promoBanner?.color}</p>
        </div>
        
        <div className="config-card">
          <h3>🚀 Feature Flags</h3>
          <p>
            <strong>New Checkout:</strong> 
            <span className={`feature-flag ${config?.features?.newCheckout ? 'enabled' : 'disabled'}`}>
              {config?.features?.newCheckout ? '🟢 Enabled' : '🔴 Disabled'}
            </span>
          </p>
        </div>
        
        <div className="config-card">
          <h3>🔄 Actions</h3>
          <button onClick={loadConfig} className="refresh-btn">
            Refresh Configuration
          </button>
        </div>
      </div>
    </div>
  );
}

// Configuration Detail Component
function ConfigurationDetail() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedSetting, setSelectedSetting] = useState('');

  const configKeys = [
    'PromoBanner/Text',
    'PromoBanner/Color', 
    'Feature/NewCheckout'
  ];

  useEffect(() => {
    loadAllSettings();
  }, []);

  const loadAllSettings = async () => {
    try {
      setLoading(true);
      const response = await apiService.getConfig();
      if (response.success) {
        setSettings({
          'PromoBanner/Text': response.config.promoBanner.text,
          'PromoBanner/Color': response.config.promoBanner.color,
          'Feature/NewCheckout': response.config.features.newCheckout.toString()
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSpecificSetting = async (key) => {
    try {
      const response = await apiService.getConfigSetting(key);
      if (response.success) {
        setSettings(prev => ({
          ...prev,
          [key]: response.value
        }));
      }
    } catch (err) {
      console.error(`Failed to load setting ${key}:`, err);
    }
  };

  return (
    <div className="configuration-detail">
      <h1>Configuration Management</h1>
      
      <div className="setting-selector">
        <label>Select Setting to View:</label>
        <select 
          value={selectedSetting} 
          onChange={(e) => setSelectedSetting(e.target.value)}
        >
          <option value="">-- Select a setting --</option>
          {configKeys.map(key => (
            <option key={key} value={key}>{key}</option>
          ))}
        </select>
        
        {selectedSetting && (
          <button onClick={() => loadSpecificSetting(selectedSetting)}>
            Refresh {selectedSetting}
          </button>
        )}
      </div>
      
      {loading ? (
        <div className="loading">Loading settings...</div>
      ) : (
        <div className="settings-list">
          {Object.entries(settings).map(([key, value]) => (
            <div key={key} className="setting-item">
              <h3>{key}</h3>
              <p className="setting-value">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Main App Component
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Navigation />
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/config" 
              element={
                <ProtectedRoute>
                  <Navigation />
                  <ConfigurationDetail />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
