export const Tabs = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="flex items-center gap-1 border-b border-gray-200">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === tab.id
              ? 'border-black text-black dark:text-white dark:border-white'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};