import React from 'react';

const WebBrowserFrame = ({ url, isLoading, title }) => {
  return (
    <div className="relative h-48 bg-gray-100 border-y border-gray-200">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="h-full p-4 overflow-hidden">
          {/* Mock browser content */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-300 rounded"></div>
              <div className="h-3 bg-gray-300 rounded w-32"></div>
            </div>
            <div className="h-2 bg-gray-200 rounded w-full"></div>
            <div className="h-2 bg-gray-200 rounded w-3/4"></div>
            <div className="h-2 bg-gray-200 rounded w-1/2"></div>
            <div className="space-y-1 mt-4">
              <div className="h-2 bg-gray-300 rounded w-full"></div>
              <div className="h-2 bg-gray-300 rounded w-5/6"></div>
              <div className="h-2 bg-gray-300 rounded w-4/6"></div>
            </div>
          </div>
          
          {/* URL display */}
          <div className="absolute top-2 right-2 text-xs text-gray-400 bg-white px-2 py-1 rounded border">
            {new URL(url).hostname}
          </div>
        </div>
      )}
    </div>
  );
};

export default WebBrowserFrame;