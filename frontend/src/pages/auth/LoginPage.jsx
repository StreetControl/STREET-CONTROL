/**
 * 🔐 LOGIN PAGE
 * Layout esatto del mockup fornito dall'utente
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowRight } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const { loginOrganization, loading } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error on input change
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const result = await loginOrganization(formData.email, formData.password);

    if (result.success) {
      if (result.requiresRoleSelection) {
        // Multiple roles → go to role selection
        navigate('/select-role');
      } else {
        // Single role → redirect based on role
        const role = result.user.available_roles[0]?.role;
        
        switch(role) {
          case 'DIRECTOR':
            navigate('/director');
            break;
          case 'ORGANIZER':
            navigate('/organizer');
            break;
          case 'REFEREE':
            navigate('/referee');
            break;
          default:
            navigate('/');
        }
      }
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg p-4">
      <div className="w-full max-w-md">
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img 
              src="/src/assets/images/streetControlLogo.svg" 
              alt="SLI Logo" 
              className="w-24 h-24"
              onError={(e) => {
                // Fallback to PNG if SVG not found
                e.target.onerror = null;
                e.target.src = '/src/assets/images/streetControlLogo.png';
              }}
            />
          </div>
          <h1 className="text-3xl font-bold text-dark-text mb-2">
            STREET CONTROL
          </h1>
          <p className="text-dark-text-secondary text-sm">
            Accedi alla piattaforma di gestione gare
          </p>
        </div>

        {/* Card with Form */}
        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="label">
                Email Organizzazione
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                placeholder="nome@organizzazione.it"
                required
                autoFocus
                disabled={loading}
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input-field"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Accesso in corso...
                </>
              ) : (
                <>
                  Accedi
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-dark-text-muted text-xs">
            © Licenza da inserire successivamente.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
