import { useEffect, useState } from 'react';
import { Clock, Search, Upload, Play } from 'lucide-react';
import { db } from '../lib/db';
import { GameType, Scenario } from '../types/database';
import { Footer } from './Footer';
import { Alert } from './Alert';
import { validateAndExtractZip } from '../utils/zipHandler';
import { getLocalGameIds } from '../utils/localGames';

interface ScenarioWithType extends Scenario {
  game_type: GameType;
}

interface AlertState {
  show: boolean;
  type: 'success' | 'error';
  message: string;
}

export function GameList() {
  const [scenarios, setScenarios] = useState<ScenarioWithType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGameType, setSelectedGameType] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [isDragging, setIsDragging] = useState(false);
  const [alert, setAlert] = useState<AlertState>({ show: false, type: 'success', message: '' });
  const [localGameIds, setLocalGameIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadScenarios();
    loadLocalGames();
  }, []);

  const loadLocalGames = async () => {
    const ids = await getLocalGameIds();
    console.log('=== Local Games Debug ===');
    console.log('Local game IDs found (array):', ids);
    const idsSet = new Set(ids);
    console.log('Local game IDs Set size:', idsSet.size);
    console.log('Local game IDs Set contents:', Array.from(idsSet));
    console.log('Does Set have "687e1f9566051"?', idsSet.has('687e1f9566051'));
    setLocalGameIds(idsSet);
  };

  const loadScenarios = async () => {
    try {
      const [scenariosData, gameTypesData] = await Promise.all([
        db.getScenarios(),
        db.getGameTypes()
      ]);

      const gameTypesMap = new Map(gameTypesData.map((gt: any) => [gt.id, gt]));

      const scenariosWithTypes = scenariosData.map((scenario: any) => ({
        ...scenario,
        game_type: gameTypesMap.get(scenario.game_type_id)
      }));

      console.log('Scenarios with uniqids:', scenariosWithTypes.map(s => ({ title: s.title, uniqid: s.uniqid })));
      setScenarios(scenariosWithTypes);
    } catch (error) {
      console.error('Error loading scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredScenarios = scenarios
    .filter((scenario) => {
      const matchesSearch = scenario.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           scenario.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedGameType === 'all' || scenario.game_type.name === selectedGameType;
      const matchesDifficulty = selectedDifficulty === 'all' || scenario.difficulty.toLowerCase() === selectedDifficulty.toLowerCase();
      return matchesSearch && matchesType && matchesDifficulty;
    })
    .sort((a, b) => {
      const aHasLocal = localGameIds.has(a.uniqid || '');
      const bHasLocal = localGameIds.has(b.uniqid || '');
      if (aHasLocal && !bHasLocal) return -1;
      if (!aHasLocal && bHasLocal) return 1;
      return 0;
    });

  const gameTypes = [...new Set(scenarios.map((s) => s.game_type.name))];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-green-900/30 text-green-400 border-green-700';
      case 'medium':
        return 'bg-yellow-900/30 text-yellow-400 border-yellow-700';
      case 'hard':
        return 'bg-red-900/30 text-red-400 border-red-700';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ show: true, type, message });
  };

  const closeAlert = () => {
    setAlert({ ...alert, show: false });
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const zipFile = files.find(f => f.name.endsWith('.zip'));

    if (!zipFile) {
      showAlert('error', 'Please drop a ZIP file.');
      return;
    }

    const result = await validateAndExtractZip(zipFile);

    if (!result.success) {
      showAlert('error', result.message || 'Failed to import scenario.');
      return;
    }

    showAlert('success', `Successfully imported game scenario: ${result.uniqid}`);
    loadScenarios();
    loadLocalGames();
  };

  const handleClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      const result = await validateAndExtractZip(file);

      if (!result.success) {
        showAlert('error', result.message || 'Failed to import scenario.');
        return;
      }

      showAlert('success', `Successfully imported game scenario: ${result.uniqid}`);
      loadScenarios();
      loadLocalGames();
    };
    input.click();
  };

  const handleLaunchGame = (uniqid: string) => {
    console.log('Launching game:', uniqid);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {alert.show && (
        <Alert type={alert.type} message={alert.message} onClose={closeAlert} />
      )}
      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-white">Taghunter Playground</h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search scenarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedGameType('all')}
                className={`px-6 py-3 rounded-lg font-medium transition ${
                  selectedGameType === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                All
              </button>
              {gameTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedGameType(type)}
                  className={`px-6 py-3 rounded-lg font-medium transition ${
                    selectedGameType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScenarios.map((scenario) => {
            const hasLocal = scenario.uniqid && localGameIds.has(scenario.uniqid);
            console.log(`=== Scenario Check: ${scenario.title} ===`);
            console.log('  uniqid:', scenario.uniqid);
            console.log('  uniqid type:', typeof scenario.uniqid);
            console.log('  localGameIds size:', localGameIds.size);
            console.log('  localGameIds contents:', Array.from(localGameIds));
            console.log('  localGameIds.has(scenario.uniqid):', localGameIds.has(scenario.uniqid || ''));
            console.log('  hasLocal:', hasLocal);
            return (
            <div
              key={scenario.id}
              className="bg-slate-800 rounded-xl shadow-xl overflow-hidden border border-slate-700 hover:border-slate-600 transition group"
            >
              {scenario.image_url && (
                <div className="w-full h-48 overflow-hidden bg-slate-700">
                  <img
                    src={scenario.image_url}
                    alt={scenario.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                  />
                </div>
              )}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-blue-400 text-sm font-semibold">
                    {scenario.game_type.name}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(scenario.difficulty)}`}>
                    {scenario.difficulty}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition">
                  {scenario.title}
                </h3>
                <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                  {scenario.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Clock size={16} />
                    <span>{scenario.duration_minutes} minutes</span>
                  </div>
                  {scenario.uniqid && localGameIds.has(scenario.uniqid) ? (
                    <button
                      onClick={() => handleLaunchGame(scenario.uniqid || '')}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition font-medium text-sm"
                    >
                      <Play size={16} />
                      Launch
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            );
          })}

          <button
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`bg-slate-800 rounded-xl shadow-xl overflow-hidden border transition group cursor-pointer flex flex-col items-center justify-center min-h-[300px] p-6 ${
              isDragging ? 'border-blue-400 bg-blue-900/20' : 'border-slate-700 hover:border-blue-500'
            }`}
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition ${
              isDragging ? 'bg-blue-600/40' : 'bg-blue-600/20 group-hover:bg-blue-600/30'
            }`}>
              <Upload className={`transition ${
                isDragging ? 'text-blue-300' : 'text-blue-400 group-hover:text-blue-300'
              }`} size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition">
              Import Scenario
            </h3>
            <p className="text-slate-400 text-sm text-center">
              {isDragging ? 'Drop ZIP file here' : 'Drag and drop a ZIP file or click to browse'}
            </p>
          </button>
        </div>

        {filteredScenarios.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">No scenarios found matching your criteria</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
