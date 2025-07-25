import {
  LayoutDashboard,
  Users,
  Book,
  HelpCircle,
  Settings
} from 'lucide-react';

export const NAVIGATION_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', active: true },
  { id: 'team', label: 'Team', icon: Users, href: '/team', active: false },
  { id: 'documentation', label: 'Documentation', icon: Book, href: '/documentation', active: false },
  { id: 'help', label: 'Help', icon: HelpCircle, href: '/help', active: false },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings', active: false }
];

export const PROJECT_TABS = [
  { id: 'all', label: 'All Projects' },
  { id: 'recent', label: 'Recent' },
  { id: 'starred', label: 'Starred' }
];