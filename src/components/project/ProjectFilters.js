import { Tabs } from '@/components/ui/Tabs';
import { SearchInput } from '@/components/ui/SearchInput';
import { PROJECT_TABS } from '@/constants/navigation';

export const ProjectFilters = ({ 
  activeTab, 
  onTabChange, 
  searchTerm, 
  onSearchChange 
}) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <Tabs 
        tabs={PROJECT_TABS} 
        activeTab={activeTab} 
        onTabChange={onTabChange} 
      />
      <SearchInput
        value={searchTerm}
        onChange={onSearchChange}
        placeholder="Search projects..."
      />
    </div>
  );
};