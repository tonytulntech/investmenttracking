import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import Dashboard from './components/dashboard/Dashboard';
import Portfolio from './components/portfolio/Portfolio';
import TransactionsList from './components/transactions/TransactionsList';
import CSVUpload from './components/upload/CSVUpload';
import { LogOut, TrendingUp } from 'lucide-react';

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
};

function App() {
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="app">
      {currentUser && (
        <header className="app-header">
          <div className="header-content">
            <div className="logo">
              <TrendingUp size={32} />
              <h1>Investment Tracker</h1>
            </div>
            <nav className="nav">
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/portfolio">Portfolio</Link>
              <Link to="/transactions">Transazioni</Link>
              <Link to="/upload">Carica Dati</Link>
            </nav>
            <div className="user-section">
              <span className="user-email">{currentUser.email}</span>
              <button onClick={handleLogout} className="logout-btn">
                <LogOut size={20} />
                Logout
              </button>
            </div>
          </div>
        </header>
      )}

      <main className="app-main">
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={currentUser ? <Navigate to="/dashboard" /> : <Login />}
          />
          <Route
            path="/signup"
            element={currentUser ? <Navigate to="/dashboard" /> : <Signup />}
          />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portfolio"
            element={
              <ProtectedRoute>
                <Portfolio />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions"
            element={
              <ProtectedRoute>
                <TransactionsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <CSVUpload />
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route
            path="/"
            element={<Navigate to={currentUser ? "/dashboard" : "/login"} />}
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
