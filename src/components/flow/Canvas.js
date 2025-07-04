'use client';

import { useCallback } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  addEdge,
  Controls,
  Background,
  BackgroundVariant,
} from 'reactflow';

import 'reactflow/dist/style.css';
import ChecklistNode from '@/components/nodes/ChecklistNode';
import WebBrowserNode from '@/components/nodes/WebBrowserNode';
import { checklistNodes } from '@/data/nodes'

const nodeTypes = {
  checklist: ChecklistNode,
  webBrowser: WebBrowserNode,
};


export default function Canvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(checklistNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        nodeTypes={nodeTypes}
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      </ReactFlow>
    </div>
  );
}
