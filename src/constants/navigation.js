import {
  LayoutDashboard,
  Users,
  Book,
  HelpCircle,
  Settings
} from 'lucide-react';

export const NAVIGATION_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, active: true },
  { id: 'team', label: 'Team', icon: Users, active: false },
  { id: 'documentation', label: 'Documentation', icon: Book, active: false },
  { id: 'help', label: 'Help', icon: HelpCircle, active: false },
  { id: 'settings', label: 'Settings', icon: Settings, active: false }
];

export const PROJECT_TABS = [
  { id: 'all', label: 'All Projects' },
  { id: 'recent', label: 'Recent' },
  { id: 'starred', label: 'Starred' }
];