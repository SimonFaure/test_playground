import { useState, useEffect } from 'react';
import { Play, Square, Trash2, Users, Save, Clock, CheckCircle, Flag, Trophy } from 'lucide-react';
import { supabase } from '../lib/db';

interface LaunchedGame {
  id: number;
  game_uniqid: string;
  name: string;
  number_of_teams: number;
  game_type: string;
  ended: boolean;
  created_at: string;
}

interface GameData {
  game: {
    uniqid: string;
    title: string;
    type: string;
  };
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
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [editedTeam, setEditedTeam] = useState<Partial<Team>>({});
  const [gameDataMap, setGameDataMap] = useState<Record<string, GameData>>({});
  const [showRankings, setShowRankings] = useState<number | null>(null);
  const [rankings, setRankings] = useState<Team[]>([]);

  useEffect(() => {
    loadGames();
  }, []);

  useEffect(() => {
    if (games.length > 0) {
      loadGameData();
    }
  }, [games]);

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

  const loadGameData = async () => {
    try {
      const isElectron = typeof window !== 'undefined' && (window as any).electron?.isElectron;
      if (isElectron && (window as any).electron?.loadGameData) {
        const uniqueUniqids = [...new Set(games.map(g => g.game_uniqid))];
        const dataMap: Record<string, GameData> = {};

        for (const uniqid of uniqueUniqids) {
          const gameData = await (window as any).electron.loadGameData(uniqid);
          if (gameData) {
            dataMap[uniqid] = gameData;
          }
        }

        setGameDataMap(dataMap);
      }
    } catch (error) {
      console.error('Error loading game data:', error);
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

  const formatTimeForInput = (timestamp: number | null) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const parseTimeInput = (timeString: string): number | null => {
    if (!timeString) return null;
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    const now = new Date();
    now.setHours(hours, minutes, seconds || 0, 0);
    return now.getTime();
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeamId(team.id);
    setEditedTeam({
      team_name: team.team_name,
      score: team.score,
      start_time: team.start_time,
      end_time: team.end_time,
    });
  };

  const handleCancelEdit = () => {
    setEditingTeamId(null);
    setEditedTeam({});
  };

  const handleSaveTeam = async (teamId: number) => {
    const { error } = await supabase
      .from('teams')
      .update(editedTeam)
      .eq('id', teamId);

    if (error) {
      console.error('Error updating team:', error);
      alert('Failed to update team');
    } else {
      setEditingTeamId(null);
      setEditedTeam({});
      if (selectedGameId !== null) {
        loadTeams(selectedGameId);
      }
    }
  };

  const handleShowRankings = async (gameId: number) => {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('launched_game_id', gameId)
      .order('score', { ascending: false });

    if (error) {
      console.error('Error loading rankings:', error);
    } else {
      setRankings(data || []);
      setShowRankings(gameId);
    }
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
                    <h3 className="text-xl font-bold text-white mb-1">{game.name}</h3>
                    {gameDataMap[game.game_uniqid] && (
                      <p className="text-sm text-blue-400 mb-1">Scenario: {
                      gameDataMap[game.game_uniqid].game.title}</p>
                    )}
                    {   console.log(gameDataMap[game.game_uniqid]);}
                    <p className="text-sm text-slate-400">Game ID: {game.id}</p>
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShowRankings(game.id);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition font-medium text-sm flex items-center gap-2"
                  >
                    <Trophy size={16} />
                    Rankings
                  </button>
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
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {team.end_time ? (
                                <CheckCircle size={18} className="text-green-500" />
                              ) : team.start_time ? (
                                <Play size={18} className="text-blue-500" />
                              ) : (
                                <Clock size={18} className="text-slate-500" />
                              )}
                              <span className="text-white font-semibold">
                                Team {team.team_number}
                              </span>
                            </div>
                            <span className="text-slate-400 text-sm">
                              Chip #{team.key_id}
                            </span>
                          </div>

                          {editingTeamId === team.id ? (
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-slate-400 mb-1 block">Team Name</label>
                                <input
                                  type="text"
                                  value={editedTeam.team_name || ''}
                                  onChange={(e) => setEditedTeam({ ...editedTeam, team_name: e.target.value })}
                                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-400 mb-1 block">Score</label>
                                <input
                                  type="number"
                                  value={editedTeam.score ?? 0}
                                  onChange={(e) => setEditedTeam({ ...editedTeam, score: parseInt(e.target.value) || 0 })}
                                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-400 mb-1 block">Start Time (HH:MM:SS)</label>
                                <input
                                  type="time"
                                  step="1"
                                  value={formatTimeForInput(editedTeam.start_time ?? team.start_time)}
                                  onChange={(e) => setEditedTeam({ ...editedTeam, start_time: parseTimeInput(e.target.value) })}
                                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-400 mb-1 block">End Time (HH:MM:SS)</label>
                                <input
                                  type="time"
                                  step="1"
                                  value={formatTimeForInput(editedTeam.end_time ?? team.end_time)}
                                  onChange={(e) => setEditedTeam({ ...editedTeam, end_time: parseTimeInput(e.target.value) })}
                                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div className="flex gap-2 pt-2">
                                <button
                                  onClick={() => handleSaveTeam(team.id)}
                                  className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-medium flex items-center justify-center gap-2"
                                >
                                  <Save size={14} />
                                  Save
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-medium"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="text-sm text-slate-400 space-y-1 mb-3">
                                <div>Name: <span className="text-white font-medium">{team.team_name}</span></div>
                                <div>Score: <span className="text-white font-medium">{team.score}</span></div>
                                <div>Start: <span className="text-white">{formatTime(team.start_time)}</span></div>
                                <div>End: <span className="text-white">{formatTime(team.end_time)}</span></div>
                              </div>
                              <button
                                onClick={() => handleEditTeam(team)}
                                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium"
                              >
                                Edit
                              </button>
                            </>
                          )}
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

      {showRankings !== null && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowRankings(null)}>
          <div className="bg-slate-800 border-2 border-slate-700 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <Trophy size={24} className="text-yellow-500" />
                Game Rankings
              </h3>
              <button
                onClick={() => setShowRankings(null)}
                className="text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {rankings.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No teams in this game yet.</p>
            ) : (
              <div className="space-y-3">
                {rankings.map((team, index) => (
                  <div
                    key={team.id}
                    className={`p-4 rounded-lg border-2 ${
                      index === 0
                        ? 'bg-yellow-900/20 border-yellow-600'
                        : index === 1
                        ? 'bg-slate-700/50 border-slate-500'
                        : index === 2
                        ? 'bg-orange-900/20 border-orange-600'
                        : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`text-2xl font-bold ${
                          index === 0
                            ? 'text-yellow-500'
                            : index === 1
                            ? 'text-slate-300'
                            : index === 2
                            ? 'text-orange-500'
                            : 'text-slate-400'
                        }`}>
                          #{index + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            {team.end_time ? (
                              <CheckCircle size={16} className="text-green-500" />
                            ) : team.start_time ? (
                              <Play size={16} className="text-blue-500" />
                            ) : (
                              <Clock size={16} className="text-slate-500" />
                            )}
                            <span className="text-white font-semibold text-lg">
                              Team {team.team_number}: {team.team_name}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400">Chip #{team.key_id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">{team.score}</div>
                        <div className="text-xs text-slate-400">points</div>
                      </div>
                    </div>
                    {(team.start_time || team.end_time) && (
                      <div className="mt-3 pt-3 border-t border-slate-700 text-sm text-slate-400 flex gap-4">
                        {team.start_time && (
                          <div>Start: <span className="text-white">{formatTime(team.start_time)}</span></div>
                        )}
                        {team.end_time && (
                          <div>End: <span className="text-white">{formatTime(team.end_time)}</span></div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
