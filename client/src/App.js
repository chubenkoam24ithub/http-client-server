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

  const serverUrl = (process.env.REACT_APP_SERVER_URL || 'https://http-client-server-jjev.onrender.com').replace(/\/+$/, '');
  const wsUrl = process.env.REACT_APP_WS_URL || 'wss://http-client-server-jjev.onrender.com';

  const generateDownloadId = () => {
    return `download-${Math.random().toString(36).substring(2, 15)}`;
  };

  useEffect(() => {
    console.log('Попытка подключения WebSocket к:', wsUrl);
    try {
      const websocket = new WebSocket(wsUrl);
      setWs(websocket);

      websocket.onopen = () => {
        console.log('WebSocket подключен к:', wsUrl);
      };

      websocket.onmessage = (event) => {
        console.log('WebSocket сообщение:', event.data);
        try {
          const { percent, total } = JSON.parse(event.data);
          setProgress(percent || 0);
          setTotalSize(total || 0);
        } catch (err) {
          console.error('Ошибка парсинга WebSocket:', err.message);
          setError('Ошибка обработки прогресса');
        }
      };

      websocket.onerror = (error) => {
        console.error('Ошибка WebSocket:', error);
        setError('Ошибка WebSocket. Прогресс не отображается.');
      };

      websocket.onclose = (event) => {
        console.log(`WebSocket закрыт: код=${event.code}, причина=${event.reason || 'Без причины'}`);
        if (event.code === 1006) {
          setError('WebSocket прерван (код 1006). Проверьте сервер.');
        }
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
      const apiUrl = `${serverUrl}/api/urls/${encodeURIComponent(keyword)}`;
      console.log(`Запрос URL: ${apiUrl}`);
      const response = await fetch(apiUrl, {
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
      console.log(`Отправлено WebSocket: { downloadId: ${newDownloadId} }`);
    } else {
      console.warn('WebSocket не подключен');
      setError('WebSocket не активен');
    }

    try {
      const contentUrl = `${serverUrl}/api/content?url=${encodeURIComponent(url)}&downloadId=${newDownloadId}`;
      console.log(`Запрос контента: ${contentUrl}`);
      const response = await fetch(contentUrl, {
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
      console.log('Контент:', text.substring(0, 100));
      if (!text || text.trim().length === 0) {
        setError('Контент пустой');
        return;
      }
      setContent(text);

      const newSavedContent = [...savedContent, { url, content: text, timestamp: new Date().toISOString() }].slice(-5);
      setSavedContent(newSavedContent);
      try {
        localStorage.setItem('savedContent', JSON.stringify(newSavedContent));
      } catch (err) {
        console.error('Ошибка сохранения:', err.message);
        setError('Ошибка сохранения контента');
      }
    } catch (err) {
      console.error('Ошибка fetchContent:', err.message);
      setError(`Ошибка загрузки: ${err.message}`);
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
