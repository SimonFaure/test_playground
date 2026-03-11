import { RefreshCw, Check, AlertCircle, Loader, X, Download, Package, Layout, FileText } from 'lucide-react';
import { DownloadItem } from '../types/downloadQueue';

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
  downloadsNeeded?: DownloadItem[];
  onClose?: () => void;
  onStartSync?: () => void;
  onDownloadAll?: () => void;
}

export function SyncLoadingModal({ isOpen, steps, downloadsNeeded = [], onClose, onStartSync, onDownloadAll }: SyncLoadingModalProps) {
  if (!isOpen) return null;

  const getDownloadIcon = (type: string) => {
    switch (type) {
      case 'cards':
        return <FileText className="text-blue-400" size={18} />;
      case 'pattern':
        return <Package className="text-purple-400" size={18} />;
      case 'layout':
        return <Layout className="text-green-400" size={18} />;
      default:
        return <Download className="text-slate-400" size={18} />;
    }
  };

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
  const syncStarted = steps.some(s => s.status !== 'pending');

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <RefreshCw className={`text-blue-400 ${syncStarted && !allCompleted ? 'animate-spin' : ''}`} size={24} />
            <h2 className="text-xl font-bold text-white">
              {allCompleted ? 'Sync Complete' : syncStarted ? 'Syncing Resources...' : 'Resource Sync'}
            </h2>
          </div>
          {allCompleted && onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              title="Close"
            >
              <X size={20} className="text-slate-400" />
            </button>
          )}
        </div>

        <div className="p-6">
          <p className="text-slate-300 mb-6">
            {allCompleted
              ? 'Resource synchronization completed.'
              : syncStarted
              ? 'Please wait while we sync your game resources and check for updates.'
              : 'Sync patterns, scenarios, cards, and layouts from the server.'}
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

          {allCompleted && downloadsNeeded.length > 0 && (
            <div className="mt-8">
              <div className="border-t border-slate-700 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Download size={20} className="text-blue-400" />
                  Downloads Available
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {downloadsNeeded.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600"
                    >
                      <div className="flex-shrink-0">
                        {getDownloadIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{item.name}</span>
                          <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded">
                            v{item.version}
                          </span>
                        </div>
                        {item.gameType && (
                          <p className="text-xs text-slate-400 mt-0.5">Game Type: {item.gameType}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <span className="text-xs text-blue-400 font-medium capitalize">{item.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-sm text-slate-400">
                  {downloadsNeeded.length} {downloadsNeeded.length === 1 ? 'item' : 'items'} ready to download
                </div>
              </div>
            </div>
          )}

          {!syncStarted && onStartSync && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={onStartSync}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold flex items-center gap-2"
              >
                <RefreshCw size={20} />
                Start Sync
              </button>
            </div>
          )}

          {allCompleted && (
            <div className="mt-6 flex justify-end gap-3">
              {downloadsNeeded.length > 0 && onDownloadAll && (
                <button
                  onClick={onDownloadAll}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold flex items-center gap-2"
                >
                  <Download size={18} />
                  Download All
                </button>
              )}
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors font-semibold"
                >
                  Close
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
