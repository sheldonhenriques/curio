import ChecklistItem from '@/components/checklist/ChecklistItem';

const ChecklistBody = ({ items, onToggleItem, onDeleteItem, maxHeight = 400 }) => (
  <main 
    className="p-4 space-y-2 max-h-[600px] overflow-y-auto" 
    style={{ maxHeight: `${maxHeight}px` }}
  >
    {items.length === 0 ? (
      <div className="text-center py-8">
        <p className="text-gray-500 text-sm mb-2">No items yet</p>
        <p className="text-gray-400 text-xs">Add your first item below!</p>
      </div>
    ) : (
      items.map((item) => (
        <ChecklistItem
          key={item.id}
          item={item}
          onToggle={onToggleItem}
          onDelete={onDeleteItem}
        />
      ))
    )}
  </main>
);

export default ChecklistBody;