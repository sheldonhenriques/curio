import { Star, MoreHorizontal, Clock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { COLOR_THEMES } from '@/constants/colors';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

export const ProjectCard = ({ project, onToggleStar }) => {
  const colorClass = COLOR_THEMES[project.color]?.card || 'border-t-gray-500 bg-gray-50';

  return (
    <Link href={`/projects/${project.id}`}>
      <div className={`bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 ${colorClass} border-t-4 p-6 transition-transform duration-200 hover:scale-[1.02]`}>
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
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{project.description}</p>

        {/* Sandbox Status Indicator */}
        {project.sandboxStatus && (
          <div className="flex items-center gap-2 mb-2">
            {project.sandboxStatus === 'creating' && (
              <>
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                <span className="text-sm text-blue-600 dark:text-blue-400">Setting up sandbox...</span>
              </>
            )}
            {project.sandboxStatus === 'created' && (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 dark:text-green-400">Sandbox ready</span>
              </>
            )}
            {project.sandboxStatus === 'failed' && (
              <>
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600 dark:text-red-400">Sandbox setup failed</span>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-gray-500  dark:text-gray-300">
            <Clock size={14} />
            <span>Updated {project.updatedAt}</span>
          </div>
        </div>

        {/* Team and Tags */}
        <div className="flex items-center justify-between mt-3 pt-4 border-t border-gray-100">
          <div className="flex items-center">
            {project.team.slice(0, 3).map((member, index) => (
              <Avatar
                key={index}
                className={`z-${3 - index} -ml-1 ${index === 0 ? "ml-0" : ""}`}
              >
                {member}
              </Avatar>
            ))}
            {project.team.length > 3 && (
              <Avatar className="z-0 -ml-2">
                +{project.team.length - 3}
              </Avatar>
            )}
          </div>
          <div className="flex items-center gap-2">
            {project.tags.map((tag, index) => (
              <Badge key={index}>{tag}</Badge>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
};