export const filterProjects = (projects, activeTab, searchTerm) => {
  return projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'starred') {
      return matchesSearch && project.starred;
    }
    if (activeTab === 'recent') {
      return matchesSearch && ['2 hours ago', 'yesterday', '3 days ago'].includes(project.updatedAt);
    }
    return matchesSearch;
  });
};