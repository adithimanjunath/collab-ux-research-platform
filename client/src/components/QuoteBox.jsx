import React from 'react';

function QuoteBox({ quote, onRefresh }) {
  return (
    <div className="px-4 py-3 bg-blue-50 border-l-4 border-blue-500 rounded-lg text-sm italic text-blue-800 animate-fade-in">
      <div className="flex justify-between items-center">
        <span>{quote}</span>
      </div>
    </div>
  );
}

export default QuoteBox;
