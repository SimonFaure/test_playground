import { ArrowLeft } from 'lucide-react';
import { GameConfig } from './LaunchGameModal';

interface GamePageProps {
  config: GameConfig;
  gameUniqid: string;
  onBack: () => void;
}

export function GamePage({ config, gameUniqid, onBack }: GamePageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{config.name}</h1>
            <p className="text-slate-400 text-sm">Game ID: {gameUniqid}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-8">
        <div className="bg-slate-800 rounded-xl shadow-xl p-8 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-6">Game Configuration</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Number of Teams</label>
              <p className="text-white text-lg">{config.numberOfTeams}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">First Chip Index</label>
              <p className="text-white text-lg">{config.firstChipIndex}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Pattern</label>
              <p className="text-white text-lg">{config.pattern}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Duration</label>
              <p className="text-white text-lg">{config.duration} minutes</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Message Display Duration</label>
              <p className="text-white text-lg">{config.messageDisplayDuration} seconds</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Enigma Image Display Duration</label>
              <p className="text-white text-lg">{config.enigmaImageDisplayDuration} seconds</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Colorblind Mode</label>
              <p className="text-white text-lg">{config.colorblindMode ? 'Enabled' : 'Disabled'}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Auto-reset Team</label>
              <p className="text-white text-lg">
                {config.autoResetTeam ? `Enabled (${config.delayBeforeReset}s delay)` : 'Disabled'}
              </p>
            </div>
          </div>

          <div className="mt-8 p-6 bg-slate-900/50 rounded-lg border border-slate-700">
            <p className="text-slate-400 text-center">
              Game interface will be implemented here
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
