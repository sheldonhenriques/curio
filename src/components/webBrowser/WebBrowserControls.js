import React from 'react';

const WebBrowserControls = ({
  nodeData,
  onRefresh,
  onUrlChange,
  onNavigateBack,
  onNavigateForward
}) => {
  return (
    <div className="flex items-center space-x-1 p-2 border-b border-gray-100">
      <button
        onClick={onNavigateBack}
        disabled={!nodeData.canGoBack}
        className={`p-1 rounded text-xs ${
          nodeData.canGoBack
            ? 'text-gray-600 hover:bg-gray-100'
            : 'text-gray-300 cursor-not-allowed'
        }`}
        title="Go back"
      >
        ←
      </button>
      
      <button
        onClick={onNavigateForward}
        disabled={!nodeData.canGoForward}
        className={`p-1 rounded text-xs ${
          nodeData.canGoForward
            ? 'text-gray-600 hover:bg-gray-100'
            : 'text-gray-300 cursor-not-allowed'
        }`}
        title="Go forward"
      >
        →
      </button>
      
      <button
        onClick={onRefresh}
        disabled={nodeData.isRefreshing}
        className="p-1 text-gray-600 hover:bg-gray-100 rounded text-xs"
        title="Refresh"
      >
        {nodeData.isRefreshing ? '⟳' : '↻'}
      </button>
      
      <div className="flex-1 px-2">
        <input
          type="text"
          value={nodeData.url}
          onChange={(e) => onUrlChange(e.target.value)}
          className="w-full text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
          placeholder="Enter URL..."
        />
      </div>
    </div>
  );
};

export default WebBrowserControls;