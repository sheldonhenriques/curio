// webNode.jsx - Updated with better control visibility and flexible sizing
import { useState, useCallback, useMemo, useEffect } from 'react';
import BaseNodeWrapper from '@/components/nodes/base/BaseNodeWrapper';
import { useNodeManagement } from '@/hooks/useNodeManagement';
import { WEB_BROWSER_CONFIG } from '@/constants/nodeConfig';
import NodeHeader from '@/components/nodes/serverNode/NodeHeader';
import NodeControls from '@/components/nodes/serverNode/NodeControls';
import NodePreview from '@/components/nodes/serverNode/NodePreview';
import { useNodeData } from '@/hooks/useNodeData';

const VIEWPORT_PRESETS = WEB_BROWSER_CONFIG.VIEWPORT_PRESETS;

const webNode = ({ data, selected, id }) => {
    const { updateNodeData, deleteNode, setNodeState } = useNodeManagement();
    const { nodeData } = useNodeData(data);
    
    // State for controls visibility with delay
    const [showControls, setShowControls] = useState(false);
    const [controlsTimer, setControlsTimer] = useState(null);
    
    // Calculate dimensions consistently
    const currentSizeName = nodeData?.size?.toLowerCase?.() || 'desktop';
    const sizeIndex = VIEWPORT_PRESETS.findIndex(p => p.name.toLowerCase() === currentSizeName);
    const currentSize = VIEWPORT_PRESETS[sizeIndex !== -1 ? sizeIndex : 0];
    
    // Dynamic sizing based on scale
    const scale = 0.3;
    const baseHeaderHeight = 24; // Reduced base height
    const compactHeaderHeight = 16; // For very small nodes
    
    // Determine if we should use compact mode
    const scaledWidth = currentSize.width * scale;
    const scaledHeight = currentSize.height * scale;
    const isCompact = scaledWidth < 200 || scaledHeight < 150;
    
    const headerHeight = isCompact ? compactHeaderHeight : baseHeaderHeight;
    const nodeWidth = scaledWidth + (isCompact ? 8 : 12); // Reduced padding
    const nodeHeight = scaledHeight + headerHeight + (isCompact ? 4 : 6); // Minimal extra height

    // Handle selection changes for controls
    useEffect(() => {
        if (selected) {
            // Clear any existing timer
            if (controlsTimer) {
                clearTimeout(controlsTimer);
            }
            
            // Show controls immediately when selected
            setShowControls(true);
            
            // Set timer to hide controls after 3 seconds of no interaction
            const timer = setTimeout(() => {
                setShowControls(false);
            }, 3000);
            
            setControlsTimer(timer);
        } else {
            // Hide controls immediately when deselected
            setShowControls(false);
            if (controlsTimer) {
                clearTimeout(controlsTimer);
                setControlsTimer(null);
            }
        }
        
        // Cleanup timer on unmount
        return () => {
            if (controlsTimer) {
                clearTimeout(controlsTimer);
            }
        };
    }, [selected]);
    
    // Reset controls timer on mouse activity
    const handleMouseActivity = useCallback(() => {
        if (selected && controlsTimer) {
            clearTimeout(controlsTimer);
            setShowControls(true);
            
            const timer = setTimeout(() => {
                setShowControls(false);
            }, 3000);
            
            setControlsTimer(timer);
        }
    }, [selected, controlsTimer]);

    const setViewportMode = useCallback((nodeId, mode) => {
        updateNodeData(nodeId, { size: mode });
        // Keep controls visible briefly after interaction
        handleMouseActivity();
    }, [updateNodeData, handleMouseActivity]);

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
            data={nodeData}
            selected={selected}
            style={{
                width: nodeWidth,
                height: nodeHeight,
                minWidth: Math.max(WEB_BROWSER_CONFIG.MIN_WIDTH || 100, nodeWidth),
                minHeight: nodeHeight,
            }}
            resizable={true}
            resizeConfig={{
                color: WEB_BROWSER_CONFIG.RESIZE_COLOR,
                minWidth: Math.max(WEB_BROWSER_CONFIG.MIN_WIDTH || 100, nodeWidth),
                minHeight: nodeHeight,
            }}
            onDelete={deleteNode}
            onUpdateData={updateNodeData}
        >
            {({ handleDelete, handleUpdateData }) => (
                <div className="relative">
                    {/* Floating controls - positioned above the node */}
                    <NodeControls
                        node={nodeData}
                        nodeId={id}
                        onSetViewportMode={setViewportMode}
                        onUpdateViewport={handleUpdateViewport}
                        isVisible={selected && showControls}
                    />
                    
                    {/* Main node content */}
                    <div 
                        className="relative h-full flex flex-col"
                        onMouseEnter={handleMouseActivity}
                        onMouseMove={handleMouseActivity}
                    >
                        <NodeHeader 
                            node={nodeData} 
                            onDelete={handleDelete} 
                            isCompact={isCompact}
                        />
                        
                        {/* Main preview area - flex-1 takes remaining space */}
                        <div className="flex-1 min-h-0">
                            <NodePreview
                                node={nodeData}
                                nodeId={id}
                                onLoadError={handleLoadError}
                                onLoadSuccess={handleLoadSuccess}
                                isCompact={isCompact}
                            />
                        </div>
                    </div>
                </div>
            )}
        </BaseNodeWrapper>
    );
};

export default webNode;