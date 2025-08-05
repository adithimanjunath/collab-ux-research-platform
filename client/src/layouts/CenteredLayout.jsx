import React from 'react';

function CenteredLayout({ children }) {
  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-gray-50">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}

export default CenteredLayout;
