import { ProjectCard } from '@/components/project/ProjectCard';

export const ProjectGrid = ({ projects, onToggleStar, onDelete }) => {
  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No projects found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {projects.map(project => (
        <ProjectCard
          key={project.id}
          project={project}
          onToggleStar={onToggleStar}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};