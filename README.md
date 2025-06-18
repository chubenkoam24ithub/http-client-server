# Учебная практика. Задание «Реализовать HTTP клиент и сервер для сбора информации из интернета»

## Автор
- **ФИО:** Чубенко Андрей Михайлович
- **Учебное заведение:** IT Hub College  
- **Группа:** 1ЭИТ1-11.24  
- **Дата контрольной точки:** 18 июня 2025

Приложение состоит из сервера на Node.js с Express и WebSocket для предоставления API и потоковой передачи контента, а также клиента на React для поиска текстового контента по ключевым словам. Сервер возвращает список URL по ключевому слову и передает контент с отображением прогресса загрузки через WebSocket.

## Требования

- **Node.js**: Версия 18 или выше
- **npm**: Версия 8 или выше
- **Git**: Для клонирования репозитория
- Браузер (Chrome, Firefox и т.д.) для тестирования клиента
- Доступ к интернету для загрузки зависимостей и работы с публичными URL

## Установка

1. **Клонируйте репозиторий**:
   ```bash
   git clone https://github.com/chubenkoam24ithub/http-client-server.git
   cd http-client-server
   ```

2. **Установите зависимости для сервера**:
   ```bash
   cd server
   npm install
   ```

3. **Установите зависимости для клиента**:
   ```bash
   cd ../client
   npm install
   ```

## Локальный запуск

1. **Запустите сервер**:
   ```bash
   cd server
   npm start
   ```
   - Сервер будет доступен на `http://localhost:10000`.
   - WebSocket будет доступен на `ws://localhost:10000`.
   - Логи сервера покажут:
     ```
     Сервер запущен на порту 10000
     WebSocket сервер доступен на ws://localhost:10000
     keywords.json успешно загружен
     ```

2. **Запустите клиент**:
   ```bash
   cd ../client
   npm start
   ```
   - Клиент откроется в браузере на `http://localhost:3000`.
   - Если порт занят, выберите другой, предложенный `create-react-app`.

3. **Проверка**:
   - Откройте `http://localhost:3000` в браузере.
   - Введите ключевое слово (например, `магия`).
   - Выберите URL из списка (например, `(https://www.ithubdev.ru/data/magic1.txt)`). 
   - Убедитесь, что отображается прогресс загрузки и контент.
   - Проверьте консоль браузера (F12 → Console) на наличие ошибок.

## Публичное развертывание

- **Клиент**: Доступен на [https://your-vercel-app.vercel.app](http-client-server.vercel.app).
- **Сервер**: Доступен на [https://http-client-server-jjev.onrender.com](https://http-client-server-jjev.onrender.com).
- **WebSocket**: Доступен на [wss://http-client-server-jjev.onrender.com](wss://http-client-server-jjev.onrender.com).
- **Пример API-запроса**: [https://http-client-server-jjev.onrender.com/api/urls/магия](https://http-client-server-jjev.onrender.com/api/urls/магия).

### Тестирование публичной версии

1. Откройте клиентский URL в браузере.
2. Введите ключевое слово (например, `магия`).
3. Выберите URL из списка.
4. Проверьте прогресс загрузки и отображение контента.
5. Для проверки API выполните:
   ```bash
   curl -v https://http-client-server-jjev.onrender.com/api/urls/магия
   ```
   Ожидаемый ответ:
   ```json
   {
     "urls": [
       "(https://www.ithubdev.ru/data/magic1.txt)",
       ...
     ]
   }
   ```
6. Для проверки WebSocket используйте [WebSocket King](https://websocketking.com):
   - Подключитесь к `wss://http-client-server-jjev.onrender.com`.
   - Отправьте: `{ "downloadId": "test123" }`.
   - Проверьте логи сервера на Render.

## Структура проекта

- **`/server`**: Серверная часть (Node.js, Express, WebSocket).
  - `server.js`: Основной серверный код.
  - `data/keywords.json`: Файл с ключевыми словами и URL.
- **`/client`**: Клиентская часть (React).
  - `src/App.js`: Главный компонент клиента.
  - `src/components/`: Компоненты `KeywordInput`, `UrlList`, `ProgressBar`, `ContentDisplay`.
- **`/README.md`**: Документация.
- **`/.gitignore`**: Игнорируемые файлы (node_modules, build и т.д.).
