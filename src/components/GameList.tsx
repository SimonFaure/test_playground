import { useEffect, useState } from 'react';
import { Clock, Search, LogOut } from 'lucide-react';
import { db } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { GameType, Scenario } from '../types/database';
import { Footer } from './Footer';

interface ScenarioWithType extends Scenario {
  game_type: GameType;
}

export function GameList() {
  const [scenarios, setScenarios] = useState<ScenarioWithType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGameType, setSelectedGameType] = useState<string>('all');
  const { signOut, user } = useAuth();

  useEffect(() => {
    loadScenarios();
  }, []);

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

      setScenarios(scenariosWithTypes);
    } catch (error) {
      console.error('Error loading scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredScenarios = scenarios.filter((scenario) => {
    const matchesSearch = scenario.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scenario.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedGameType === 'all' || scenario.game_type.name === selectedGameType;
    return matchesSearch && matchesType;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Taghunter Playground</h1>
            <div className="flex items-center gap-4">
              <span className="text-slate-400 text-sm">{user?.email}</span>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </div>
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
          {filteredScenarios.map((scenario) => (
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
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Clock size={16} />
                  <span>{scenario.duration_minutes} minutes</span>
                </div>
              </div>
            </div>
          ))}
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
