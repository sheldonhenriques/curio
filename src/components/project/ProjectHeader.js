import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const ProjectHeader = ({ onNewProject }) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
      <Button onClick={onNewProject}>
        <Plus size={20} />
        New Project
      </Button>
    </div>
  );
};