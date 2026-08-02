# 🏃‍♂️ Running Territory

> **A Gamified Social Fitness Platform & Territory Claiming Network**

Combining the best elements of **Strava**, **Pokémon GO**, **Civilization**, and **Google Maps**, **Running Territory** gives every run a purpose. Instead of only tracking distance and pace, users gradually explore, unlock, and claim their world within a 5km radius neighborhood circle.

---

## 🌟 Key Features

### 📍 Live Run Tracking & Simulation
- **Live GPS Tracking**: Real-time position recording, distance calculation, current pace, average speed, and estimated calorie expenditure.
- **Desktop Road Simulation Mode**: Built-in OSRM (Open Source Routing Machine) walking route simulator so you can test road-snapped runs from any location without needing mobile hardware.

### 🗺️ 5km Territory Area Discovery (Core USP)
- **5km Radius Exploration**: Calculates the exact percentage and square kilometers ($km^2$) of territory unlocked out of the $78.54\text{ km}^2$ neighborhood area surrounding your current position.
- **Rank Milestones**: Dynamic badges from 🌱 *Fresh Adventurer* ➔ 🧭 *Local Pathfinder* ➔ ⚡ *District Explorer* ➔ 🏆 *Territory Veteran* ➔ 👑 *Realm Conqueror*.

### 🏆 Local Leaderboard & Interactive Map Overlay
- **Top 3 Nearby Explorers**: See real users in your local area ranked by territory discovered.
- **Custom Leaflet Markers**: Emoji rank badges (🥇 #1, 🥈 #2, 🥉 #3) displayed directly on the interactive map.
- **Map Layer Toggles**: Dynamic map controls to toggle the 5km Territory Zone circle or Nearby Explorer pins.

### 👤 Comprehensive Runner Profile
- **Personal Metrics**: Displays total distance, total runs, longest run, average pace, active streak, and calories burned.
- **Profile Customization**: Edit name, bio, and profile picture avatar.

### 📜 Run History & Telemetry Logs
- **Interactive Route Review**: View detailed route maps and complete telemetry snapshots for any previous run.
- **Run Management**: Option to review or delete past run logs.

---

## 📸 Screenshots & Preview

*(Add screenshot previews here)*
- **Dashboard & Map Telemetry**: `![Dashboard Preview](docs/dashboard_preview.png)`
- **Leaderboard & 5km Radius Zone**: `![Leaderboard Preview](docs/leaderboard_preview.png)`
- **Profile & History**: `![Profile Preview](docs/profile_preview.png)`

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 + Vite
- **Navigation**: React Router DOM v6
- **State & HTTP**: React Context API, Axios
- **Maps & GIS**: Leaflet + OpenStreetMap + React-Leaflet
- **Styling**: Vanilla CSS with curated color tokens & modern responsive grid layouts

### Backend
- **Runtime**: Node.js + Express.js (ES Modules)
- **Database**: MongoDB + Mongoose ORM
- **Auth & Security**: JWT Authentication, bcryptjs password hashing
- **Environment**: dotenv

---

## 📁 Folder Structure

```
1st SaaS/
├── GEMINI.md               # Product Requirement & Philosophy Document
├── README.md               # Comprehensive Project Documentation
├── package.json            # Root workspace scripts & concurrency configuration
│
├── client/                 # React Frontend (Vite)
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx         # App routes & layout wrapper
│       ├── main.jsx
│       ├── index.css       # Core CSS design system & component styles
│       ├── components/
│       │   ├── AreaDiscoveryCard.jsx   # 5km territory coverage card
│       │   ├── Navbar.jsx              # Application navigation bar
│       │   ├── ProtectedRoute.jsx      # Route guard for auth
│       │   ├── RunList.jsx             # Sidebar run history list
│       │   ├── RunMap.jsx              # Leaflet interactive map with layers
│       │   ├── RunTracker.jsx          # Live GPS & simulated telemetry tracker
│       │   └── TopExplorersWidget.jsx  # Top 3 nearby explorers leaderboard
│       ├── context/
│       │   └── AuthContext.jsx         # User JWT state context
│       ├── pages/
│       │   ├── Dashboard.jsx           # Main exploration home screen
│       │   ├── Login.jsx               # User login page
│       │   ├── Profile.jsx             # Runner profile & edit modal
│       │   ├── Register.jsx            # User registration page
│       │   └── RunHistory.jsx          # History logs & route inspection page
│       └── utils/
│           └── geo.js                  # Haversine distance, area discovery math, & formatters
│
└── server/                 # Node.js + Express Backend API
    ├── server.js           # Express app entrypoint & middleware
    ├── package.json
    ├── .env                # Server environment variables
    ├── config/
    │   └── db.js           # Mongoose DB connection handler
    ├── middleware/
    │   └── auth.js         # JWT protection middleware
    ├── models/
    │   ├── User.js         # User schema (auth, bio, stats)
    │   └── Run.js          # Run schema (route coordinates, telemetry)
    └── routes/
        ├── authRoutes.js   # POST /register, POST /login, GET /me
        ├── runRoutes.js    # POST /runs, GET /runs, GET /runs/:id, DELETE /runs/:id, GET /leaderboard
        ├── userRoutes.js   # GET /users/profile, PUT /users/profile
        └── territoryRoutes.js # GET /territory, POST /territory
```

---

## ⚡ Local Installation & Setup

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB running locally or a MongoDB Atlas connection string.

### 1. Clone the repository & Install dependencies
Run from the root directory:
```bash
npm run install:all
```

### 2. Configure Environment Variables
Create a `.env` file inside the `server/` directory:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/running_territory
JWT_SECRET=running_territory_super_secret_jwt_key_2026
```

### 3. Run the Full Stack Locally
Start both backend and frontend concurrently with a single command:
```bash
npm run dev
```
- Frontend app will launch at: `http://localhost:5173`
- Backend API server will run at: `http://localhost:5000`

---

## 📡 RESTful API Documentation

### 🔑 Authentication
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user | ❌ |
| `POST` | `/api/auth/login` | Login user & return JWT token | ❌ |
| `GET` | `/api/auth/me` | Fetch logged-in user details | ✅ |

### 🏃 Runs & Telemetry
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/runs` | Save a completed run with coordinates | ✅ |
| `GET` | `/api/runs` | Fetch all runs for logged-in user | ✅ |
| `GET` | `/api/runs/:id` | Fetch single run details | ✅ |
| `DELETE` | `/api/runs/:id` | Delete a specific run log | ✅ |
| `GET` | `/api/runs/leaderboard` | Get Top 3 nearby explorers in 5km area | ✅ |

### 👤 Profile & User Stats
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users/profile` | Get complete user stats & profile | ✅ |
| `PUT` | `/api/users/profile` | Update name, bio, and profile picture | ✅ |

### 🗺️ Territory
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/territory` | Fetch aggregate explored territory routes | ✅ |
| `POST` | `/api/territory` | Sync/Update territory points | ✅ |

---

## 🚀 Future Roadmap

- [ ] **Competitive Territory Ownership**: Allow users to contest & capture sectors from rivals.
- [ ] **Social Feed & Likes**: Like and comment on friends' claimed territories.
- [ ] **Achievements & Challenges**: Weekly territory conqueror badges and neighborhood monthly goals.
- [ ] **Strava Sync Integration**: Automatically sync runs from Strava API.

---

## 📄 License
MIT License
