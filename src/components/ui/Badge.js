export const Badge = ({ children, variant = "default" }) => {
  const variants = {
    default: "px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md",
    overdue: "flex items-center gap-1 text-red-600 text-sm"
  };

  return (
    <span className={variants[variant]}>
      {children}
    </span>
  );
};