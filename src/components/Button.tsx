import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { ReactNode } from 'react';
import { useTheme } from '../ThemeContext';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary';
}

export default function Button({ 
  children, 
  isLoading, 
  icon, 
  variant = 'primary', 
  className, 
  disabled, 
  ...props 
}: ButtonProps) {
  const theme = useTheme();

  const baseClasses = "flex items-center justify-center gap-2 font-medium transition-all active:scale-[0.98] px-4 py-2";
  
  const modernClasses = variant === 'primary' 
    ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20 rounded-lg" 
    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg";

  const classicClasses = variant === 'primary'
    ? "bg-black text-white border-2 border-black hover:bg-gray-800 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
    : "bg-white text-black border-2 border-black hover:bg-gray-100 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]";

  return (
    <button
      disabled={disabled || isLoading}
      className={cn(
        baseClasses,
        theme === 'classic' ? classicClasses : modernClasses,
        disabled && "opacity-50 cursor-not-allowed shadow-none translate-x-0 translate-y-0",
        className
      )}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}
