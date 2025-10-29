/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark Mode GitHub-like Theme
        'dark': {
          'bg': '#0d1117',        // Background principale
          'bg-secondary': '#161b22', // Background cards/containers
          'bg-tertiary': '#21262d',  // Background hover/elevated
          'border': '#30363d',    // Bordi
          'text': '#c9d1d9',      // Testo principale
          'text-secondary': '#8b949e', // Testo secondario
          'text-muted': '#6e7681', // Testo disabilitato
        },
        // Colori primari
        'primary': {
          DEFAULT: '#a78bfa',     // Viola chiaro (primary)
          'hover': '#c4b5fd',     // Viola più chiaro hover
          'dark': '#8b5cf6',      // Viola più scuro
        },
        // Colori funzionali
        'success': '#3fb950',     // Verde GitHub
        'danger': '#f85149',      // Rosso GitHub
        'warning': '#d29922',     // Giallo GitHub
        'info': '#58a6ff',        // Blu GitHub
      },
      fontFamily: {
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
        'mono': ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
        'display': ['Orbitron', 'sans-serif'], // Font moderno per titoli
      },
      boxShadow: {
        'dark': '0 0 0 1px rgba(110, 118, 129, 0.4)',
        'dark-lg': '0 8px 24px rgba(0, 0, 0, 0.4)',
      },
      borderRadius: {
        'DEFAULT': '6px',
      }
    },
  },
  plugins: [],
}
