const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const axios = require('axios');
const path = require('path');
const https = require('https');
const { WebSocketServer } = require('ws');
const http = require('http');

// Настройка глобального агента HTTPS
https.globalAgent.options.ca = require('ssl-root-cas').create();

const app = express();
const port = process.env.PORT || 10000;

// Создаем HTTP-сервер
const server = http.createServer(app);

// Настройка WebSocket-сервера
const wss = new WebSocketServer({ server });

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
}));
app.use(express.json());

// Путь к файлу с ключевыми словами
const keywordsPath = path.join(__dirname, 'data', 'keywords.json');
let keywordsData = {};

// Загрузка ключевых слов
async function loadKeywords() {
  try {
    const data = await fs.readFile(keywordsPath, 'utf8');
    keywordsData = JSON.parse(data);
    console.log('keywords.json успешно загружен');
  } catch (error) {
    console.error('Ошибка загрузки keywords.json:', error.message);
  }
}

loadKeywords();

// Хранилище для прогресса загрузок
const downloadProgress = new Map();

// WebSocket: обработка подключений
wss.on('connection', (ws, req) => {
  console.log(`WebSocket: Новое подключение с IP ${req.socket.remoteAddress}, URL: ${req.url}`);
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      const { downloadId } = data;
      if (downloadId) {
        ws.downloadId = downloadId;
        console.log(`WebSocket: Получен downloadId=${downloadId}`);
      } else {
        console.warn('WebSocket: downloadId не указан');
      }
    } catch (error) {
      console.error('WebSocket: Ошибка обработки сообщения:', error.message);
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`WebSocket: Подключение закрыто (код: ${code}, причина: ${reason.toString()})`);
    if (ws.downloadId) {
      downloadProgress.delete(ws.downloadId);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket: Ошибка:', error.message);
  });
});

// Проверка активности WebSocket
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      console.log(`WebSocket: Закрытие неактивного соединения с downloadId=${ws.downloadId || 'неизвестно'}`);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// API для URL по ключевому слову
app.get('/api/urls/:keyword', async (req, res) => {
  try {
    const { keyword } = req.params;
    const urls = keywordsData[keyword.toLowerCase()] || [];
    if (urls.length === 0) {
      return res.status(404).json({ error: 'Ключевое слово не найдено' });
    }
    res.json({ urls });
  } catch (error) {
    console.error('Ошибка в /api/urls:', error.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// API для загрузки контента
app.get('/api/content', async (req, res) => {
  const { url, downloadId } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL не указан' });
  }
  if (!downloadId) {
    return res.status(400).json({ error: 'downloadId не указан' });
  }

  console.log(`Запрос контента: url=${url}, downloadId=${downloadId}`);

  try {
    const response = await axios.get(url, {
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      onDownloadProgress: (progressEvent) => {
        const total = progressEvent.total || 0;
        const loaded = progressEvent.loaded;
        const percent = total ? Math.round((loaded / total) * 100) : 0;

        downloadProgress.set(downloadId, { percent, total });

        wss.clients.forEach((client) => {
          if (client.downloadId === downloadId && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ percent, total }));
          }
        });
      },
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    let firstChunk = true;
    response.data.on('data', (chunk) => {
      if (firstChunk) {
        console.log('Первый фрагмент данных:', chunk.toString('utf8').substring(0, 100));
        firstChunk = false;
      }
    });
    response.data.on('error', (err) => {
      console.error('Ошибка потока:', err.message);
      res.status(500).json({ error: `Ошибка потока: ${err.message}` });
    });
    response.data.pipe(res);
  } catch (error) {
    console.error(`Ошибка загрузки контента для ${url}:`, {
      message: error.message,
      code: error.code,
      response: error.response ? error.response.status : null,
    });
    let userMessage = 'Ошибка загрузки контента';
    if (error.message.includes('unable to verify the first certificate')) {
      userMessage = 'Не удалось проверить сертификат сайта.';
    } else if (error.response) {
      userMessage = `Ошибка HTTP: ${error.response.status}`;
    }
    res.status(500).json({ error: userMessage });
  }
});

// Проверка WebSocket
app.get('/ws-test', (req, res) => {
  console.log('Получен запрос на /ws-test');
  res.json({
    status: 'WebSocket server is running',
    wsUrl: process.env.NODE_ENV === 'production' ? `wss://${req.headers.host}` : `ws://localhost:${port}`,
  });
});

// Запуск сервера
server.listen(port, () => {
  const wsProtocol = process.env.NODE_ENV === 'production' ? 'wss' : 'ws';
  const wsHost = process.env.NODE_ENV === 'production' ? 'http-client-server-backend.onrender.com' : 'localhost';
  console.log(`Сервер запущен на порту ${port}`);
  console.log(`WebSocket сервер доступен на ${wsProtocol}://${wsHost}${port !== 443 && wsProtocol === 'ws' ? `:${port}` : ''}`);
});
