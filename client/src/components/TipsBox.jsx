import React from 'react';

function TipsBox() {
  return (
    <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 mb-2">📌 Tips for Better Insights</h3>
      <ul className="list-disc ml-5 text-sm text-slate-700 space-y-1">
        <li>Use <strong>5–10 user interviews</strong> for stronger patterns.</li>
        <li>Paste <strong>full quotes</strong> — not just bullet points.</li>
        <li>Highlight pain points in <strong>user language</strong>.</li>
      </ul>
    </div>
  );
}

export default TipsBox;
