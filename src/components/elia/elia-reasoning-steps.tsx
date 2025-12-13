'use client';

import {
  AiOutlineCheckCircle,
  AiOutlineLoading3Quarters,
  AiOutlineCloseCircle,
} from 'react-icons/ai';
import {
  BsLightbulb,
  BsSearch,
  BsTag,
  BsFilter,
  BsRulers,
  BsSortDown,
  BsBox,
} from 'react-icons/bs';
import { cn } from '@/lib/utils';
import type { EliaReasoningStep } from '@framework/elia/types';

interface EliaReasoningStepsProps {
  steps: EliaReasoningStep[];
  className?: string;
}

const STEP_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  analyze: BsLightbulb,
  intent: BsLightbulb,
  keywords: BsSearch,
  synonyms: BsTag,
  modifiers: BsSortDown,
  constraints: BsRulers,
  filters: BsFilter,
  ready: AiOutlineCheckCircle,
  error: AiOutlineCloseCircle,
};

export function EliaReasoningSteps({
  steps,
  className,
}: EliaReasoningStepsProps) {
  if (steps.length === 0) return null;

  return (
    <div
      className={cn(
        'bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100',
        'shadow-sm',
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-blue-100">
        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
          <BsLightbulb className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <span className="text-sm font-medium text-blue-900">
          ELIA sta ragionando...
        </span>
      </div>

      <div className="space-y-2">
        {steps.map((step, index) => {
          const Icon = STEP_ICONS[step.id] || BsLightbulb;

          return (
            <div
              key={step.id}
              className={cn(
                'flex items-start gap-3 py-1.5 transition-all duration-300',
                step.status === 'pending' && 'opacity-40',
                step.status === 'error' && 'opacity-100',
              )}
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              {/* Status Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {step.status === 'active' ? (
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                    <AiOutlineLoading3Quarters className="w-3 h-3 text-white animate-spin" />
                  </div>
                ) : step.status === 'completed' ? (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <AiOutlineCheckCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                ) : step.status === 'error' ? (
                  <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                    <AiOutlineCloseCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium transition-colors',
                    step.status === 'completed' && 'text-gray-700',
                    step.status === 'active' && 'text-blue-800',
                    step.status === 'pending' && 'text-gray-400',
                    step.status === 'error' && 'text-red-700',
                  )}
                >
                  {step.label}
                </p>
                {step.detail && (
                  <p
                    className={cn(
                      'text-xs mt-0.5 transition-colors',
                      step.status === 'completed' && 'text-gray-500',
                      step.status === 'active' && 'text-blue-600',
                      step.status === 'pending' && 'text-gray-300',
                      step.status === 'error' && 'text-red-500',
                    )}
                  >
                    {step.detail}
                  </p>
                )}
                {/* Keywords as tags */}
                {step.keywords && step.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {step.keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Step Icon */}
              <Icon
                className={cn(
                  'w-4 h-4 flex-shrink-0',
                  step.status === 'completed' && 'text-green-500',
                  step.status === 'active' && 'text-blue-500',
                  step.status === 'pending' && 'text-gray-300',
                  step.status === 'error' && 'text-red-500',
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
