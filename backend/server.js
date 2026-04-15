const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const WebSocket = require('ws');

const PORT = Number(process.env.PORT || 8080);
const LOG_FILE = path.join(__dirname, 'messages.json');
const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');

function ensureLogFile() {
  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, '[]', 'utf8');
  }
}

function readMessages() {
  ensureLogFile();

  try {
    const raw = fs.readFileSync(LOG_FILE, 'utf8').trim();
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to read message history:', error);
    return [];
  }
}

function saveMessages(messages) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(messages, null, 2), 'utf8');
}

function appendMessage(entry) {
  const history = readMessages();
  history.push(entry);
  saveMessages(history.slice(-200));
}

function sendJson(socket, payload) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function broadcast(server, payload) {
  const data = JSON.stringify(payload);

  server.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

function getContentType(filePath) {
  const ext = path.extname(filePath);

  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

function serveFrontend(req, res) {
  const hasBuild = fs.existsSync(FRONTEND_DIST);

  if (!hasBuild) {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(
      [
        'Frontend build not found.',
        'Run "npm run dev:client" for local React development or "npm run build" before "npm start".',
        `Expected build directory: ${FRONTEND_DIST}`,
      ].join('\n')
    );
    return;
  }

  const requestPath = req.url === '/' ? '/index.html' : req.url;
  const normalizedPath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
  const targetPath = path.join(FRONTEND_DIST, normalizedPath);
  const safePath = targetPath.startsWith(FRONTEND_DIST)
    ? targetPath
    : path.join(FRONTEND_DIST, 'index.html');

  const filePath = fs.existsSync(safePath) ? safePath : path.join(FRONTEND_DIST, 'index.html');

  fs.readFile(filePath, (error, contents) => {
    if (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Unable to load frontend build.');
      return;
    }

    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    res.end(contents);
  });
}

const server = http.createServer(serveFrontend);
const wss = new WebSocket.Server({ server });

wss.on('connection', (socket, req) => {
  socket.clientId = crypto.randomUUID();

  sendJson(socket, {
    type: 'welcome',
    clientId: socket.clientId,
  });

  sendJson(socket, {
    type: 'history',
    messages: readMessages(),
  });

  socket.on('message', (raw) => {
    let payload;

    try {
      payload = JSON.parse(raw.toString());
    } catch {
      sendJson(socket, {
        type: 'error',
        message: 'Invalid message payload.',
      });
      return;
    }

    const name = String(payload.name || '').trim().slice(0, 24);
    const text = String(payload.text || '').trim().slice(0, 500);

    if (!name || !text) {
      sendJson(socket, {
        type: 'error',
        message: 'Both name and message are required.',
      });
      return;
    }

    const entry = {
      id: crypto.randomUUID(),
      senderId: socket.clientId,
      senderName: name,
      text,
      timestamp: new Date().toISOString(),
    };

    appendMessage(entry);
    broadcast(wss, {
      type: 'message',
      message: entry,
    });
  });
});

server.listen(PORT, () => {
  ensureLogFile();
  console.log(`Chat server running on http://0.0.0.0:${PORT}`);
});
