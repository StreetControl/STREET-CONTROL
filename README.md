# 🏋️ STREET CONTROL

Software di gestione gare Streetlifting - Full Stack TypeScript Application

## 🚀 Stack Tecnologico

### Frontend
- **React 18** + **TypeScript**
- **Vite** - Build tool & dev server
- **TailwindCSS** - Styling
- **React Router** - Routing
- **Zustand** - State management
- **React Hook Form** - Form handling
- **Axios** - HTTP client
- **Supabase** - Authentication

### Backend
- **Node.js** + **Express** + **TypeScript**
- **Supabase** - Database (PostgreSQL) & Auth
- **JWT** - Token authentication
- **WebSocket** - Real-time updates
- **Helmet** - Security
- **Morgan** - HTTP logging

## 📦 Installazione

### Prerequisites
- Node.js 18+
- npm o yarn
- Supabase account

### Setup Iniziale

1. **Clone repository**
```bash
git clone https://github.com/StreetControl/STREET-CONTROL.git
cd STREET-CONTROL
```

2. **Installa dipendenze**
```bash
npm run install:all
```

3. **Configura variabili d'ambiente**

**Frontend** (`frontend/.env.local`):
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_BACKEND_URL=http://localhost:5000/api
```

**Backend** (`backend/.env`):
```env
PORT=5000
NODE_ENV=development

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret

# CORS
ALLOWED_ORIGINS=http://localhost:3000

# Rate Limiting (optional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

4. **Setup Database**
```bash
# Esegui lo script SQL su Supabase
# File: database/init_remote_schema.sql
```

## 🚀 Sviluppo

### Avvia tutto (Frontend + Backend)
```bash
npm run dev
```

### Avvia solo Frontend
```bash
cd frontend
npm run dev
```
Apri [http://localhost:3000](http://localhost:3000)

### Avvia solo Backend
```bash
cd backend
npm run dev
```
API disponibile su [http://localhost:5000](http://localhost:5000)

## 🏗️ Build per Produzione

### Frontend
```bash
cd frontend
npm run build
npm run preview  # Preview build
```

### Backend
```bash
cd backend
npm run build       # Compila TypeScript → dist/
npm run start:prod  # Build + Start
```

## 📁 Struttura Progetto

```
STREET-CONTROL/
├── frontend/                 # React + TypeScript app
│   ├── src/
│   │   ├── components/      # Componenti riutilizzabili
│   │   ├── contexts/        # React contexts (Auth)
│   │   ├── pages/           # Pages/Routes
│   │   │   ├── auth/        # Login, SelectRole
│   │   │   ├── director/    # Director dashboard
│   │   │   ├── organizer/   # Organizer dashboard
│   │   │   └── judge/       # Judge dashboard
│   │   ├── services/        # API client, Supabase
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Utilities
│   ├── tsconfig.json        # TypeScript config
│   └── vite.config.ts       # Vite config
│
├── backend/                  # Express + TypeScript API
│   ├── src/
│   │   ├── config/          # Configuration
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── types/           # TypeScript types
│   │   ├── utils/           # Utilities
│   │   └── server.ts        # Entry point
│   ├── tsconfig.json        # TypeScript config
│   └── nodemon.json         # Nodemon config
│
├── database/                 # SQL schemas
│   └── init_remote_schema.sql
│
└── docs/                     # Documentation
```

## 🎭 Sistema Ruoli

Il progetto implementa un sistema multi-ruolo:

### 🎬 DIRECTOR (Regista)
- Gestione flusso gara in tempo reale
- Coordinamento voli e progressione atleti
- Override risultati (VAR)

### 👥 ORGANIZER (Pre-Gara)
- Configurazione atleti
- Gestione categorie e pesi
- Setup parametri gara

### ⚖️ REFEREE (Giudice)
- Valutazione alzate
- Sistema voti 2/3
- Interfaccia real-time

## 🔐 Autenticazione

1. **Login** - Email/Password (Supabase Auth)
2. **Role Selection** - Scelta ruolo operativo
3. **Role-based Access** - Permissions granulari

## 🛠️ Scripts Disponibili

### Root
```bash
npm run dev              # Avvia frontend + backend
npm run dev:frontend     # Solo frontend
npm run dev:backend      # Solo backend
npm run install:all      # Installa tutte le dipendenze
```

### Frontend
```bash
npm run dev              # Dev server (Vite)
npm run build            # Build produzione
npm run preview          # Preview build
npm run lint             # ESLint check
```

### Backend
```bash
npm run dev              # Dev con nodemon + ts-node
npm run build            # Compila TypeScript
npm run start            # Esegue dist/server.js
npm run start:prod       # Build + Start
```

## 🧪 Type Checking

### Frontend
```bash
cd frontend
npx tsc --noEmit
```

### Backend
```bash
cd backend
npm run build
```

## 📚 API Endpoints

### Auth
- `GET /api/auth/user-info` - Get user info + available roles
- `POST /api/auth/verify-role` - Validate and select role

### Health
- `GET /` - API status
- `GET /api/health` - Health check

## 🎨 Features

- ✅ **Type Safety** - TypeScript full-stack
- ✅ **Authentication** - JWT + Supabase
- ✅ **Real-time** - WebSocket support
- ✅ **Role-based Access** - Granular permissions
- ✅ **Responsive UI** - Mobile-first design
- ✅ **Dark Mode** - GitHub-inspired theme
- ✅ **Error Handling** - Comprehensive error boundaries
- ✅ **Rate Limiting** - API protection
- ✅ **Security** - Helmet, CORS, JWT validation

## 🚧 Work In Progress

- [ ] Director dashboard implementation
- [ ] Organizer dashboard implementation
- [ ] Referee voting interface
- [ ] Real-time WebSocket integration
- [ ] Display screens
- [ ] Competition flow management

## 📝 License

MIT

## 👥 Team

Street Control Team

---

**Built with TypeScript 💙**
