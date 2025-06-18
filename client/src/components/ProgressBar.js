import React from 'react';

function ProgressBar({ progress, totalSize }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-3">Прогресс загрузки</h2>
      <div className="w-full bg-gray-200 rounded-full h-4">
        <div
          className="bg-blue-600 h-4 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="mt-2">
        {progress}% {totalSize ? `(${(totalSize / 1024).toFixed(2)} KB)` : '(Размер неизвестен)'}
      </p>
    </div>
  );
}

export default ProgressBar;