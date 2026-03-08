import { Check, Settings2, Grid3X3, FileText, FileQuestion } from 'lucide-react';
import { AppStep } from '../types';
import { cn } from '../lib/utils';
import { useTheme } from '../ThemeContext';

interface StepIndicatorProps {
  currentStep: AppStep;
  setStep: (step: AppStep) => void;
  completedSteps: number;
}

export default function StepIndicator({ currentStep, setStep, completedSteps }: StepIndicatorProps) {
  const theme = useTheme();
  
  const steps = [
    { id: AppStep.INPUT, label: 'Cấu hình', icon: Settings2 },
    { id: AppStep.MATRIX, label: 'Ma trận', icon: Grid3X3 },
    { id: AppStep.SPECS, label: 'Đặc tả', icon: FileText },
    { id: AppStep.EXAM, label: 'Đề thi', icon: FileQuestion },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between relative">
        <div className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 -z-10",
          theme === 'classic' ? "bg-black" : "bg-gray-200"
        )} />
        
        {steps.map((step, index) => {
          const isCompleted = completedSteps > index;
          const isCurrent = currentStep === step.id;
          const isClickable = completedSteps >= index;
          const Icon = step.icon;

          return (
            <button
              key={step.id}
              onClick={() => isClickable && setStep(step.id)}
              disabled={!isClickable}
              className={cn(
                "flex flex-col items-center gap-2 bg-white px-2 z-10",
                !isClickable && "cursor-not-allowed opacity-50"
              )}
            >
              <div className={cn(
                "w-10 h-10 flex items-center justify-center border-2 transition-colors",
                theme === 'classic' ? "rounded-none border-black" : "rounded-full",
                isCompleted || isCurrent 
                  ? (theme === 'classic' ? "bg-sky-100 text-black border-black" : "bg-sky-100 border-sky-300 text-black shadow-sm")
                  : (theme === 'classic' ? "bg-white text-black border-black" : "bg-white border-gray-300 text-gray-400")
              )}>
                {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span className={cn(
                "text-xs font-medium",
                isCurrent ? (theme === 'classic' ? "text-black font-bold" : "text-black font-bold") : "text-black"
              )}>
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
