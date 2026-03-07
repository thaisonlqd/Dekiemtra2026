import { Check } from 'lucide-react';
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
    { id: AppStep.INPUT, label: 'Cấu hình' },
    { id: AppStep.MATRIX, label: 'Ma trận' },
    { id: AppStep.SPECS, label: 'Đặc tả' },
    { id: AppStep.EXAM, label: 'Đề thi' },
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
                "w-8 h-8 flex items-center justify-center border-2 transition-colors",
                theme === 'classic' ? "rounded-none border-black" : "rounded-full",
                isCompleted || isCurrent 
                  ? (theme === 'classic' ? "bg-black text-white" : "bg-indigo-600 border-indigo-600 text-white")
                  : (theme === 'classic' ? "bg-white text-black" : "bg-white border-gray-300 text-gray-400")
              )}>
                {isCompleted ? <Check className="w-4 h-4" /> : <span>{index + 1}</span>}
              </div>
              <span className={cn(
                "text-xs font-medium",
                isCurrent ? (theme === 'classic' ? "text-black font-bold" : "text-indigo-600") : "text-gray-500"
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
