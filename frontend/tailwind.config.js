/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom colors per Street Control
        'sc-primary': '#3B82F6',
        'sc-secondary': '#8B5CF6',
        'sc-success': '#10B981',
        'sc-danger': '#EF4444',
        'sc-warning': '#F59E0B',
        'sc-dark': '#1F2937',
      }
    },
  },
  plugins: [],
}
