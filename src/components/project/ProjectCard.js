import { Star, MoreHorizontal, Clock, AlertCircle } from 'lucide-react';
import { COLOR_THEMES } from '@/constants/colors';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ProjectSections } from '@/components/project/ProjectSections';

export const ProjectCard = ({ project, onToggleStar }) => {
  const colorClass = COLOR_THEMES[project.color]?.card || 'border-t-gray-500 bg-gray-50';

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 border-t-4 p-6`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{project.title}</h3>
          <button
            onClick={() => onToggleStar(project.id)}
            className={`p-1 rounded transition-colors ${
              project.starred ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
            }`}
          >
            <Star size={16} fill={project.starred ? 'currentColor' : 'none'} />
          </button>
        </div>
        <button className="text-gray-400 hover:text-gray-600 transition-colors">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{project.description}</p>

      {/* Project sections */}
      <ProjectSections sections={project.sections} title={project.title} />

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-gray-300 rounded-sm flex items-center justify-center">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-500">Progress</span>
          </div>
          <span className="text-sm text-gray-600  dark:text-gray-400">
            {project.progress}/{project.totalTasks} tasks
          </span>
        </div>
        <ProgressBar 
          progress={project.progress} 
          total={project.totalTasks} 
          color={project.color} 
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500  dark:text-gray-300">
          <Clock size={14} />
          <span>Updated {project.updatedAt}</span>
        </div>
        <div className="flex items-center gap-2">
          {project.status === 'overdue' && (
            <Badge variant="overdue">
              <AlertCircle size={14} />
              <span>Overdue</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Team and Tags */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {project.team.map((member, index) => (
            <Avatar key={index}>{member}</Avatar>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {project.tags.map((tag, index) => (
            <Badge key={index}>{tag}</Badge>
          ))}
        </div>
      </div>
    </div>
  );
};