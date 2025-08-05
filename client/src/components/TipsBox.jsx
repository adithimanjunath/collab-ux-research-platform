import React from 'react';

function TipsBox() {
  return (
    <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg shadow animate-fade-in-up">
      <h3 className="text-base font-semibold text-blue-800 mb-2">📌 Tips for Better Insights</h3>
      <ul className="list-disc ml-5 text-sm text-blue-900 space-y-1">
        <li>Use <strong>5–10 user interviews</strong> for stronger patterns.</li>
        <li>Paste <strong>full quotes</strong> — not just bullet points.</li>
        <li>Highlight pain points in <strong>user language</strong>.</li>
      </ul>
    </div>
  );
}

export default TipsBox;
