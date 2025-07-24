'use client';
import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { ProjectHeader } from '@/components/project/ProjectHeader';
import { ProjectFilters } from '@/components/project/ProjectFilters';
import { ProjectGrid } from '@/components/project/ProjectGrid';
import { ProjectCreateForm } from '@/components/project/ProjectCreateForm';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import { useProjects } from '@/hooks/useProjects';

const DashboardPage = () => {
  const {
    projects,
    loading,
    error,
    activeTab,
    setActiveTab,
    searchTerm,
    handleSearchChange,
    handleToggleStar,
    handleCreateProject,
    handleDeleteProject
  } = useProjects();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    projectId: null,
    projectTitle: '',
    isLoading: false
  });

  const handleNewProject = () => {
    setShowCreateForm(true);
  };

  const handleDeleteClick = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    setDeleteConfirmation({
      isOpen: true,
      projectId,
      projectTitle: project?.title || 'Unknown Project',
      isLoading: false
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmation.projectId) return;

    setDeleteConfirmation(prev => ({ ...prev, isLoading: true }));

    try {
      await handleDeleteProject(deleteConfirmation.projectId);
      setDeleteConfirmation({
        isOpen: false,
        projectId: null,
        projectTitle: '',
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to delete project:', error);
      // Keep dialog open on error, remove loading state
      setDeleteConfirmation(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleDeleteCancel = () => {
    if (deleteConfirmation.isLoading) return;
    setDeleteConfirmation({
      isOpen: false,
      projectId: null,
      projectTitle: '',
      isLoading: false
    });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Sidebar />
      
      {/* Main content with responsive left margin */}
      <div className="ml-16 transition-all duration-300 px-6 py-4">
        <ProjectHeader onNewProject={handleNewProject} />
        
        <ProjectFilters
          activeTab={activeTab}
          onTabChange={setActiveTab}
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
        />
        
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="text-gray-500">Loading projects...</div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center py-8">
            <div className="text-red-500">Error: {error}</div>
          </div>
        ) : (
          <ProjectGrid 
            projects={projects} 
            onToggleStar={handleToggleStar}
            onDelete={handleDeleteClick}
          />
        )}
      </div>

      {showCreateForm && (
        <ProjectCreateForm
          onClose={() => setShowCreateForm(false)}
          onSubmit={handleCreateProject}
        />
      )}

      <ConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleteConfirmation.projectTitle}"? This action will permanently remove the project and any associated sandbox environment.`}
        confirmText="Delete Project"
        cancelText="Cancel"
        type="danger"
        isLoading={deleteConfirmation.isLoading}
      />
    </div>
  );
};

export default DashboardPage;