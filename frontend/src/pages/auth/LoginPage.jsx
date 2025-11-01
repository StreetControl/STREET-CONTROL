/**
 * LOGIN PAGE
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowRight } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  
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

    // Login with Supabase + fetch roles from backend
    const result = await login(formData.email, formData.password);

    if (result.success) {
      navigate('/select-role');
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg p-4 relative overflow-hidden">
      {/* Background animated gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo + Title */}
        <div className="text-center mb-8">
          {/* Logo with edge glow effects */}
          <div className="relative inline-block mb-6 group">
            <img 
              src="/src/assets/images/streetControlLogo.svg" 
              alt="Street Control Logo" 
              className="w-40 h-40 relative z-10
                         drop-shadow-[0_0_20px_rgba(167,139,250,0.4)]
                         group-hover:drop-shadow-[0_0_30px_rgba(167,139,250,0.7)]
                         transition-all duration-500
                         filter group-hover:brightness-110"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/src/assets/images/streetControlLogo.png';
              }}
            />
            {/* Animated border glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-transparent via-primary to-transparent animate-pulse" style={{ animationDelay: '0.25s' }}></div>
              <div className="absolute right-0 top-0 w-1 h-full bg-gradient-to-b from-transparent via-blue-500 to-transparent animate-pulse" style={{ animationDelay: '0.75s' }}></div>
            </div>
          </div>

          {/* Title with custom font */}
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-primary
                         tracking-wider animate-gradient font-display
                         drop-shadow-[0_0_15px_rgba(167,139,250,0.3)]">
            STREET CONTROL
          </h1>
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
                E-mail
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                placeholder="Inserisci e-mail"
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
