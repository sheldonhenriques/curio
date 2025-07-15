'use client';
import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { ProjectHeader } from '@/components/project/ProjectHeader';
import { ProjectFilters } from '@/components/project/ProjectFilters';
import { ProjectGrid } from '@/components/project/ProjectGrid';
import { ProjectCreateForm } from '@/components/project/ProjectCreateForm';
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
    handleCreateProject
  } = useProjects();

  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleNewProject = () => {
    setShowCreateForm(true);
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
          />
        )}
      </div>

      {showCreateForm && (
        <ProjectCreateForm
          onClose={() => setShowCreateForm(false)}
          onSubmit={handleCreateProject}
        />
      )}
    </div>
  );
};

export default DashboardPage;