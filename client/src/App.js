import React, { useState, useEffect } from 'react';
import KeywordInput from './components/KeywordInput';
import UrlList from './components/UrlList';
import ContentDisplay from './components/ContentDisplay';
import ProgressBar from './components/ProgressBar';
import './App.css';

function App() {
  const [keyword, setKeyword] = useState('');
  const [urls, setUrls] = useState([]);
  const [selectedUrl, setSelectedUrl] = useState('');
  const [content, setContent] = useState('');
  const [progress, setProgress] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [error, setError] = useState('');
  const [savedContent, setSavedContent] = useState([]);
  const [ws, setWs] = useState(null);
  const [downloadId, setDownloadId] = useState(null);

  // Настройка URL сервера и WebSocket через переменные окружения
  const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';
  const wsUrl = process.env.REACT_APP_WS_URL || (process.env.REACT_APP_SERVER_URL ? process.env.REACT_APP_SERVER_URL.replace('https://', 'wss://').replace('http://', 'ws://') : 'ws://localhost:3001');

  const generateDownloadId = () => {
    return `download-${Math.random().toString(36).substring(2, 15)}`;
  };

  // Настройка WebSocket
  useEffect(() => {
    console.log('Попытка подключения WebSocket к:', wsUrl);
    try {
      const websocket = new WebSocket(wsUrl);
      setWs(websocket);

      websocket.onopen = () => {
        console.log('WebSocket успешно подключен к:', wsUrl);
        // Отправка downloadId будет выполнена в fetchContent
      };

      websocket.onmessage = (event) => {
        console.log('Получено WebSocket сообщение:', event.data);
        try {
          const { percent, total } = JSON.parse(event.data);
          setProgress(percent || 0);
          setTotalSize(total || 0);
        } catch (err) {
          console.error('Ошибка парсинга WebSocket сообщения:', err.message);
          setError('Ошибка обработки прогресса загрузки');
        }
      };

      websocket.onerror = (error) => {
        console.error('Ошибка WebSocket:', error);
        setError('Ошибка соединения с WebSocket. Прогресс не будет отображаться.');
      };

      websocket.onclose = (event) => {
        console.log('WebSocket закрыт:', event.code, event.reason);
        setWs(null);
      };

      return () => {
        console.log('Отключение WebSocket');
        websocket.close();
      };
    } catch (err) {
      console.error('Ошибка инициализации WebSocket:', err.message);
      setError('Не удалось подключиться к WebSocket');
    }
  }, [wsUrl]);

  // Загрузка сохраненного контента из localStorage
  useEffect(() => {
    const saved = localStorage.getItem('savedContent');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedContent(parsed.slice(-5));
      } catch (err) {
        console.error('Ошибка парсинга savedContent:', err.message);
        setError('Ошибка загрузки сохраненного контента');
      }
    }
  }, []);

  // Получение URL по ключевому слову
  const fetchUrls = async () => {
    setError('');
    setUrls([]);
    setSelectedUrl('');
    setContent('');
    setProgress(0);
    setTotalSize(0);
    if (!keyword.trim()) {
      setError('Введите ключевое слово');
      return;
    }
    try {
      console.log(`Запрос URL: ${serverUrl}/api/urls/${keyword}`);
      const response = await fetch(`${serverUrl}/api/urls/${keyword}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Ошибка HTTP: ${response.status}`);
      }
      const data = await response.json();
      if (data.error) {
        setError(data.error);
        setUrls([]);
      } else {
        setUrls(data.urls || []);
      }
    } catch (err) {
      console.error('Ошибка fetchUrls:', err.message);
      setError(`Ошибка соединения с сервером: ${err.message}`);
    }
  };

  // Загрузка контента по URL
  const fetchContent = async (url) => {
    setError('');
    setProgress(0);
    setTotalSize(0);
    setContent('');

    const newDownloadId = generateDownloadId();
    setDownloadId(newDownloadId);
    console.log('Отправка downloadId:', newDownloadId);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ downloadId: newDownloadId }));
    } else {
      console.warn('WebSocket не подключен, прогресс не будет отображаться');
      setError('WebSocket не активен, прогресс не отображается');
    }

    try {
      console.log(`Запрос контента: ${serverUrl}/api/content?url=${encodeURIComponent(url)}&downloadId=${newDownloadId}`);
      const response = await fetch(`${serverUrl}/api/content?url=${encodeURIComponent(url)}&downloadId=${newDownloadId}`, {
        headers: {
          Accept: 'text/plain',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Ошибка HTTP: ${response.status}`);
      }

      const reader = response.body.getReader();
      let chunks = [];
      let receivedLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('Чтение потока завершено');
          break;
        }
        if (value) {
          chunks.push(value);
          receivedLength += value.length;
          console.log(`Получено ${receivedLength} байт`);
        }
      }

      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(combined);
      console.log('Загруженный контент:', text.substring(0, 100));
      if (!text || text.trim().length === 0) {
        setError('Контент пустой или содержит только пробелы');
        return;
      }
      setContent(text);

      const newSavedContent = [...savedContent, { url, content: text, timestamp: new Date().toISOString() }].slice(-5);
      setSavedContent(newSavedContent);
      try {
        localStorage.setItem('savedContent', JSON.stringify(newSavedContent));
      } catch (err) {
        if (err.name === 'QuotaExceededError' || err.message.includes('exceeded the quota')) {
          setError('Невозможно сохранить контент: превышен лимит хранилища. Удалите старые записи.');
        } else {
          setError(`Ошибка сохранения контента: ${err.message}`);
        }
      }
    } catch (err) {
      console.error('Ошибка fetchContent:', err.message);
      setError(`Ошибка загрузки контента: ${err.message}`);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-center">HTTP Клиент для сбора контента</h1>
      {error && <div className="text-red-500 mb-4 p-4 border border-red-500 rounded">{error}</div>}
      <KeywordInput onSubmit={fetchUrls} setKeyword={setKeyword} />
      <UrlList urls={urls} onSelect={setSelectedUrl} fetchContent={fetchContent} selectedUrl={selectedUrl} />
      <ProgressBar progress={progress} totalSize={totalSize} />
      <ContentDisplay content={content} savedContent={savedContent} setContent={setContent} setSavedContent={setSavedContent} />
    </div>
  );
}

export default App;
