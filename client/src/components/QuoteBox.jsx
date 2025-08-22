import React from 'react';

function QuoteBox({ quote }) {
  return (
    <div className="px-4 py-3 bg-slate-50 border-l-4 border-indigo-500 rounded-xl text-sm italic text-slate-800">
      <div className="flex justify-between items-center">
        <span>{quote}</span>
      </div>
    </div>
  );
}

export default QuoteBox;
