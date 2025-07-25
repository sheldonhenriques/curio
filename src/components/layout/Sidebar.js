import { NAVIGATION_ITEMS } from '@/constants/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LogOut } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export const Sidebar = () => {
  const { user, loading, getInitials, getDisplayName } = useAuth();
  return (
    <div className="group fixed left-0 top-0 h-full w-16 hover:w-64 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-700 p-4 transition-all duration-300 ease-in-out z-50">
      {/* Logo and Title */}
      <div className="flex items-center gap-2 justify-center group-hover:justify-start mb-6 transition-all duration-300">
        <Image
          src="/logo.svg"
          alt="Curio Logo"
          width={32}
          height={32}
          className="w-8 h-8 rounded transition-transform duration-300 flex-shrink-0"
        />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
          Curio
        </h1>
      </div>

      {/* Navigation */}
      <nav className="space-y-2">
        {NAVIGATION_ITEMS.map(({ id, label, icon: Icon, href, active }) => (
          <Link key={id} href={href}>
            <div
              className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-300 cursor-pointer relative ${
                active
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
                {label}
              </span>
              
              {/* Tooltip for collapsed state */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm rounded opacity-0 group-hover:opacity-0 hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 pointer-events-none">
                {label}
              </div>
            </div>
          </Link>
        ))}
      </nav>

      {/* User Profile */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="flex items-center gap-3 p-2 transition-all duration-300">
          <div className="w-8 h-8 bg-gray-400 dark:bg-gray-600 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
            {loading ? '...' : getInitials(user?.email)}
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden flex-1">
            <div className="font-medium text-gray-900 dark:text-white whitespace-nowrap">
              {loading ? 'Loading...' : getDisplayName(user)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {loading ? 'Loading...' : (user?.email || 'No email')}
            </div>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={async () => {
                const { createClient } = await import('@/utils/supabase/client');
                const supabase = createClient();
                try {
                  await supabase.auth.signOut();
                  window.location.href = '/login';
                } catch (error) {
                  console.error('Error signing out:', error);
                }
              }}
              className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
