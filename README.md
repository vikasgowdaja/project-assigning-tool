# Innovation Project Allocation Portal

Phase 1 MVP for local-network team registration and random project allocation.

## What It Does

- Teams register through a React + Vite frontend.
- Backend assigns the next team number automatically, such as `TEAM-001`.
- Each team receives one random unused project statement.
- Registered teams appear instantly on the public dashboard through Socket.IO.
- Data is stored in MongoDB.
- Backend listens on `0.0.0.0` for LAN access.

## Folder Structure

```text
project-assigning-tool/
  client/
    src/
      components/
      pages/
      services/
      utils/
  server/
    src/
      config/
      controllers/
      data/
      middleware/
      models/
      routes/
      services/
      sockets/
      utils/
```

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, Axios, Socket.IO client
- Backend: Node.js, Express.js, Socket.IO
- Database: MongoDB with Mongoose

## Setup

### 1. Prerequisites

- Node.js 20+
- MongoDB running locally or reachable over the network

### 2. Configure Backend

Create `server/.env`:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/innovation_portal
CORS_ORIGIN=http://localhost:5173
```

### 3. Configure Frontend

Create `client/.env`:

```env
VITE_API_BASE_URL=http://<your-host-ip>:5000/api
VITE_SOCKET_URL=http://<your-host-ip>:5000
```

If you skip the frontend env file, the browser client will automatically use the current page host and connect back to port `5000` on that same IP.

## Install

```bash
cd server
npm install

cd ../client
npm install
```

## Run

### Backend

```bash
cd server
npm run dev
```

### Frontend

```bash
cd client
npm run dev
```

## REST APIs

- `GET /api/health` - health check
- `POST /api/teams/register` - register a team and assign a project
- `GET /api/teams` - fetch registered teams
- `GET /api/teams/stats` - fetch dashboard stats
- `GET /api/teams/export` - download registered teams as an Excel file
- `POST /api/projects` - store a new project statement in MongoDB
- `GET /api/projects` - fetch all seeded projects
- `GET /api/projects/summary` - fetch project pool summary

## Socket Events

- `team:registered` - emitted after a successful registration
- `socket:ready` - emitted when a client connects

## LAN Hosting

1. Start MongoDB.
2. Connect the host laptop and student devices to the same hotspot or router network.
3. Start the backend on the host machine.
4. Start the frontend with Vite using `npm run dev`.
5. Open the frontend from another device using the host machine IP shown in Vite output, for example `http://192.168.1.10:5173`.
6. Ensure firewall allows the backend port (`5000`) and frontend port (`5173`).

The backend already binds to `0.0.0.0`, and Vite is configured for LAN access.

## MVP Behavior

- Team names must be unique.
- Lead emails must be unique.
- Team members must be between 2 and 6.
- One unused project is assigned at registration time, then the project pool is reused randomly after exhaustion.
- The assigned project pool contains 15 statements.
- New project statements can be stored directly in MongoDB through the projects API.
