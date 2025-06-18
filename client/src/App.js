import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [keyword, setKeyword] = useState('');
  const [urls, setUrls] = useState([]);
  const [selectedUrl, setSelectedUrl] = useState('');
  const [content, setContent] = useState('');
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [downloadId] = useState(`download-${Date.now()}`);

  // Настройка URL сервера и WebSocket через переменные окружения
  const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';
  const wsUrl = process.env.REACT_APP_WS_URL || (process.env.REACT_APP_SERVER_URL ? process.env.REACT_APP_SERVER_URL.replace('https://', 'wss://').replace('http://', 'ws://') : 'ws://localhost:3001');

  // Загрузка URL по ключевому слову
  const fetchUrls = async () => {
    if (!keyword.trim()) {
      setUrls([]);
      return;
    }
    try {
      console.log(`Запрос URL для ключевого слова: ${keyword}`);
      const response = await axios.get(`${serverUrl}/api/urls/${keyword}`);
      setUrls(response.data.urls || []);
      setSelectedUrl('');
      setContent('');
      setProgress(0);
      setTotal(0);
    } catch (error) {
      console.error('Ошибка загрузки URL:', error.message);
      setUrls([]);
    }
  };

  // Загрузка контента по выбранному URL
  const fetchContent = async () => {
    if (!selectedUrl) return;
    try {
      console.log(`Запрос контента для URL: ${selectedUrl}, downloadId: ${downloadId}`);
      const response = await axios.get(`${serverUrl}/api/content`, {
        params: { url: selectedUrl, downloadId },
      });
      setContent(response.data);
    } catch (error) {
      console.error('Ошибка загрузки контента:', error.message);
      setContent('Ошибка загрузки контента');
    }
  };

  // Настройка WebSocket для отслеживания прогресса
  useEffect(() => {
    console.log('Попытка подключения WebSocket к:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket успешно подключен к:', wsUrl);
      ws.send(JSON.stringify({ downloadId }));
    };

    ws.onmessage = (event) => {
      console.log('Получено WebSocket сообщение:', event.data);
      try {
        const data = JSON.parse(event.data);
        setProgress(data.percent || 0);
        setTotal(data.total || 0);
      } catch (error) {
        console.error('Ошибка парсинга WebSocket сообщения:', error.message);
      }
    };

    ws.onclose = (event) => {
      console.log('WebSocket закрыт:', event.code, event.reason);
    };

    ws.onerror = (error) => {
      console.error('Ошибка WebSocket:', error);
    };

    return () => {
      console.log('Отключение WebSocket');
      ws.close();
    };
  }, [downloadId, wsUrl]);

  // Обработчик ввода ключевого слова
  const handleKeywordChange = (e) => {
    setKeyword(e.target.value);
  };

  // Обработчик выбора URL
  const handleUrlChange = (e) => {
    setSelectedUrl(e.target.value);
  };

  // Обработчик отправки ключевого слова
  const handleKeywordSubmit = (e) => {
    e.preventDefault();
    fetchUrls();
  };

  // Загрузка контента при выборе URL
  useEffect(() => {
    if (selectedUrl) {
      fetchContent();
    }
  }, [selectedUrl]);

  return (
    <div className="App">
      <h1>HTTP Client-Server</h1>
      <form onSubmit={handleKeywordSubmit}>
        <label>
          Ключевое слово:
          <input
            type="text"
            value={keyword}
            onChange={handleKeywordChange}
            placeholder="Введите ключевое слово (например, магия)"
          />
        </label>
        <button type="submit">Поиск</button>
      </form>

      {urls.length > 0 && (
        <div>
          <label>
            Выберите URL:
            <select value={selectedUrl} onChange={handleUrlChange}>
              <option value="">-- Выберите URL --</option>
              {urls.map((url, index) => (
                <option key={index} value={url}>{url}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {selectedUrl && (
        <div>
          <h3>Прогресс загрузки:</h3>
          <progress value={progress} max="100">{progress}%</progress>
          <p>{progress}% ({total ? `${(total / 1024).toFixed(2)} KB` : '0 KB'})</p>
        </div>
      )}

      {content && (
        <div>
          <h3>Контент:</h3>
          <textarea value={content} readOnly rows="10" cols="80" />
        </div>
      )}
    </div>
  );
}

export default App;
