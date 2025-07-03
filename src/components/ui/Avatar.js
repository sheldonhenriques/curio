export const Avatar = ({ children, className = "" }) => {
  return (
    <div
      className={`w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium text-gray-700 ring-2 ring-white ${className}`}
    >
      {children}
    </div>
  );
};
