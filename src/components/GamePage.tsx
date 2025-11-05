import { useState, useEffect } from 'react';
import { GameConfig } from './LaunchGameModal';
import { SurvivalGamePage } from './SurvivalGamePage';

interface GamePageProps {
  config: GameConfig;
  gameUniqid: string;
  onBack: () => void;
}

interface GameMetadata {
  type: string;
  title: string;
}

export function GamePage({ config, gameUniqid, onBack }: GamePageProps) {
  const [gameMetadata, setGameMetadata] = useState<GameMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGameMetadata = async () => {
      try {
        const response = await fetch(`/data/games/${gameUniqid}/game-data.json`);
        const data = await response.json();
        setGameMetadata({
          type: data.game.type,
          title: data.game.title
        });
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

  console.log(gameMetadata);
  if (gameMetadata?.type === 'survival') {
    return <SurvivalGamePage config={config} gameUniqid={gameUniqid} onBack={onBack} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-white text-xl">Game type "{gameMetadata?.type}" not yet supported</div>
    </div>
  );
}
