import { useState, useCallback, useMemo } from 'react';
import { NodeResizer } from 'reactflow';

import ChecklistHeader from '@/components/checklist/ChecklistHeader';
import ChecklistBody from '@/components/checklist/ChecklistBody';
import AddItemInput from '@/components/checklist/AddItemInput';
import ConnectionHandles from '@/components/checklist/ConnectionHandles';

import { CHECKLIST_CONFIG } from '@/constants/nodeConfig';
import { nodeHelpers } from '@/utils/nodeHelpers';

const SIZE_OPTIONS = [
  CHECKLIST_CONFIG.SIZES.EXTRA_SMALL,
  CHECKLIST_CONFIG.SIZES.SMALL,
  CHECKLIST_CONFIG.SIZES.MEDIUM,
  CHECKLIST_CONFIG.SIZES.LARGE,
  CHECKLIST_CONFIG.SIZES.EXTRA_LARGE
];

const ChecklistNode = ({ data, selected }) => {
  const [items, setItems] = useState(data?.items || []);
  const [newItem, setNewItem] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [sizeIndex, setSizeIndex] = useState(0); // default to EXTRA_SMALL

  const title = data?.title || 'Checklist';
  const maxItems = data?.maxItems || CHECKLIST_CONFIG.MAX_ITEMS;

  const progress = useMemo(() => nodeHelpers.calculateProgress(items), [items]);
  const completedCount = useMemo(() => items.filter(item => item.completed).length, [items]);
  const canAddMore = items.length < maxItems;

  const currentSize = SIZE_OPTIONS[sizeIndex];

  const toggleSize = () => {
    setSizeIndex((prevIndex) => (prevIndex + 1) % SIZE_OPTIONS.length);
  };

  const handleAddItem = useCallback(() => {
    if (!nodeHelpers.validateItemText(newItem) || !canAddMore) return;

    setIsAddingItem(true);

    const newItemObj = {
      id: nodeHelpers.generateUniqueId(),
      text: nodeHelpers.formatItemText(newItem),
      completed: false,
      createdAt: new Date().toISOString()
    };

    setItems(prevItems => [...prevItems, newItemObj]);
    setNewItem('');

    setTimeout(() => setIsAddingItem(false), 100);
  }, [newItem, canAddMore]);

  const handleToggleItem = useCallback((id) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  }, []);

  const handleDeleteItem = useCallback((id) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
  }, []);

  const handleNewItemChange = useCallback((value) => {
    setNewItem(value);
  }, []);

  return (
    <div
      className="bg-white rounded-lg shadow-lg border border-gray-200 relative"
      style={{
        width: currentSize.width,
        minWidth: CHECKLIST_CONFIG.MIN_WIDTH,
      }}
    >
      <NodeResizer
        color={CHECKLIST_CONFIG.RESIZE_COLOR}
        isVisible={selected}
        minWidth={CHECKLIST_CONFIG.MIN_WIDTH}
      />

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

      <ConnectionHandles />
    </div>
  );
};

export default ChecklistNode;
