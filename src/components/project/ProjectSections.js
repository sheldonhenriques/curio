export const ProjectSections = ({ sections, title }) => {
  const getSectionTitle = (title, index) => {
    const sectionTitles = {
      "Product Roadmap": ["Roadmap", "Features", "Releases", "Milestones"],
      "Marketing Campaign": ["Campaign", "Content", "Channels", "Checklist"],
      "Website Redesign": ["Website", "Design", "Development", "Milestones"]
    };
    
    return sectionTitles[title]?.[index] || sections[index]?.name || `Item ${index + 1}`;
  };

  return (
    <div className="mb-6">
      <div className="grid grid-cols-3 gap-4 mb-4">
        {sections.slice(0, 3).map((section, index) => (
          <div key={index} className="text-center">
            <div className="text-sm font-medium text-gray-900 mb-1">
              {getSectionTitle(title, index)}
            </div>
            <div className="text-xs text-gray-500">{section.status}</div>
          </div>
        ))}
      </div>
      
      {sections.length > 3 && (
        <div className="flex justify-center">
          <div className="text-center">
            <div className="text-sm font-medium text-gray-900 mb-1">
              {getSectionTitle(title, 3)}
            </div>
            <div className="text-xs text-gray-500">Concept</div>
          </div>
        </div>
      )}
    </div>
  );
};