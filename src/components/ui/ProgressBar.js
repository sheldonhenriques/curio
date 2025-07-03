import { COLOR_THEMES } from '@/constants/colors';

export const ProgressBar = ({ progress, total, color }) => {
  const percentage = (progress / total) * 100;
  const colorClass = COLOR_THEMES[color]?.progress || 'bg-gray-600';

  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className={`h-2 rounded-full ${colorClass}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};