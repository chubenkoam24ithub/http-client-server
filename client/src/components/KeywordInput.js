import React from 'react';

function KeywordInput({ onSubmit, setKeyword }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Введите ключевое слово"
          onChange={(e) => setKeyword(e.target.value)}
          className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Поиск
        </button>
      </div>
    </form>
  );
}

export default KeywordInput;