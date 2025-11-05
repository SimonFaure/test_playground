import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getPatternFolders, getGamePublic } from '../utils/patterns';

interface LaunchGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameTitle: string;
  gameUniqid: string;
  gameTypeName: string;
  onLaunch: (config: GameConfig) => void;
}

export interface GameConfig {
  name: string;
  numberOfTeams: number;
  firstChipIndex: number;
  pattern: string;
  duration: number;
  messageDisplayDuration: number;
  enigmaImageDisplayDuration: number;
  colorblindMode: boolean;
  autoResetTeam: boolean;
  delayBeforeReset: number;
}

export function LaunchGameModal({ isOpen, onClose, gameTitle, gameUniqid, gameTypeName, onLaunch }: LaunchGameModalProps) {
  const getDefaultName = () => {
    const now = new Date();
    const date = now.toLocaleDateString('fr-FR');
    const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${gameTitle} ${date} ${time}`;
  };

  const [config, setConfig] = useState<GameConfig>({
    name: '',
    numberOfTeams: 1,
    firstChipIndex: 1,
    pattern: '',
    duration: 60,
    messageDisplayDuration: 5,
    enigmaImageDisplayDuration: 1,
    colorblindMode: false,
    autoResetTeam: false,
    delayBeforeReset: 10,
  });
  const [patternFolders, setPatternFolders] = useState<string[]>([]);
  const [defaultPattern, setDefaultPattern] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      if (!gameTypeName || !gameUniqid) return;

      const folders = await getPatternFolders(gameTypeName);
      setPatternFolders(folders);

      const gamePublic = await getGamePublic(gameUniqid);
      console.log('game_public for game:', gameUniqid, '=', gamePublic);
      const pattern = gamePublic || folders[0] || '';
       console.log('pattern:', pattern);
      setDefaultPattern(pattern);
    };
    loadData();
  }, [gameTypeName, gameUniqid]);

  useEffect(() => {
    if (isOpen) {
      setConfig({
        name: '',
        numberOfTeams: 1,
        firstChipIndex: 1,
        pattern: defaultPattern,
        duration: 60,
        messageDisplayDuration: 5,
        enigmaImageDisplayDuration: 1,
        colorblindMode: false,
        autoResetTeam: false,
        delayBeforeReset: 10,
      });
    }
  }, [isOpen, defaultPattern]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalConfig = {
      ...config,
      name: config.name.trim() || getDefaultName(),
    };

    onLaunch(finalConfig);
  };

  if (!isOpen) return null;
                 console.log('defaultPattern0');
               console.log(defaultPattern);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full h-full max-w-4xl max-h-screen overflow-auto bg-slate-900 shadow-2xl md:rounded-xl md:m-8 md:h-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-slate-800 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white">Launch Game Configuration</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-slate-300">
              Game Name
            </label>
            <input
              type="text"
              id="name"
              value={config.name}
              onChange={(e) => setConfig({ ...config, name: e.target.value })}
              placeholder={getDefaultName()}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500">Leave empty to use default: {getDefaultName()}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="numberOfTeams" className="block text-sm font-medium text-slate-300">
                Number of Teams
              </label>
              <input
                type="number"
                id="numberOfTeams"
                min="1"
                value={config.numberOfTeams}
                onChange={(e) => setConfig({ ...config, numberOfTeams: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="firstChipIndex" className="block text-sm font-medium text-slate-300">
                Index of First Chip
              </label>
              <input
                type="number"
                id="firstChipIndex"
                min="0"
                value={config.firstChipIndex}
                onChange={(e) => setConfig({ ...config, firstChipIndex: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="pattern" className="block text-sm font-medium text-slate-300">
                Pattern
              </label>
              <select
                id="pattern"
                value={config.pattern}
                onChange={(e) => setConfig({ ...config, pattern: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >

                {
                  patternFolders.length === 0 ? (
                  <option value="">Loading patterns...</option>
                ) : (
                  patternFolders.map(function(folder){
                   var selected = folder === defaultPattern ? 'selected' : '';
                    console.log(selected);
       
                  })
                )}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="duration" className="block text-sm font-medium text-slate-300">
                Duration (minutes)
              </label>
              <input
                type="number"
                id="duration"
                min="1"
                value={config.duration}
                onChange={(e) => setConfig({ ...config, duration: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="messageDisplayDuration" className="block text-sm font-medium text-slate-300">
                Message Display Duration (seconds)
              </label>
              <input
                type="number"
                id="messageDisplayDuration"
                min="1"
                value={config.messageDisplayDuration}
                onChange={(e) => setConfig({ ...config, messageDisplayDuration: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="enigmaImageDisplayDuration" className="block text-sm font-medium text-slate-300">
                Enigma Image Display Duration (seconds)
              </label>
              <input
                type="number"
                id="enigmaImageDisplayDuration"
                min="1"
                value={config.enigmaImageDisplayDuration}
                onChange={(e) => setConfig({ ...config, enigmaImageDisplayDuration: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="space-y-4 p-4 bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="colorblindMode"
                checked={config.colorblindMode}
                onChange={(e) => setConfig({ ...config, colorblindMode: e.target.checked })}
                className="w-5 h-5 bg-slate-700 border-slate-600 rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="colorblindMode" className="text-sm font-medium text-slate-300">
                Colorblind Mode
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="autoResetTeam"
                checked={config.autoResetTeam}
                onChange={(e) => setConfig({ ...config, autoResetTeam: e.target.checked })}
                className="w-5 h-5 bg-slate-700 border-slate-600 rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="autoResetTeam" className="text-sm font-medium text-slate-300">
                Auto-reset Team
              </label>
            </div>

            {config.autoResetTeam && (
              <div className="ml-8 space-y-2">
                <label htmlFor="delayBeforeReset" className="block text-sm font-medium text-slate-300">
                  Delay Before Reset (seconds)
                </label>
                <input
                  type="number"
                  id="delayBeforeReset"
                  min="0"
                  value={config.delayBeforeReset}
                  onChange={(e) => setConfig({ ...config, delayBeforeReset: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition font-medium"
            >
              Launch Game
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
