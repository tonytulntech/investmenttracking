import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { TrendingUp, Mail, Lock, User, AlertCircle } from 'lucide-react';

function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password || !confirmPassword || !displayName) {
      setError('Per favore compila tutti i campi');
      return;
    }

    if (password.length < 6) {
      setError('La password deve avere almeno 6 caratteri');
      return;
    }

    if (password !== confirmPassword) {
      setError('Le password non coincidono');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await signup(email, password, displayName);
      navigate('/dashboard');
    } catch (error) {
      console.error('Signup error:', error);
      setError(getErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (code) => {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'Email già registrata';
      case 'auth/invalid-email':
        return 'Email non valida';
      case 'auth/weak-password':
        return 'Password troppo debole';
      default:
        return 'Errore durante la registrazione. Riprova';
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <TrendingUp size={48} className="auth-icon" />
          <h2>Investment Tracker</h2>
          <p>Crea il tuo account</p>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="displayName">
              <User size={20} />
              Nome
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Il tuo nome"
              disabled={loading}
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">
              <Mail size={20} />
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tuo@email.com"
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <Lock size={20} />
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              <Lock size={20} />
              Conferma Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Registrazione in corso...' : 'Registrati'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Hai già un account?{' '}
            <Link to="/login">Accedi</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
