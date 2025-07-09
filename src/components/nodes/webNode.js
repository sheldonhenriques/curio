import { useState, useCallback, useMemo } from 'react';
import BaseNodeWrapper from '@/components/nodes/base/BaseNodeWrapper';
import { useNodeManagement } from '@/hooks/useNodeManagement';
import { WEB_BROWSER_CONFIG } from '@/constants/nodeConfig';
import NodeHeader from '@/components/nodes/serverNode/NodeHeader';
import NodeControls from '@/components/nodes/serverNode/NodeControls';
import NodePreview from '@/components/nodes/serverNode/NodePreview';
import { useNodeData } from '@/hooks/useNodeData';

const VIEWPORT_PRESETS = WEB_BROWSER_CONFIG.VIEWPORT_PRESETS;

const ChecklistNode = ({ data, selected, id }) => {
    const initialSizeIndex = useMemo(() => {
        const sizeName = data?.size?.toLowerCase?.() || 'desktop';
        const foundIndex = VIEWPORT_PRESETS.findIndex(p => p.name.toLowerCase() === sizeName);
        return foundIndex !== -1 ? foundIndex : 0;
    }, [data]);

    const [sizeIndex, setSizeIndex] = useState(initialSizeIndex);
    const { updateNodeData, deleteNode, setNodeState } = useNodeManagement();

    const currentSize = VIEWPORT_PRESETS[sizeIndex];
    const { nodeData } = useNodeData(data);

    const setViewportMode = useCallback((nodeId, mode) => {
        const foundIndex = VIEWPORT_PRESETS.findIndex(p => p.name.toLowerCase() === mode);
        setSizeIndex(foundIndex);
        updateNodeData(nodeId, { size: mode });
    }, [updateNodeData]);


    const handleUpdateViewport = useCallback((nodeId, viewport) => {
        updateNodeData(nodeId, { viewport });
    }, [updateNodeData]);

    const handleLoadError = useCallback(() => {
        setNodeState(id, 'error');
    }, [id, setNodeState]);

    const handleLoadSuccess = useCallback(() => {
        setNodeState(id, 'success');
    }, [id, setNodeState]);

    return (
        <BaseNodeWrapper
            id={id}
            data={data}
            selected={selected}
            style={{
                width: currentSize.width,
                minWidth: WEB_BROWSER_CONFIG.MIN_WIDTH,
            }}
            resizable={true}
            resizeConfig={{
                color: WEB_BROWSER_CONFIG.RESIZE_COLOR,
                minWidth: WEB_BROWSER_CONFIG.MIN_WIDTH,
            }}
            onDelete={deleteNode}
            onUpdateData={updateNodeData}
        >
            {({ handleDelete, handleUpdateData }) => (
                <>
                    <NodeHeader node={nodeData} onDelete={handleDelete} />
                    {/* Node controls - only shown when selected */}
                    {selected && (
                        <NodeControls
                            node={nodeData}
                            onSetViewportMode={setViewportMode}
                            onUpdateViewport={handleUpdateViewport}
                        />
                    )}
                    {/* Main preview area */}
                    <NodePreview
                        node={nodeData}
                        onLoadError={handleLoadError}
                        onLoadSuccess={handleLoadSuccess}
                    />
                </>
            )}
        </BaseNodeWrapper>
    );
};

export default ChecklistNode;