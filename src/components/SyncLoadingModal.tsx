import { RefreshCw, Check, AlertCircle, Loader } from 'lucide-react';

export interface SyncStep {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'success' | 'error' | 'skipped';
  details?: string;
}

interface SyncLoadingModalProps {
  isOpen: boolean;
  steps: SyncStep[];
  currentStep: string;
}

export function SyncLoadingModal({ isOpen, steps, currentStep }: SyncLoadingModalProps) {
  if (!isOpen) return null;

  const getStepIcon = (step: SyncStep) => {
    switch (step.status) {
      case 'loading':
        return <Loader className="text-blue-400 animate-spin" size={20} />;
      case 'success':
        return (
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
            <Check size={14} className="text-white font-bold" strokeWidth={3} />
          </div>
        );
      case 'error':
        return (
          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
            <AlertCircle size={14} className="text-white" strokeWidth={3} />
          </div>
        );
      case 'skipped':
        return (
          <div className="w-5 h-5 rounded-full border-2 border-slate-600 flex items-center justify-center">
            <span className="text-slate-600 text-xs">-</span>
          </div>
        );
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-slate-500" />;
    }
  };

  const getStepStatusColor = (step: SyncStep) => {
    switch (step.status) {
      case 'loading':
        return 'bg-blue-500/10 border-blue-500/30';
      case 'success':
        return 'bg-green-500/10 border-green-500/30';
      case 'error':
        return 'bg-red-500/10 border-red-500/30';
      case 'skipped':
        return 'bg-slate-700/30 border-slate-600';
      default:
        return 'bg-slate-700/30 border-slate-600';
    }
  };

  const allCompleted = steps.every(s => s.status === 'success' || s.status === 'error' || s.status === 'skipped');

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <RefreshCw className={`text-blue-400 ${!allCompleted ? 'animate-spin' : ''}`} size={24} />
            <h2 className="text-xl font-bold text-white">
              {allCompleted ? 'Sync Complete' : 'Syncing Resources...'}
            </h2>
          </div>
        </div>

        <div className="p-6">
          <p className="text-slate-300 mb-6">
            {allCompleted
              ? 'Resource synchronization completed. Loading your scenarios...'
              : 'Please wait while we sync your game resources and check for updates.'}
          </p>

          <div className="space-y-3">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${getStepStatusColor(step)}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getStepIcon(step)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-white">{step.label}</h3>
                    {step.status === 'loading' && (
                      <span className="text-xs text-blue-400 font-medium">In Progress</span>
                    )}
                    {step.status === 'success' && (
                      <span className="text-xs text-green-400 font-medium">Done</span>
                    )}
                    {step.status === 'error' && (
                      <span className="text-xs text-red-400 font-medium">Failed</span>
                    )}
                    {step.status === 'skipped' && (
                      <span className="text-xs text-slate-400 font-medium">Skipped</span>
                    )}
                  </div>
                  {step.details && (
                    <p className="text-sm text-slate-400 mt-1">{step.details}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {allCompleted && (
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400">
                This window will close automatically...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
