import {
  AiOutlineCheckCircle,
  AiOutlineLoading3Quarters,
} from 'react-icons/ai';
import { cn } from '@/lib/utils';

interface ThinkingStep {
  step: string;
  message: string;
  completed: boolean;
}

interface ThinkingStepsProps {
  steps: ThinkingStep[];
}

export function ThinkingSteps({ steps }: ThinkingStepsProps) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 animate-fade-in">
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div
            key={index}
            className={cn(
              'flex items-center gap-3 text-sm transition-all duration-200',
              step.completed ? 'opacity-60' : 'opacity-100',
            )}
          >
            {step.completed ? (
              <AiOutlineCheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            ) : (
              <AiOutlineLoading3Quarters className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
            )}
            <span
              className={cn(
                'transition-colors',
                step.completed ? 'text-gray-600' : 'text-blue-900 font-medium',
              )}
            >
              {step.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
