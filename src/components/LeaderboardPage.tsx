import { useState, useEffect } from 'react';
import { Trophy, ArrowLeft, Clock, Zap, Star, Medal, Users } from 'lucide-react';
import { supabase } from '../lib/db';
import { GameConfig, Team as ConfigTeam } from './LaunchGameModal';

interface LeaderboardPageProps {
  launchedGameId: number | null;
  config: GameConfig;
  gameName?: string;
  onBack: () => void;
}

interface TeamResult {
  id: number;
  team_number: number;
  team_name: string;
  score: number;
  start_time: number | null;
  end_time: number | null;
  key_id: number;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getRankColor(index: number): string {
  if (index === 0) return 'text-yellow-400';
  if (index === 1) return 'text-slate-300';
  if (index === 2) return 'text-amber-500';
  return 'text-slate-400';
}

function getRankBg(index: number): string {
  if (index === 0) return 'bg-yellow-400/10 border-yellow-400/30';
  if (index === 1) return 'bg-slate-300/10 border-slate-300/20';
  if (index === 2) return 'bg-amber-500/10 border-amber-500/25';
  return 'bg-slate-700/40 border-slate-600/30';
}

function RankIcon({ index }: { index: number }) {
  if (index === 0) return <Trophy size={20} className="text-yellow-400" />;
  if (index === 1) return <Medal size={20} className="text-slate-300" />;
  if (index === 2) return <Medal size={20} className="text-amber-500" />;
  return <span className="text-slate-400 font-bold text-sm w-5 text-center">#{index + 1}</span>;
}

export function LeaderboardPage({ launchedGameId, config, gameName, onBack }: LeaderboardPageProps) {
  const [teams, setTeams] = useState<TeamResult[]>([]);
  const [teamsConfig, setTeamsConfig] = useState<ConfigTeam[]>(config.teams || []);
  const [playMode, setPlayMode] = useState<'solo' | 'team'>(config.playMode || 'solo');
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  const victoryType = config.victoryType || 'speed';

  useEffect(() => {
    const load = async () => {
      if (!launchedGameId) return;

      const [teamsRes, metaRes] = await Promise.all([
        supabase
          .from('teams')
          .select('id, team_number, team_name, score, start_time, end_time, key_id')
          .eq('launched_game_id', launchedGameId),
        supabase
          .from('launched_game_meta')
          .select('meta_name, meta_value')
          .eq('launched_game_id', launchedGameId)
          .in('meta_name', ['playMode', 'teamsConfig', 'victoryType']),
      ]);

      if (metaRes.data) {
        const map: Record<string, string> = {};
        metaRes.data.forEach(row => { map[row.meta_name] = row.meta_value || ''; });
        if (map.playMode === 'solo' || map.playMode === 'team') {
          setPlayMode(map.playMode);
        }
        if (map.teamsConfig) {
          try { setTeamsConfig(JSON.parse(map.teamsConfig)); } catch {}
        }
      }

      if (teamsRes.data) {
        const sorted = [...teamsRes.data].sort((a, b) => {
          if (victoryType === 'speed') {
            if (a.end_time && b.end_time) return a.end_time - b.end_time;
            if (a.end_time) return -1;
            if (b.end_time) return 1;
            if (a.start_time && b.start_time) return a.start_time - b.start_time;
            if (a.start_time) return -1;
            if (b.start_time) return 1;
            return 0;
          }
          return (b.score ?? 0) - (a.score ?? 0);
        });
        setTeams(sorted);
      }

      setLoading(false);
      setTimeout(() => setVisible(true), 50);
    };

    load();
  }, [launchedGameId, victoryType]);

  return (
    <div className="fixed inset-0 z-[200] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-auto">
      <div
        className="min-h-screen flex flex-col"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}
      >
        <header className="flex items-center justify-between px-6 py-5 border-b border-slate-700/60">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft size={18} />
            Back to games
          </button>

          <div className="flex items-center gap-3 text-slate-400 text-sm">
            {playMode === 'team' && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-400 text-xs font-semibold uppercase tracking-wide">
                <Users size={12} />
                Team mode
              </span>
            )}
            {victoryType === 'speed' ? (
              <>
                <Zap size={15} className="text-orange-400" />
                <span className="text-orange-400 font-semibold uppercase tracking-wide text-xs">Speed</span>
              </>
            ) : (
              <>
                <Star size={15} className="text-blue-400" />
                <span className="text-blue-400 font-semibold uppercase tracking-wide text-xs">Score</span>
              </>
            )}
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center px-4 py-10 max-w-2xl mx-auto w-full">
          <div className="mb-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-400/10 border-2 border-yellow-400/40 mb-5">
              <Trophy size={36} className="text-yellow-400" />
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight mb-1">Results</h1>
            {gameName && (
              <p className="text-slate-400 text-base mt-1">{gameName}</p>
            )}
          </div>

          {loading ? (
            <div className="text-slate-400 text-center py-16">Loading results...</div>
          ) : teams.length === 0 ? (
            <div className="text-slate-400 text-center py-16">No team data found.</div>
          ) : (
            <div className="w-full space-y-3">
              {teams.map((team, index) => {
                const duration =
                  team.start_time && team.end_time
                    ? team.end_time - team.start_time
                    : null;

                const configTeam = teamsConfig.find(
                  t => t.chipId === team.key_id || t.name === team.team_name
                );
                const teammates = playMode === 'team' ? (configTeam?.teammates ?? []) : [];

                return (
                  <div
                    key={team.id}
                    className={`rounded-xl border ${getRankBg(index)} px-5 pt-4 pb-4`}
                    style={{
                      opacity: visible ? 1 : 0,
                      transform: visible ? 'translateX(0)' : 'translateX(-16px)',
                      transition: `opacity 0.4s ease ${index * 0.07}s, transform 0.4s ease ${index * 0.07}s`,
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 shrink-0">
                        <RankIcon index={index} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className={`font-bold text-lg leading-tight ${getRankColor(index)}`}>
                          {team.team_name}
                        </div>
                        <div className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
                          {team.end_time ? (
                            <>
                              <Clock size={11} />
                              Finished
                            </>
                          ) : team.start_time ? (
                            'In progress'
                          ) : (
                            'Did not start'
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {victoryType === 'score' ? (
                          <div className="text-xl font-bold text-white">
                            {team.score}
                            <span className="text-slate-400 text-sm font-normal ml-1">pts</span>
                          </div>
                        ) : duration !== null ? (
                          <div className={`text-xl font-bold ${getRankColor(index)}`}>
                            {formatDuration(duration)}
                          </div>
                        ) : (
                          <div className="text-slate-500 text-sm">&mdash;</div>
                        )}

                        {victoryType === 'speed' && team.score > 0 && (
                          <div className="text-slate-500 text-xs mt-0.5">
                            {team.score} pts
                          </div>
                        )}
                      </div>
                    </div>

                    {teammates.length > 1 && (
                      <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-2">
                        {teammates.map((mate, mi) => (
                          <span key={mi} className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-full text-xs text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block" />
                            {mate.name}
                            <span className="text-slate-600">#{mate.chipNumber}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
