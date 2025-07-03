import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const ProjectHeader = ({ onNewProject }) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
      <Button onClick={onNewProject} className="flex items-center gap-2 px-4 py-2 rounded-lg 
             bg-black-600 text-white hover:bg-black-700 
             dark:bg-white dark:text-black dark:hover:bg-gray-200">
        <Plus size={20} />
        New Project
      </Button>
    </div>
  );
};