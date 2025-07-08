import { useState, useCallback, useMemo } from 'react';
import BaseNodeWrapper from '@/components/nodes/base/BaseNodeWrapper';
import ChecklistHeader from '@/components/nodes/checklist/ChecklistHeader';
import ChecklistBody from '@/components/nodes/checklist/ChecklistBody';
import AddItemInput from '@/components/nodes/checklist/AddItemInput';
import { useNodeManagement } from '@/hooks/useNodeManagement';
import { CHECKLIST_CONFIG } from '@/constants/nodeConfig';
import { nodeHelpers } from '@/utils/nodeHelpers';

const SIZE_OPTIONS = [
  CHECKLIST_CONFIG.SIZES.EXTRA_SMALL,
  CHECKLIST_CONFIG.SIZES.SMALL,
  CHECKLIST_CONFIG.SIZES.MEDIUM,
  CHECKLIST_CONFIG.SIZES.LARGE,
  CHECKLIST_CONFIG.SIZES.EXTRA_LARGE
];

const ChecklistNode = ({ data, selected, id }) => {
  const [items, setItems] = useState(data?.items || []);
  const [newItem, setNewItem] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [sizeIndex, setSizeIndex] = useState(data?.sizeIndex || 0);

  const { updateNodeData, deleteNode } = useNodeManagement();

  const title = data?.title || 'Checklist';
  const maxItems = data?.maxItems || CHECKLIST_CONFIG.MAX_ITEMS;

  const progress = useMemo(() => nodeHelpers.calculateProgress(items), [items]);
  const completedCount = useMemo(() => items.filter(item => item.completed).length, [items]);
  const canAddMore = items.length < maxItems;
  const currentSize = SIZE_OPTIONS[sizeIndex];

  const toggleSize = useCallback(() => {
    const newSizeIndex = (sizeIndex + 1) % SIZE_OPTIONS.length;
    setSizeIndex(newSizeIndex);
    updateNodeData(id, { sizeIndex: newSizeIndex });
  }, [sizeIndex, id, updateNodeData]);

  const handleAddItem = useCallback(() => {
    if (!nodeHelpers.validateItemText(newItem) || !canAddMore) return;

    setIsAddingItem(true);

    const newItemObj = {
      id: nodeHelpers.generateUniqueId(),
      text: nodeHelpers.formatItemText(newItem),
      completed: false,
      createdAt: new Date().toISOString()
    };

    const updatedItems = [...items, newItemObj];
    setItems(updatedItems);
    setNewItem('');
    updateNodeData(id, { items: updatedItems });

    setTimeout(() => setIsAddingItem(false), 100);
  }, [newItem, canAddMore, items, id, updateNodeData]);

  const handleToggleItem = useCallback((itemId) => {
    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    setItems(updatedItems);
    updateNodeData(id, { items: updatedItems });
  }, [items, id, updateNodeData]);

  const handleDeleteItem = useCallback((itemId) => {
    const updatedItems = items.filter(item => item.id !== itemId);
    setItems(updatedItems);
    updateNodeData(id, { items: updatedItems });
  }, [items, id, updateNodeData]);

  const handleNewItemChange = useCallback((value) => {
    setNewItem(value);
  }, []);

  return (
    <BaseNodeWrapper
      id={id}
      data={data}
      selected={selected}
      style={{
        width: currentSize.width,
        minWidth: CHECKLIST_CONFIG.MIN_WIDTH,
      }}
      resizable={true}
      resizeConfig={{
        color: CHECKLIST_CONFIG.RESIZE_COLOR,
        minWidth: CHECKLIST_CONFIG.MIN_WIDTH,
      }}
      onDelete={deleteNode}
      onUpdateData={updateNodeData}
    >
      {({ handleDelete, handleUpdateData }) => (
        <>
          <ChecklistHeader
            title={title}
            completedCount={completedCount}
            totalCount={items.length}
            progress={progress}
            onResizeClick={toggleSize}
            isMaxSize={sizeIndex === SIZE_OPTIONS.length - 1}
          />

          <ChecklistBody
            items={items}
            onToggleItem={handleToggleItem}
            onDeleteItem={handleDeleteItem}
          />

          <footer className="p-4 border-t border-gray-200">
            <AddItemInput
              value={newItem}
              onChange={handleNewItemChange}
              onAdd={handleAddItem}
              disabled={isAddingItem || !canAddMore}
              placeholder={
                !canAddMore
                  ? `Maximum ${maxItems} items reached`
                  : "Add a new item and press Enter"
              }
            />
            {!canAddMore && (
              <p className="text-xs text-gray-500 mt-1">
                Maximum number of items reached
              </p>
            )}
          </footer>
        </>
      )}
    </BaseNodeWrapper>
  );
};

export default ChecklistNode;