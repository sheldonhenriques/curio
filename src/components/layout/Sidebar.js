import { NAVIGATION_ITEMS } from '@/constants/navigation';

export const Sidebar = () => {
  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 p-4">
      <nav className="space-y-2">
        {NAVIGATION_ITEMS.map(({ id, label, icon: Icon, active }) => (
          <div
            key={id}
            className={`flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer ${
              active
                ? 'bg-gray-100 text-gray-900 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </div>
        ))}
      </nav>

      {/* User Profile */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="flex items-center gap-3 p-2">
          <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white font-medium">
            JD
          </div>
          <div>
            <div className="font-medium text-gray-900">John Doe</div>
            <div className="text-sm text-gray-500">john@example.com</div>
          </div>
        </div>
      </div>
    </div>
  );
};