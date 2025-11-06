import { useState } from 'react';
import { Settings } from 'lucide-react';
import { GameList } from './components/GameList';
import { ConfigurationPage } from './components/ConfigurationPage';

type Page = 'games' | 'config';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('games');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <nav className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">Taghunter Playground</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage('games')}
                className={`px-4 py-2 rounded-lg transition ${
                  currentPage === 'games'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                Games
              </button>
              <button
                onClick={() => setCurrentPage('config')}
                className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                  currentPage === 'config'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Settings size={16} />
                Configuration
              </button>
            </div>
          </div>
        </div>
      </nav>

      {currentPage === 'games' ? <GameList /> : <ConfigurationPage />}
    </div>
  );
}

export default App;
