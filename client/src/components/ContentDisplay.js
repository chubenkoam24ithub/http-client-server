import React, { useState } from 'react';

const ContentDisplay = ({ content, savedContent, setContent, setSavedContent }) => {
  const [selectedSavedContent, setSelectedSavedContent] = useState(null);
  
  const handleSelectSavedContent = (savedItem) => {
    console.log('Selecting saved content:', savedItem);
    if (
      selectedSavedContent &&
      selectedSavedContent.url === savedItem.url &&
      selectedSavedContent.timestamp === savedItem.timestamp
    ) {
      setSelectedSavedContent(null);
      console.log('Reset to current content');
    } else {
      setSelectedSavedContent(savedItem);
      setContent(savedItem.content);
      console.log('Set content to saved:', savedItem.content.substring(0, 50));
    }
  };

  const handleClearSavedContent = () => {
    console.log('Очистка сохраненного контента');
    setSavedContent([]);
    localStorage.removeItem('savedContent');
    setSelectedSavedContent(null);
    setContent('');
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('ru-RU', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  return (
    <div className="mt-6">
      <h2 className="text-2xl font-semibold mb-4">Контент</h2>
      <div className="flex flex-col md:flex-row gap-4">
        {}
        <div className="w-full md:w-1/3">
          <h3 className="text-lg font-medium mb-2">История (5 последних записей)</h3>
          {savedContent.length > 0 ? (
            <>
              <ul className="border rounded-lg max-h-96 overflow-y-auto">
                {savedContent.map((item, index) => (
                  <li
                    key={index}
                    className={`p-2 cursor-pointer hover:bg-gray-100 ${
                      selectedSavedContent &&
                      selectedSavedContent.url === item.url &&
                      selectedSavedContent.timestamp === item.timestamp
                        ? 'bg-gray-200'
                        : ''
                    }`}
                    onClick={() => handleSelectSavedContent(item)}
                  >
                    <p className="text-sm truncate">{item.url}</p>
                    <p className="text-xs text-gray-500">{formatDate(item.timestamp)}</p>
                  </li>
                ))}
              </ul>
              <button
                className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                onClick={handleClearSavedContent}
              >
                Очистить сохраненный контент
              </button>
            </>
          ) : (
            <p className="text-gray-500">Нет сохраненных записей</p>
          )}
        </div>
        {}
        <div className="w-full md:w-2/3">
          <h3 className="text-lg font-medium mb-2">
            {selectedSavedContent ? 'Выбранная история' : ' '}
          </h3>
          {content ? (
            <pre className="p-4 bg-white border rounded-md overflow-auto max-h-[30rem] text-sm">
              {content}
            </pre>
          ) : (
            <p className="text-gray-500">Выберите запись из истории загрузки</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentDisplay;