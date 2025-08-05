import React from 'react';

function AnalyzedLayout({ sidebar, content }) {
  return (
    <div className="flex w-full min-h-screen px-6 py-6 gap-6 bg-gray-50">
      <div className="w-full max-w-sm flex-shrink-0">
        {sidebar}
      </div>
      <div className="flex-1 space-y-4">
        {content}
      </div>
    </div>
  );
}

export default AnalyzedLayout;
