import { useState, useEffect } from 'react';
import { Settings, ShieldCheck } from 'lucide-react';
import { GameList } from './components/GameList';
import { ConfigurationPage } from './components/ConfigurationPage';
import { AdminPasswordModal } from './components/AdminPasswordModal';
import { AdminConfigPage } from './components/AdminConfigPage';

type Page = 'games' | 'config' | 'admin-config';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('games');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkDatabaseOnLaunch = async () => {
      if (typeof window !== 'undefined' && (window as any).electron?.db?.connect) {
        try {
          await (window as any).electron.db.connect();
        } catch (error) {
          console.error('Failed to connect to database on launch:', error);
        }
      }
    };

    checkDatabaseOnLaunch();

    const handleKeyDown = (e: KeyboardEvent) => {
      setPressedKeys(prev => new Set(prev).add(e.key.toLowerCase()));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setPressedKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(e.key.toLowerCase());
        return newSet;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (pressedKeys.has('a') && pressedKeys.has('m') && pressedKeys.has('o')) {
      if (isAdminMode) {
        setIsAdminMode(false);
        setCurrentPage('games');
        setPressedKeys(new Set());
      } else {
        setShowPasswordModal(true);
        setPressedKeys(new Set());
      }
    }
  }, [pressedKeys, isAdminMode]);

  const handleAdminSuccess = () => {
    setIsAdminMode(true);
  };

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
              {isAdminMode && (
                <button
                  onClick={() => setCurrentPage('admin-config')}
                  className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                    currentPage === 'admin-config'
                      ? 'bg-red-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <ShieldCheck size={16} />
                  Admin Config
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {currentPage === 'games' && <GameList />}
      {currentPage === 'config' && <ConfigurationPage />}
      {currentPage === 'admin-config' && isAdminMode && <AdminConfigPage />}

      <AdminPasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={handleAdminSuccess}
      />
    </div>
  );
}

export default App;
