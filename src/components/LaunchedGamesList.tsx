import { useState, useEffect } from 'react';
import { Play, Square, Trash2, Users } from 'lucide-react';
import { supabase } from '../lib/db';

interface LaunchedGame {
  id: number;
  scenario_name: string;
  scenario_id: string;
  ended: boolean;
  created_at: string;
}

interface Team {
  id: number;
  team_number: number;
  team_name: string;
  score: number;
  start_time: number | null;
  end_time: number | null;
  key_id: number;
}

export function LaunchedGamesList() {
  const [games, setGames] = useState<LaunchedGame[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGames();
  }, []);

  useEffect(() => {
    if (selectedGameId !== null) {
      loadTeams(selectedGameId);
    }
  }, [selectedGameId]);

  const loadGames = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('launched_games')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading launched games:', error);
    } else {
      setGames(data || []);
    }
    setLoading(false);
  };

  const loadTeams = async (gameId: number) => {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('launched_game_id', gameId)
      .order('team_number', { ascending: true });

    if (error) {
      console.error('Error loading teams:', error);
    } else {
      setTeams(data || []);
    }
  };

  const handleEndGame = async (gameId: number) => {
    const confirmed = confirm('Are you sure you want to end this game?');
    if (!confirmed) return;

    const { error } = await supabase
      .from('launched_games')
      .update({ ended: true })
      .eq('id', gameId);

    if (error) {
      console.error('Error ending game:', error);
      alert('Failed to end game');
    } else {
      loadGames();
      if (selectedGameId === gameId) {
        loadTeams(gameId);
      }
    }
  };

  const handleDeleteGame = async (gameId: number) => {
    const confirmed = confirm('Are you sure you want to delete this game? This will also delete all associated teams.');
    if (!confirmed) return;

    const { error: teamsError } = await supabase
      .from('teams')
      .delete()
      .eq('launched_game_id', gameId);

    if (teamsError) {
      console.error('Error deleting teams:', teamsError);
      alert('Failed to delete teams');
      return;
    }

    const { error: gameError } = await supabase
      .from('launched_games')
      .delete()
      .eq('id', gameId);

    if (gameError) {
      console.error('Error deleting game:', gameError);
      alert('Failed to delete game');
    } else {
      if (selectedGameId === gameId) {
        setSelectedGameId(null);
        setTeams([]);
      }
      loadGames();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return 'Not started';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading launched games...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <h2 className="text-3xl font-bold text-white mb-6">Launched Games</h2>

      {games.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400 text-lg">No games have been launched yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {games.map((game) => (
              <div
                key={game.id}
                className={`p-6 rounded-lg border-2 transition cursor-pointer ${
                  selectedGameId === game.id
                    ? 'bg-blue-900/30 border-blue-500'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                } ${!game.ended ? 'ring-2 ring-green-500/50' : ''}`}
                onClick={() => setSelectedGameId(game.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{game.scenario_name}</h3>
                    <p className="text-sm text-slate-400">Game ID: {game.id}</p>
                    <p className="text-sm text-slate-400">Scenario: {game.scenario_id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {game.ended ? (
                      <span className="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-xs font-semibold flex items-center gap-1">
                        <Square size={12} />
                        Ended
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-green-600 text-white rounded-full text-xs font-semibold flex items-center gap-1">
                        <Play size={12} />
                        Active
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-sm text-slate-400 mb-4">
                  Created: {formatDate(game.created_at)}
                </div>

                <div className="flex gap-2">
                  {!game.ended && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEndGame(game.id);
                      }}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition font-medium text-sm flex items-center gap-2"
                    >
                      <Square size={16} />
                      End Game
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGame(game.id);
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition font-medium text-sm flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div>
            {selectedGameId !== null ? (
              <div className="sticky top-24">
                <div className="bg-slate-800/50 border-2 border-slate-700 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Users size={20} />
                    Teams ({teams.length})
                  </h3>
                  {teams.length === 0 ? (
                    <p className="text-slate-400">No teams in this game.</p>
                  ) : (
                    <div className="space-y-3">
                      {teams.map((team) => (
                        <div
                          key={team.id}
                          className="p-4 bg-slate-800 border border-slate-700 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-semibold">
                              Team {team.team_number}: {team.team_name}
                            </span>
                            <span className="text-slate-400 text-sm">
                              Chip #{team.key_id}
                            </span>
                          </div>
                          <div className="text-sm text-slate-400 space-y-1">
                            <div>Score: <span className="text-white font-medium">{team.score}</span></div>
                            <div>Start: <span className="text-white">{formatTime(team.start_time)}</span></div>
                            <div>End: <span className="text-white">{formatTime(team.end_time)}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="sticky top-24">
                <div className="bg-slate-800/50 border-2 border-slate-700 rounded-lg p-6 text-center">
                  <p className="text-slate-400">Select a game to view its teams</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
