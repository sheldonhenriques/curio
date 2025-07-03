export const Button = ({ 
  children, 
  variant = "primary", 
  size = "md", 
  onClick,
  className = "",
  ...props 
}) => {
  const variants = {
    primary: "bg-black text-white hover:bg-gray-800",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    ghost: "text-gray-400 hover:text-gray-600"
  };

  const sizes = {
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3"
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg font-medium transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};