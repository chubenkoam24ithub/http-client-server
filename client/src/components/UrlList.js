import React from 'react';

function UrlList({ urls, onSelect, fetchContent, selectedUrl }) {
  const handleSelect = (url) => {
    onSelect(url);
    fetchContent(url);
  };

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-3">Доступные URL</h2>
      {urls.length === 0 ? (
        <p className="text-gray-500">URL не найдены</p>
      ) : (
        <ul className="space-y-2">
          {urls.map((url) => (
            <li
              key={url}
              onClick={() => handleSelect(url)}
              className={`p-3 rounded-lg cursor-pointer transition ${
                selectedUrl === url ? 'bg-blue-100 border-blue-500' : 'bg-white hover:bg-gray-100'
              } border`}
            >
              {url}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default UrlList;