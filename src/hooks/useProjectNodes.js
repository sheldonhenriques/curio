import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';

export function useProjectNodes(projectId, userId) {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const supabase = createClient();
  
  // Debounce timeout ref for batch operations
  const debounceTimeoutRef = useRef(null);
  const pendingUpdatesRef = useRef(new Map());
  
  // Generate storage key for this project
  const storageKey = `curio_nodes_${projectId}_${userId}`;
  
  // Save pending changes to localStorage
  const savePendingToStorage = useCallback((nodeId, updates) => {
    if (!projectId || !userId) return;
    
    try {
      const existingData = localStorage.getItem(storageKey);
      const pendingData = existingData ? JSON.parse(existingData) : {};
      
      pendingData[nodeId] = {
        ...pendingData[nodeId],
        ...updates,
        timestamp: Date.now()
      };
      
      localStorage.setItem(storageKey, JSON.stringify(pendingData));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [storageKey, projectId, userId]);
  
  // Clear pending changes from localStorage
  const clearPendingFromStorage = useCallback((nodeId) => {
    if (!projectId || !userId) return;
    
    try {
      const existingData = localStorage.getItem(storageKey);
      if (existingData) {
        const pendingData = JSON.parse(existingData);
        delete pendingData[nodeId];
        
        if (Object.keys(pendingData).length === 0) {
          localStorage.removeItem(storageKey);
        } else {
          localStorage.setItem(storageKey, JSON.stringify(pendingData));
        }
      }
    } catch (error) {
      console.error('Error clearing from localStorage:', error);
    }
  }, [storageKey, projectId, userId]);
  
  // Apply pending changes from localStorage to nodes
  const applyPendingChanges = useCallback((fetchedNodes) => {
    if (!projectId || !userId) return fetchedNodes;
    
    try {
      const existingData = localStorage.getItem(storageKey);
      if (!existingData) return fetchedNodes;
      
      const pendingData = JSON.parse(existingData);
      
      return fetchedNodes.map(node => {
        const pending = pendingData[node.id];
        if (pending) {
          // Only apply changes that are recent (within last 30 seconds)
          const isRecent = Date.now() - pending.timestamp < 30000;
          if (isRecent) {
            return {
              ...node,
              position: pending.position || node.position,
              data: pending.data ? { ...node.data, ...pending.data } : node.data,
              style: pending.style ? { ...node.style, ...pending.style } : node.style
            };
          } else {
            // Clean up old pending changes
            clearPendingFromStorage(node.id);
          }
        }
        return node;
      });
    } catch (error) {
      console.error('Error applying pending changes:', error);
      return fetchedNodes;
    }
  }, [storageKey, projectId, userId, clearPendingFromStorage]);

  // Fetch nodes from database
  const fetchNodes = useCallback(async () => {
    if (!projectId || !userId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('project_nodes')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      // Transform database nodes to ReactFlow format
      const transformedNodes = data.map(dbNode => ({
        id: dbNode.node_id,
        type: dbNode.type,
        position: dbNode.position,
        data: dbNode.data,
        style: dbNode.style,
        // Keep database fields for updates
        _dbId: dbNode.id,
        _userId: dbNode.user_id,
        _projectId: dbNode.project_id
      }));

      // Apply any pending changes from localStorage
      const nodesWithPending = applyPendingChanges(transformedNodes);
      setNodes(nodesWithPending);
    } catch (err) {
      console.error('Error fetching nodes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, userId, supabase, applyPendingChanges]);

  // Create new node
  const createNode = useCallback(async (nodeData) => {
    if (!projectId || !userId) return null;

    try {
      const nodeId = crypto.randomUUID();
      
      const newDbNode = {
        node_id: nodeId,
        project_id: projectId,
        user_id: userId,
        type: nodeData.type,
        position: nodeData.position || { x: 0, y: 0 },
        data: nodeData.data || {},
        style: nodeData.style || {}
      };

      const { data, error: createError } = await supabase
        .from('project_nodes')
        .insert([newDbNode])
        .select()
        .single();

      if (createError) throw createError;

      const newNode = {
        id: nodeId,
        type: data.type,
        position: data.position,
        data: data.data,
        style: data.style,
        _dbId: data.id,
        _userId: data.user_id,
        _projectId: data.project_id
      };

      // Optimistic update
      setNodes(prev => [...prev, newNode]);
      
      return newNode;
    } catch (err) {
      console.error('Error creating node:', err);
      setError(err.message);
      return null;
    }
  }, [projectId, userId, supabase]);

  // Update node (with debouncing for performance)
  const updateNode = useCallback(async (nodeId, updates, immediate = false) => {
    if (!nodeId) return;

    // Save to localStorage immediately for persistence across page refreshes
    savePendingToStorage(nodeId, updates);

    // Optimistic update first
    setNodes(prev => prev.map(node => 
      node.id === nodeId 
        ? { ...node, ...updates }
        : node
    ));

    // Store pending update
    pendingUpdatesRef.current.set(nodeId, {
      ...pendingUpdatesRef.current.get(nodeId),
      ...updates
    });

    // Clear existing timeout if not immediate
    if (debounceTimeoutRef.current && !immediate) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Execute update function
    const executeUpdate = async () => {
      const pendingUpdate = pendingUpdatesRef.current.get(nodeId);
      if (!pendingUpdate) return;

      try {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        const updateData = {};
        
        // Only include database fields that can be updated
        if (pendingUpdate.position) updateData.position = pendingUpdate.position;
        if (pendingUpdate.data) updateData.data = pendingUpdate.data;
        if (pendingUpdate.style) updateData.style = pendingUpdate.style;

        const { error: updateError } = await supabase
          .from('project_nodes')
          .update(updateData)
          .eq('node_id', nodeId)
          .eq('project_id', projectId)
          .eq('user_id', userId);

        if (updateError) throw updateError;

        // Clear pending update from memory and localStorage
        pendingUpdatesRef.current.delete(nodeId);
        clearPendingFromStorage(nodeId);
      } catch (err) {
        console.error('Error updating node:', err);
        setError(err.message);
        
        // Revert optimistic update on error
        setNodes(prev => prev.map(node => 
          node.id === nodeId 
            ? { ...node, ...pendingUpdate }
            : node
        ));
      }
    };

    if (immediate) {
      executeUpdate();
    } else {
      // Debounce updates (500ms delay)
      debounceTimeoutRef.current = setTimeout(executeUpdate, 500);
    }
  }, [projectId, userId, supabase, nodes, savePendingToStorage, clearPendingFromStorage]);

  // Delete node
  const deleteNode = useCallback(async (nodeId) => {
    if (!nodeId) return;

    try {
      // Optimistic update
      setNodes(prev => prev.filter(node => node.id !== nodeId));

      const { error: deleteError } = await supabase
        .from('project_nodes')
        .delete()
        .eq('node_id', nodeId)
        .eq('project_id', projectId)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Clear any pending updates for this node
      pendingUpdatesRef.current.delete(nodeId);
    } catch (err) {
      console.error('Error deleting node:', err);
      setError(err.message);
      
      // Revert optimistic update - would need to refetch to get the node back
      fetchNodes();
    }
  }, [projectId, userId, supabase, fetchNodes]);

  // Batch update nodes (for drag operations)
  const batchUpdateNodes = useCallback(async (nodeUpdates) => {
    if (!nodeUpdates || nodeUpdates.length === 0) return;

    try {
      // Optimistic updates
      setNodes(prev => prev.map(node => {
        const update = nodeUpdates.find(u => u.id === node.id);
        return update ? { ...node, ...update.changes } : node;
      }));

      // Prepare batch update
      const updates = nodeUpdates.map(({ id, changes }) => ({
        node_id: id,
        project_id: projectId,
        user_id: userId,
        ...changes
      }));

      // Note: Supabase doesn't have built-in batch update, so we'll use Promise.all
      await Promise.all(
        updates.map(update => 
          supabase
            .from('project_nodes')
            .update({
              position: update.position,
              data: update.data,
              style: update.style
            })
            .eq('node_id', update.node_id)
            .eq('project_id', projectId)
            .eq('user_id', userId)
        )
      );
    } catch (err) {
      console.error('Error batch updating nodes:', err);
      setError(err.message);
      // Refetch nodes to ensure consistency
      fetchNodes();
    }
  }, [projectId, userId, supabase, fetchNodes]);

  // Create default AI chat node for new projects
  const createDefaultAIChatNode = useCallback(async (projectData) => {
    const defaultNode = {
      type: 'aichatNode',
      position: { x: 450, y: 400 },
      data: {
        label: 'AI Chat',
        deviceType: 'normal',
        projectId: projectData.id,
        projectName: projectData.title,
        sandboxId: projectData.sandboxId,
        sandboxStatus: projectData.sandboxStatus
      },
      style: { width: 480, height: 600, zIndex: 9999 }
    };

    return createNode(defaultNode);
  }, [createNode]);

  // Function to flush all pending updates immediately
  const flushPendingUpdates = useCallback(async () => {
    const pendingUpdates = Array.from(pendingUpdatesRef.current.entries());
    
    for (const [nodeId, updates] of pendingUpdates) {
      try {
        const updateData = {};
        
        // Only include database fields that can be updated
        if (updates.position) updateData.position = updates.position;
        if (updates.data) updateData.data = updates.data;
        if (updates.style) updateData.style = updates.style;

        await supabase
          .from('project_nodes')
          .update(updateData)
          .eq('node_id', nodeId)
          .eq('project_id', projectId)
          .eq('user_id', userId);

        // Clear from localStorage and memory
        clearPendingFromStorage(nodeId);
        pendingUpdatesRef.current.delete(nodeId);
      } catch (error) {
        console.error('Error flushing pending update:', error);
      }
    }
  }, [supabase, projectId, userId, clearPendingFromStorage]);

  // Initial fetch
  useEffect(() => {
    fetchNodes();
  }, [fetchNodes]);

  // Handle page refresh/unload - flush pending changes
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      // Try to flush pending updates synchronously
      const pendingUpdates = Array.from(pendingUpdatesRef.current.entries());
      
      if (pendingUpdates.length > 0) {
        // For synchronous execution during page unload
        flushPendingUpdates();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [flushPendingUpdates]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    nodes,
    loading,
    error,
    fetchNodes,
    createNode,
    updateNode,
    deleteNode,
    batchUpdateNodes,
    createDefaultAIChatNode
  };
}