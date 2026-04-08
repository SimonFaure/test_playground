import { useState, useEffect } from 'react';
import { Trophy, ArrowLeft, Clock, Medal, Calendar, Zap, Star, Users } from 'lucide-react';
import { supabase } from '../lib/db';
import type { TimeRange, ScenarioOption } from './RankingsModal';

interface TimeRangeLeaderboardProps {
  scenario: ScenarioOption;
  timeRange: TimeRange;
  onBack: () => void;
}

interface AggregatedTeam {
  team_name: string;
  best_time: number | null;
  total_score: number;
  sessions: number;
  fastest_duration: number | null;
  launched_game_name: string;
}

function getTimeRangeStart(range: TimeRange): Date | null {
  const now = new Date();
  switch (range) {
    case 'day':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'week': {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'trimester': {
      const quarter = Math.floor(now.getMonth() / 3);
      return new Date(now.getFullYear(), quarter * 3, 1);
    }
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    case 'all':
      return null;
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function timeRangeLabel(range: TimeRange): string {
  const map: Record<TimeRange, string> = {
    day: 'Today',
    week: 'This Week',
    month: 'This Month',
    trimester: 'This Quarter',
    year: 'This Year',
    all: 'All Time',
  };
  return map[range];
}

function getRankBg(index: number): string {
  if (index === 0) return 'bg-yellow-400/10 border-yellow-400/30';
  if (index === 1) return 'bg-slate-300/10 border-slate-300/20';
  if (index === 2) return 'bg-amber-500/10 border-amber-500/25';
  return 'bg-slate-700/40 border-slate-600/30';
}

function getRankColor(index: number): string {
  if (index === 0) return 'text-yellow-400';
  if (index === 1) return 'text-slate-300';
  if (index === 2) return 'text-amber-500';
  return 'text-slate-400';
}

function RankIcon({ index }: { index: number }) {
  if (index === 0) return <Trophy size={22} className="text-yellow-400" />;
  if (index === 1) return <Medal size={22} className="text-slate-300" />;
  if (index === 2) return <Medal size={22} className="text-amber-500" />;
  return <span className="text-slate-400 font-bold text-sm w-5 text-center inline-block">#{index + 1}</span>;
}

export function TimeRangeLeaderboard({ scenario, timeRange, onBack }: TimeRangeLeaderboardProps) {
  const [teams, setTeams] = useState<AggregatedTeam[]>([]);
  const [victoryType, setVictoryType] = useState<'speed' | 'score'>('score');
  const [playMode, setPlayMode] = useState<'solo' | 'team'>('solo');
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setVisible(false);

      const rangeStart = getTimeRangeStart(timeRange);

      let query = supabase
        .from('launched_games')
        .select('id, name, created_at')
        .eq('game_uniqid', scenario.uniqid);

      if (rangeStart) {
        query = query.gte('created_at', rangeStart.toISOString());
      }

      const { data: launchedGames, error: lgErr } = await query;
      if (lgErr || !launchedGames || launchedGames.length === 0) {
        setTeams([]);
        setLoading(false);
        setTimeout(() => setVisible(true), 50);
        return;
      }

      const gameIds = launchedGames.map(g => g.id);
      const gameNameMap: Record<number, string> = {};
      launchedGames.forEach(g => { gameNameMap[g.id] = g.name; });

      const [teamsRes, metaRes] = await Promise.all([
        supabase
          .from('teams')
          .select('team_name, score, start_time, end_time, launched_game_id')
          .in('launched_game_id', gameIds),
        supabase
          .from('launched_game_meta')
          .select('launched_game_id, meta_name, meta_value')
          .in('launched_game_id', gameIds)
          .in('meta_name', ['victoryType', 'playMode']),
      ]);

      if (metaRes.data) {
        const vt = metaRes.data.find(m => m.meta_name === 'victoryType');
        if (vt?.meta_value === 'speed' || vt?.meta_value === 'score') setVictoryType(vt.meta_value);
        const pm = metaRes.data.find(m => m.meta_name === 'playMode');
        if (pm?.meta_value === 'solo' || pm?.meta_value === 'team') setPlayMode(pm.meta_value);
      }

      if (!teamsRes.data || teamsRes.data.length === 0) {
        setTeams([]);
        setLoading(false);
        setTimeout(() => setVisible(true), 50);
        return;
      }

      const aggregated = new Map<string, AggregatedTeam>();

      teamsRes.data.forEach(t => {
        const name = t.team_name;
        const duration = t.start_time && t.end_time ? t.end_time - t.start_time : null;
        const existing = aggregated.get(name);

        if (!existing) {
          aggregated.set(name, {
            team_name: name,
            best_time: t.end_time,
            total_score: t.score ?? 0,
            sessions: 1,
            fastest_duration: duration,
            launched_game_name: gameNameMap[t.launched_game_id] ?? '',
          });
        } else {
          aggregated.set(name, {
            ...existing,
            total_score: existing.total_score + (t.score ?? 0),
            sessions: existing.sessions + 1,
            fastest_duration:
              duration !== null && (existing.fastest_duration === null || duration < existing.fastest_duration)
                ? duration
                : existing.fastest_duration,
            best_time:
              t.end_time !== null && (existing.best_time === null || t.end_time < existing.best_time)
                ? t.end_time
                : existing.best_time,
            launched_game_name: gameNameMap[t.launched_game_id] ?? existing.launched_game_name,
          });
        }
      });

      let sorted = Array.from(aggregated.values());
      if (victoryType === 'speed') {
        sorted.sort((a, b) => {
          if (a.fastest_duration !== null && b.fastest_duration !== null) return a.fastest_duration - b.fastest_duration;
          if (a.fastest_duration !== null) return -1;
          if (b.fastest_duration !== null) return 1;
          return 0;
        });
      } else {
        sorted.sort((a, b) => b.total_score - a.total_score);
      }

      setTeams(sorted);
      setLoading(false);
      setTimeout(() => setVisible(true), 50);
    };

    load();
  }, [scenario.uniqid, timeRange]);

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
            Back
          </button>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-700/60 border border-slate-600/40 text-slate-400 text-xs font-medium">
              <Calendar size={12} />
              {timeRangeLabel(timeRange)}
            </span>
            {playMode === 'team' && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-400 text-xs font-semibold uppercase tracking-wide">
                <Users size={12} />
                Team mode
              </span>
            )}
            {victoryType === 'speed' ? (
              <span className="flex items-center gap-1.5 text-orange-400 text-xs font-semibold uppercase tracking-wide">
                <Zap size={13} />
                Speed
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-blue-400 text-xs font-semibold uppercase tracking-wide">
                <Star size={13} />
                Score
              </span>
            )}
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center px-4 py-10 max-w-2xl mx-auto w-full">
          <div className="mb-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-400/10 border-2 border-yellow-400/40 mb-5">
              <Trophy size={36} className="text-yellow-400" />
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight mb-1">Rankings</h1>
            <p className="text-blue-400 font-medium text-base mt-1">{scenario.title}</p>
            <p className="text-slate-500 text-sm mt-1">{timeRangeLabel(timeRange)}</p>
          </div>

          {loading ? (
            <div className="w-full space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-slate-800/60 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-16">
              <Trophy size={36} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400">No results found for this time range.</p>
            </div>
          ) : (
            <div className="w-full space-y-3">
              {teams.map((team, index) => (
                <div
                  key={team.team_name}
                  className={`rounded-xl border ${getRankBg(index)} px-5 pt-4 pb-4`}
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateX(0)' : 'translateX(-16px)',
                    transition: `opacity 0.4s ease ${index * 0.06}s, transform 0.4s ease ${index * 0.06}s`,
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 shrink-0">
                      <RankIcon index={index} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className={`font-bold text-lg leading-tight ${getRankColor(index)}`}>
                        {team.team_name}
                      </div>
                      <div className="text-slate-500 text-xs mt-0.5 flex items-center gap-2">
                        <span>{team.sessions} session{team.sessions !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {victoryType === 'speed' && team.fastest_duration !== null ? (
                        <>
                          <div className={`text-xl font-bold ${getRankColor(index)}`}>
                            {formatDuration(team.fastest_duration)}
                          </div>
                          <div className="text-slate-500 text-xs mt-0.5 flex items-center justify-end gap-1">
                            <Clock size={10} />
                            best time
                          </div>
                        </>
                      ) : victoryType === 'score' ? (
                        <>
                          <div className={`text-xl font-bold ${index === 0 ? 'text-yellow-400' : 'text-white'}`}>
                            {team.total_score}
                            <span className="text-slate-400 text-sm font-normal ml-1">pts</span>
                          </div>
                          <div className="text-slate-500 text-xs mt-0.5">total score</div>
                        </>
                      ) : (
                        <div className="text-slate-500 text-sm">&mdash;</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
