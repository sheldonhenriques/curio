import { Star, MoreHorizontal, Clock, Loader2, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { COLOR_THEMES } from '@/constants/colors';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { useRouter } from 'next/navigation';
import Dropdown, { DropdownItem } from '@/components/ui/Dropdown';
import { formatUpdatedAt } from '@/utils/dateFormatter';

export const ProjectCard = ({ project, onToggleStar, onDelete }) => {
  const colorClass = COLOR_THEMES[project.color]?.card || 'border-t-gray-500 bg-gray-50';
  const router = useRouter();

  const handleCardClick = () => {
    if (isDisabled) {
      return;
    }
    
    router.push(`/projects/${project.id}`);
  };

  const handleStarClick = (e) => {
    e.stopPropagation();
    onToggleStar(project.id);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete(project.id);
  };

  const handleDropdownClick = (e) => {
    e.stopPropagation();
  };

  const isSettingUp = project.sandboxStatus && [
    'creating',
    'starting', 
    'created',
    'setting_up_nextjs',
    'installing_claude_sdk',
    'configuring_editor',
    'installing_dependencies',
    'optimizing_project',
    'starting_server',
    'finalizing'
  ].includes(project.sandboxStatus);
  
  const isChecking = project.sandboxId && !project.sandboxStatus;
  const isDisabled = isSettingUp || isChecking;

  return (
    <div 
      className={`bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 ${colorClass} border-t-4 p-6 transition-transform duration-200 ${
        isDisabled 
          ? 'opacity-75 cursor-not-allowed' 
          : 'hover:scale-[1.02] cursor-pointer'
      }`}
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{project.title}</h3>
          <button
            onClick={handleStarClick}
            className={`p-1 rounded transition-colors ${
              project.starred ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
            }`}
          >
            <Star size={16} fill={project.starred ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div onClick={handleDropdownClick}>
          <Dropdown
            trigger={
              <button className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                <MoreHorizontal size={20} />
              </button>
            }
            align="right"
          >
            {({ closeDropdown }) => (
              <DropdownItem
                onClick={(e) => {
                  handleDeleteClick(e);
                  closeDropdown();
                }}
                variant="danger"
              >
                <div className="flex items-center gap-2">
                  <Trash2 size={16} />
                  Delete Project
                </div>
              </DropdownItem>
            )}
          </Dropdown>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{project.description}</p>

      {/* Sandbox Status Indicator */}
      {(project.sandboxStatus || project.sandboxId) && (
        <div className="flex items-center gap-2 mb-2">
          {project.sandboxStatus === 'creating' && (
            <>
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              <span className="text-sm text-blue-600 dark:text-blue-400">Setting up sandbox...</span>
            </>
          )}
          {project.sandboxStatus === 'starting' && (
            <>
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              <span className="text-sm text-blue-600 dark:text-blue-400">Starting sandbox...</span>
            </>
          )}
          {project.sandboxStatus === 'started' && (
            <>
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600 dark:text-green-400">Ready to use</span>
            </>
          )}
          {project.sandboxStatus === 'stopped' && (
            <>
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-yellow-600 dark:text-yellow-400">Sandbox stopped</span>
            </>
          )}
          {project.sandboxStatus === 'created' && (
            <>
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              <span className="text-sm text-blue-600 dark:text-blue-400">Initializing project...</span>
            </>
          )}
          {project.sandboxStatus === 'setting_up_nextjs' && (
            <>
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              <span className="text-sm text-blue-600 dark:text-blue-400">Setting up Next.js...</span>
            </>
          )}
          {project.sandboxStatus === 'installing_claude_sdk' && (
            <>
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              <span className="text-sm text-blue-600 dark:text-blue-400">Installing AI tools...</span>
            </>
          )}
          {project.sandboxStatus === 'configuring_editor' && (
            <>
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              <span className="text-sm text-blue-600 dark:text-blue-400">Configuring visual editor...</span>
            </>
          )}
          {project.sandboxStatus === 'installing_dependencies' && (
            <>
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              <span className="text-sm text-blue-600 dark:text-blue-400">Installing dependencies...</span>
            </>
          )}
          {project.sandboxStatus === 'optimizing_project' && (
            <>
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              <span className="text-sm text-blue-600 dark:text-blue-400">Optimizing project...</span>
            </>
          )}
          {project.sandboxStatus === 'starting_server' && (
            <>
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              <span className="text-sm text-blue-600 dark:text-blue-400">Starting dev server...</span>
            </>
          )}
          {project.sandboxStatus === 'finalizing' && (
            <>
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              <span className="text-sm text-blue-600 dark:text-blue-400">Finalizing setup...</span>
            </>
          )}
          {(project.sandboxStatus === 'failed' || project.sandboxStatus === 'error' || project.sandboxStatus === 'not_found') && (
            <>
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-600 dark:text-red-400">Sandbox unavailable</span>
            </>
          )}
          {(project.sandboxId && !project.sandboxStatus) && (
            <>
              <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Checking...</span>
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-sm text-gray-500  dark:text-gray-300">
          <Clock size={14} />
          <span>Updated {formatUpdatedAt(project.updated_at || project.updatedAt)}</span>
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
  );
};