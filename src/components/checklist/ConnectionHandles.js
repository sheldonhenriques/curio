import { Handle, Position } from 'reactflow';

const ConnectionHandles = () => (
  <>
    <Handle
      type="target"
      position={Position.Top}
      className="w-3 h-3 bg-blue-500 border-2 border-white shadow-md"
      aria-label="Top connection handle"
    />
    <Handle
      type="source"
      position={Position.Bottom}
      className="w-3 h-3 bg-blue-500 border-2 border-white shadow-md"
      aria-label="Bottom connection handle"
    />
    <Handle
      type="target"
      position={Position.Left}
      className="w-3 h-3 bg-blue-500 border-2 border-white shadow-md"
      aria-label="Left connection handle"
    />
    <Handle
      type="source"
      position={Position.Right}
      className="w-3 h-3 bg-blue-500 border-2 border-white shadow-md"
      aria-label="Right connection handle"
    />
  </>
);

export default ConnectionHandles;