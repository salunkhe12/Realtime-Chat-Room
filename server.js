const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const DIST_DIR = path.join(__dirname, 'dist');
const LOG_FILE = path.join(__dirname, 'chat.log');

function ensureLogFile() {
  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, '', 'utf8');
  }
}

function readHistory() {
  ensureLogFile();

  const content = fs.readFileSync(LOG_FILE, 'utf8').trim();
  if (!content) {
    return [];
  }

  return content
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .slice(-100);
}

function appendLog(entry) {
  ensureLogFile();
  fs.appendFileSync(LOG_FILE, `${JSON.stringify(entry)}\n`, 'utf8');
}

function sendJson(socket, payload) {
  socket.send(JSON.stringify(payload));
}

function broadcast(server, payload) {
  const data = JSON.stringify(payload);

  server.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

function serveStatic(req, res) {
  const requestPath = req.url === '/' ? '/index.html' : req.url;
  const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(DIST_DIR, safePath);

  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, file) => {
    if (error) {
      res.writeHead(404).end('Not found');
      return;
    }

    const ext = path.extname(filePath);
    const contentTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
    };

    res.writeHead(200, {
      'Content-Type': contentTypes[ext] || 'application/octet-stream',
    });
    res.end(file);
  });
}

const httpServer = http.createServer(serveStatic);
const wss = new WebSocket.Server({ server: httpServer });

wss.on('connection', (socket) => {
  sendJson(socket, {
    type: 'history',
    messages: readHistory(),
  });

  socket.on('message', (rawMessage) => {
    let payload;

    try {
      payload = JSON.parse(rawMessage.toString());
    } catch {
      sendJson(socket, {
        type: 'system',
        message: 'Invalid message payload.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (payload.type === 'join') {
      socket.username = String(payload.username || '').trim().slice(0, 24);

      if (!socket.username) {
        sendJson(socket, {
          type: 'system',
          message: 'A username is required.',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const entry = {
        type: 'system',
        message: `${socket.username} joined the room`,
        timestamp: new Date().toISOString(),
      };

      appendLog(entry);
      broadcast(wss, entry);
      return;
    }

    if (payload.type === 'message' && socket.username) {
      const text = String(payload.message || '').trim();
      if (!text) {
        return;
      }

      const entry = {
        type: 'message',
        username: socket.username,
        message: text.slice(0, 500),
        timestamp: new Date().toISOString(),
      };

      appendLog(entry);
      broadcast(wss, entry);
    }
  });

  socket.on('close', () => {
    if (!socket.username) {
      return;
    }

    const entry = {
      type: 'system',
      message: `${socket.username} left the room`,
      timestamp: new Date().toISOString(),
    };

    appendLog(entry);
    broadcast(wss, entry);
  });
});

// httpServer.listen(PORT, () => {
//   ensureLogFile();
//   console.log(`Chat server running at http://localhost:${PORT}`);
// });
httpServer.listen(PORT, "0.0.0.0", () => {
  ensureLogFile();
  console.log(`Chat server running at http://0.0.0.0:${PORT}`);
});
