const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const axios = require('axios');
const path = require('path');
const https = require('https');
const { WebSocketServer } = require('ws');
const http = require('http');

https.globalAgent.options.ca = require('ssl-root-cas').create();

const app = express();
const port = process.env.PORT || 3001;

const server = http.createServer(app);

const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

const keywordsPath = path.join(__dirname, 'data', 'keywords.json');
let keywordsData = {};

async function loadKeywords() {
  try {
    const data = await fs.readFile(keywordsPath, 'utf8');
    keywordsData = JSON.parse(data);
  } catch (error) {
    console.error('Ошибка загрузки keywords.json:', error);
  }
}

loadKeywords();

const downloadProgress = new Map();

wss.on('connection', (ws) => {
  console.log('WebSocket: Новое подключение');
  ws.on('message', (message) => {
    try {
      const { downloadId } = JSON.parse(message.toString());
      ws.downloadId = downloadId;
      console.log(`WebSocket: Получен downloadId=${downloadId}`);
    } catch (error) {
      console.error('WebSocket: Ошибка обработки сообщения:', error);
    }
  });

  ws.on('close', () => {
    if (ws.downloadId) {
      downloadProgress.delete(ws.downloadId);
      console.log(`WebSocket: Подключение с downloadId=${ws.downloadId} закрыто`);
    }
  });
});

// API для получения URL по ключевому слову
app.get('/api/urls/:keyword', async (req, res) => {
  try {
    const { keyword } = req.params;
    const urls = keywordsData[keyword.toLowerCase()] || [];
    if (urls.length === 0) {
      return res.status(404).json({ error: 'Ключевое слово не найдено' });
    }
    res.json({ urls });
  } catch (error) {
    console.error('Ошибка в /api/urls:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

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
      userMessage = 'Не удалось проверить сертификат сайта. Попробуйте другой URL.';
    } else if (error.response) {
      userMessage = `Ошибка HTTP: ${error.response.status}`;
    }
    res.status(500).json({ error: userMessage });
  }
});

server.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
  console.log(`WebSocket сервер доступен на ws${port === 443 ? 's' : ''}://localhost:${port}`);
});
