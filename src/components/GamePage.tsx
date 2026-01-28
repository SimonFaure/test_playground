import { useState, useEffect } from 'react';
import { GameConfig } from './LaunchGameModal';
import { MysteryGamePage } from './MysteryGamePage';

interface GamePageProps {
  config: GameConfig;
  gameUniqid: string;
  launchedGameId: number | null;
  onBack: () => void;
}

interface GameMetadata {
  type: string;
  title: string;
}

export function GamePage({ config, gameUniqid, launchedGameId, onBack }: GamePageProps) {
  const [gameMetadata, setGameMetadata] = useState<GameMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGameMetadata = async () => {
      try {
        const isElectron = typeof window !== 'undefined' && (window as any).electron?.isElectron;

        if (isElectron) {
          const gameDataContent = await (window as any).electron.games.readFile(gameUniqid, 'game-data.json');
          const data = JSON.parse(gameDataContent);

          let type, title;
          if (data.scenario) {
            type = data.scenario.scenario_type;
            title = data.game_data?.game_meta?.title || data.scenario.name;
          } else if (data.game) {
            type = data.game.type;
            title = data.game.title;
          } else {
            type = 'unknown';
            title = 'Unknown Game';
          }

          setGameMetadata({ type, title });
        } else {
          const response = await fetch(`/data/games/${gameUniqid}/game-data.json`);
          const data = await response.json();

          let type, title;
          if (data.scenario) {
            type = data.scenario.scenario_type;
            title = data.game_data?.game_meta?.title || data.scenario.name;
          } else if (data.game) {
            type = data.game.type;
            title = data.game.title;
          } else {
            type = 'unknown';
            title = 'Unknown Game';
          }

          setGameMetadata({ type, title });
        }
      } catch (error) {
        console.error('Error loading game metadata:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGameMetadata();
  }, [gameUniqid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (gameMetadata?.type === 'mystery') {
    return <MysteryGamePage config={config} gameUniqid={gameUniqid} launchedGameId={launchedGameId} onBack={onBack} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-white text-xl">Game type "{gameMetadata?.type}" not yet supported</div>
    </div>
  );
}
