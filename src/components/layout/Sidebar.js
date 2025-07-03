import { NAVIGATION_ITEMS } from '@/constants/navigation';

export const Sidebar = () => {
  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-700 p-4">
      {/* Add toggle to header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Curio</h1>
      </div>

      <nav className="space-y-2">
        {NAVIGATION_ITEMS.map(({ id, label, icon: Icon, active }) => (
          <div
            key={id}
            className={`flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer ${
              active
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Icon className="w-5 h-5 rounded" />
            <span>{label}</span>
          </div>
        ))}
      </nav>

      {/* User Profile */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="flex items-center gap-3 p-2">
          <div className="w-8 h-8 bg-gray-400 dark:bg-gray-600 rounded-full flex items-center justify-center text-white font-medium">
            JD
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">John Doe</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">john@example.com</div>
          </div>
        </div>
      </div>
    </div>
  );
};