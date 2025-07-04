import { Handle, Position } from 'reactflow';
import WebBrowserFrame from '@/components/webBrowser/WebBrowserFrame';
import WebBrowserControls from '@/components/webBrowser/WebBrowserControls';
import { useWebBrowser } from '@/hooks/useWebBrowser';

const WebBrowserNode = ({ data, id }) => {
  const {
    nodeData,
    handleRefresh,
    handleUrlChange,
    handleNavigateBack,
    handleNavigateForward,
    handleToggleNotes,
    handleLoadComplete,
    handleLoadError
  } = useWebBrowser(data, id);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg min-w-[320px] max-w-[400px]">
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 bg-blue-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 bg-blue-500"
      />
      
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{nodeData.favicon}</span>
          <div>
            <h3 className="font-medium text-sm text-gray-900 truncate max-w-[200px]">
              {nodeData.title}
            </h3>
            <p className="text-xs text-gray-500 truncate max-w-[200px]">
              {nodeData.url}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            className="p-1 text-gray-400 hover:text-gray-600 text-xs"
            title="Extra options"
          >
            ⋯
          </button>
        </div>
      </div>

      <WebBrowserControls
        nodeData={nodeData}
        onRefresh={handleRefresh}
        onUrlChange={handleUrlChange}
        onNavigateBack={handleNavigateBack}
        onNavigateForward={handleNavigateForward}
      />

      <WebBrowserFrame
        url={nodeData.url}
        isLoading={nodeData.isLoading}
        title={nodeData.title}
        onLoadComplete={handleLoadComplete}
        onLoadError={handleLoadError}
      />

      <div className="flex items-center justify-between p-2 border-t border-gray-100 bg-gray-50 rounded-b-lg">
        <p className="text-xs text-gray-500">
          Last visited: {nodeData.lastVisited}
        </p>
        <div className="flex space-x-2">
          <button
            onClick={handleRefresh}
            className="p-1 text-gray-400 hover:text-gray-600 text-xs"
            title="Refresh"
          >
            🔄
          </button>
          <button
            onClick={() => {
              const newUrl = prompt('Enter URL:', nodeData.url);
              if (newUrl) handleUrlChange(newUrl);
            }}
            className="p-1 text-gray-400 hover:text-gray-600 text-xs"
            title="Change URL"
          >
            📝
          </button>
          <button
            onClick={handleToggleNotes}
            className="p-1 text-gray-400 hover:text-gray-600 text-xs"
            title="Notes"
          >
            📋
          </button>
        </div>
      </div>
    </div>
  );
};

export default WebBrowserNode;