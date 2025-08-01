"use client"

import ChecklistItem from "@/components/nodes/checklist/ChecklistItem"

const ChecklistBody = ({ items, onToggleItem, onDeleteItem, maxHeight = 200 }) => (
  <main className="px-3 py-2 space-y-1 overflow-y-auto" style={{ maxHeight: `${maxHeight}px` }}>
    {items.length === 0 ? (
      <div className="text-center py-4">
        <p className="text-gray-500 text-sm mb-1">No items yet</p>
        <p className="text-gray-400 text-xs">Add your first item below!</p>
      </div>
    ) : (
      items.map((item) => <ChecklistItem key={item.id} item={item} onToggle={onToggleItem} onDelete={onDeleteItem} />)
    )}
  </main>
)

export default ChecklistBody
