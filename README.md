# Realtime Chat Application

Simple end-to-end chat app using Node.js, WebSockets, React, and a local JSON message log.

## Project structure

- `backend/server.js` - Node.js + WebSocket server
- `backend/messages.json` - local message history file
- `frontend/` - React application built with Vite

## Install

```bash
npm install
```

## Run in development

Start the backend:

```bash
npm run dev:server
```

Start the React frontend in a second terminal:

```bash
npm run dev:client
```

Open `http://localhost:5173` in two browser windows, then send messages between them.

For another device on the same Wi-Fi or LAN:

- Start the backend on your machine with `npm run dev:server`
- Start the frontend with `npm run dev:client`
- Find your machine's local IP address, for example `10.242.40.217`
- Open `http://YOUR-IP:5173` on the other device
- The frontend will automatically connect to `ws://YOUR-IP:8080`

If you use a different backend port, set `VITE_WS_PORT` or `VITE_WS_URL` before starting the frontend.

## Run production-style build

Build the frontend:

```bash
npm run build
```

Start the backend server:

```bash
npm start
```

Open `http://localhost:8080`.

To access the production server from another device on the same network, open `http://YOUR-IP:8080`.

## Features

- Real-time messaging with WebSockets
- Message history loaded from `backend/messages.json`
- Responsive React chat UI
- Auto-scroll to newest message
- Sent and received chat bubbles
- Timestamps for each message
