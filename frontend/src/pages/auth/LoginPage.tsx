/**
 * LOGIN PAGE
 */

import { useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowRight } from 'lucide-react';
import type { LoginFormData } from '../../types';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });
  const [error, setError] = useState<string>('');

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error on input change
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    // Login with Supabase + fetch roles from backend
    const result = await login(formData.email, formData.password);

    if (result.success) {
      navigate('/select-role');
    } else {
      setError(result.message || 'Errore durante il login');
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
          {/* Logo with subtle glow */}
          <div className="relative inline-block mb-6">
            <img 
              src="/src/assets/images/streetControlLogo.svg" 
              alt="Street Control Logo" 
              className="w-40 h-40 drop-shadow-[0_0_8px_rgba(167,139,250,0.25)]"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = '/src/assets/images/streetControlLogo.png';
              }}
            />
          </div>

          {/* Title */}
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-primary tracking-wider font-display">
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
