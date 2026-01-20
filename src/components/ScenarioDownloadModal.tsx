import { useState } from 'react';
import { Download, Check, X, Loader } from 'lucide-react';
import { ScenarioSummary, getScenarioGameData, downloadMediaFile, extractMediaFiles } from '../services/scenarioDownload';

interface ScenarioDownloadModalProps {
  isOpen: boolean;
  scenarios: ScenarioSummary[];
  email: string;
  onComplete: () => void;
  onCancel: () => void;
}

interface DownloadStatus {
  uniqid: string;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  progress: string;
  error?: string;
}

export function ScenarioDownloadModal({ isOpen, scenarios, email, onComplete, onCancel }: ScenarioDownloadModalProps) {
  const [downloadStatuses, setDownloadStatuses] = useState<Map<string, DownloadStatus>>(
    new Map(scenarios.map(s => [s.uniqid, { uniqid: s.uniqid, status: 'pending', progress: 'Waiting...' }]))
  );
  const [isDownloading, setIsDownloading] = useState(false);

  const updateStatus = (uniqid: string, updates: Partial<DownloadStatus>) => {
    setDownloadStatuses(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(uniqid);
      if (current) {
        newMap.set(uniqid, { ...current, ...updates });
      }
      return newMap;
    });
  };

  const handleDownload = async () => {
    setIsDownloading(true);

    const isElectron = typeof window !== 'undefined' && (window as any).electron?.isElectron;

    if (!isElectron) {
      alert('Download feature is only available in the Electron app');
      return;
    }

    for (const scenario of scenarios) {
      try {
        updateStatus(scenario.uniqid, { status: 'downloading', progress: 'Fetching game data...' });

        const gameData = await getScenarioGameData(email, scenario.uniqid);

        await (window as any).electron.scenarios.saveGameData(scenario.uniqid, gameData);

        const mediaFiles = extractMediaFiles(gameData);

        if (mediaFiles.length > 0) {
          updateStatus(scenario.uniqid, { progress: `Downloading media (0/${mediaFiles.length})...` });

          for (let i = 0; i < mediaFiles.length; i++) {
            const mediaFile = mediaFiles[i];
            updateStatus(scenario.uniqid, { progress: `Downloading media (${i + 1}/${mediaFiles.length})...` });

            const blob = await downloadMediaFile(scenario.uniqid, mediaFile.filename);
            const arrayBuffer = await blob.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

            await (window as any).electron.scenarios.saveMedia(
              scenario.uniqid,
              mediaFile.folder,
              mediaFile.filename,
              base64
            );
          }
        }

        updateStatus(scenario.uniqid, { status: 'completed', progress: 'Completed' });
      } catch (error) {
        console.error(`Error downloading scenario ${scenario.uniqid}:`, error);
        updateStatus(scenario.uniqid, {
          status: 'error',
          progress: 'Failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const allCompleted = Array.from(downloadStatuses.values()).every(
      status => status.status === 'completed' || status.status === 'error'
    );

    if (allCompleted) {
      await (window as any).electron.scenarios.refresh();
      setTimeout(() => {
        setIsDownloading(false);
        onComplete();
      }, 1000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Download className="text-blue-400" size={24} />
            <h2 className="text-xl font-bold text-white">Download Scenarios</h2>
          </div>
          {!isDownloading && (
            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-slate-300 mb-4">
            The following scenarios need to be downloaded:
          </p>

          <div className="space-y-3">
            {scenarios.map((scenario) => {
              const status = downloadStatuses.get(scenario.uniqid);
              return (
                <div
                  key={scenario.uniqid}
                  className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{scenario.title}</h3>
                      <p className="text-sm text-slate-400 mb-2">{scenario.description}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="px-2 py-1 bg-slate-600 rounded">{scenario.game_type}</span>
                        <span>{status?.progress}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {status?.status === 'pending' && (
                        <div className="w-6 h-6 rounded-full bg-slate-600" />
                      )}
                      {status?.status === 'downloading' && (
                        <Loader className="text-blue-400 animate-spin" size={24} />
                      )}
                      {status?.status === 'completed' && (
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                          <Check size={16} className="text-white" />
                        </div>
                      )}
                      {status?.status === 'error' && (
                        <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                          <X size={16} className="text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                  {status?.error && (
                    <div className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2">
                      Error: {status.error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
          {!isDownloading ? (
            <>
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white flex items-center gap-2"
              >
                <Download size={16} />
                Download All
              </button>
            </>
          ) : (
            <button
              disabled
              className="px-4 py-2 bg-slate-600 rounded-lg text-white opacity-50 cursor-not-allowed"
            >
              Downloading...
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
