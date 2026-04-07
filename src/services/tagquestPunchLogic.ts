import { supabase } from '../lib/db';
import { CardData } from './usbReader';
import type { Team } from '../components/LaunchGameModal';

interface GameQuest {
  id: string;
  number: string;
  text: string;
  points?: string | number;
  good_answer_points?: string | number;
  main_image?: string;
  image_1?: string;
  image_2?: string;
  image_3?: string;
  image_4?: string;
  [key: string]: string | number | undefined;
}

interface GameMeta {
  late_malus_points?: string | number;
  default_time?: string | number;
  levels?: Record<string, { points: string | null; name: string | null; description: string }>;
}

interface GameDataJson {
  game_meta?: GameMeta;
  game_quests?: GameQuest[];
  game_enigmas?: GameQuest[];
  game_data?: { quests?: GameQuest[] };
  quests?: GameQuest[];
}

interface PatternItem {
  item_index: number;
  assignment_type: string;
  station_key_number: number;
}

interface PunchResult {
  team_name: string;
  team_id: number;
  teammate_chip_id: number | null;
  completed_quest: { id: string; number: string; text: string; points: number } | null;
  points_earned: number;
  malus_applied: number;
  new_total_score: number;
  level_up: { new_level: number; name: string } | null;
  best_partial_quest: { id: string; number: string; text: string; matched: number } | null;
  end_station_reached: boolean;
  game_ended: boolean;
  status: 'ok' | 'chip_not_recognized' | 'team_already_finished' | 'cheat_detected' | 'error';
  message?: string;
}

function getQuests(gdj: GameDataJson): GameQuest[] {
  return gdj?.game_quests || gdj?.game_enigmas || gdj?.game_data?.quests || gdj?.quests || [];
}

function getLateMalusPoints(gdj: GameDataJson): number {
  const val = gdj?.game_meta?.late_malus_points ?? gdj?.game_meta?.default_time_malus ?? 0;
  return typeof val === 'string' ? parseFloat(val) || 0 : val;
}

function deduplicatePunches(
  punches: CardData['punches'],
  windowMs = 20000
): CardData['punches'] {
  const sorted = [...punches].sort((a, b) => {
    const ta = new Date(a.time).getTime();
    const tb = new Date(b.time).getTime();
    return ta - tb;
  });

  const result: CardData['punches'] = [];
  for (const punch of sorted) {
    const last = result.findLast(p => p.code === punch.code);
    if (!last) {
      result.push(punch);
      continue;
    }
    const diff = Math.abs(new Date(punch.time).getTime() - new Date(last.time).getTime());
    if (diff >= windowMs) {
      result.push(punch);
    }
  }
  return result;
}

function isCheatDetected(
  currentPunches: CardData['punches'],
  previousPunches: CardData['punches']
): boolean {
  if (previousPunches.length === 0 || currentPunches.length === 0) return false;

  const previousPunchKeys = new Set(previousPunches.map(p => `${p.code}:${p.time}`));
  const newPunches = currentPunches.filter(p => !previousPunchKeys.has(`${p.code}:${p.time}`));

  return newPunches.length === 0;
}

function buildStationToQuestMap(
  patternItems: PatternItem[]
): Map<number, { questIndex: number; imageSlot: string }> {
  const map = new Map<number, { questIndex: number; imageSlot: string }>();
  for (const item of patternItems) {
    map.set(item.station_key_number, {
      questIndex: item.item_index,
      imageSlot: item.assignment_type,
    });
  }
  return map;
}

function computeLevel(
  score: number,
  levels: GameMeta['levels']
): { level: number; name: string } | null {
  if (!levels) return null;
  let best: { level: number; name: string } | null = null;
  for (const [key, val] of Object.entries(levels)) {
    const threshold = val.points ? parseFloat(val.points) : null;
    if (threshold === null) continue;
    if (score >= threshold) {
      const lvlNum = parseInt(key, 10);
      if (!best || lvlNum > best.level) {
        best = { level: lvlNum, name: val.name || `Level ${lvlNum}` };
      }
    }
  }
  return best;
}

export async function processTagQuestPunch(
  card: CardData,
  launchedGameId: number,
  gameUniqid: string,
  playMode: 'solo' | 'team',
  teamsConfig: Team[]
): Promise<PunchResult> {
  const errorResult = (message: string): PunchResult => ({
    team_name: '',
    team_id: 0,
    teammate_chip_id: null,
    completed_quest: null,
    points_earned: 0,
    malus_applied: 0,
    new_total_score: 0,
    level_up: null,
    best_partial_quest: null,
    end_station_reached: false,
    game_ended: false,
    status: 'error',
    message,
  });

  try {
    // Step 1: Resolve team from chip ID
    let resolvedTeamId: number | null = null;
    let teammateChipId: number | null = null;

    const { data: directTeam } = await supabase
      .from('teams')
      .select('*')
      .eq('launched_game_id', launchedGameId)
      .eq('key_id', card.id)
      .maybeSingle();

    if (directTeam) {
      resolvedTeamId = directTeam.id;
    } else if (playMode === 'team') {
      for (const t of teamsConfig) {
        const match = t.teammates?.find(mate => mate.chipId === card.id);
        if (match) {
          const { data: parentTeam } = await supabase
            .from('teams')
            .select('*')
            .eq('launched_game_id', launchedGameId)
            .eq('key_id', t.chipId)
            .maybeSingle();

          if (parentTeam) {
            resolvedTeamId = parentTeam.id;
            teammateChipId = card.id;
          }
          break;
        }
      }
    }

    if (resolvedTeamId === null) {
      console.log('[TagQuest] Chip not recognized:', card.id);
      return {
        team_name: '',
        team_id: 0,
        teammate_chip_id: null,
        completed_quest: null,
        points_earned: 0,
        malus_applied: 0,
        new_total_score: 0,
        level_up: null,
        best_partial_quest: null,
        end_station_reached: false,
        game_ended: false,
        status: 'chip_not_recognized',
        message: `Chip ${card.id} not recognized in game ${launchedGameId}`,
      };
    }

    const { data: team } = await supabase
      .from('teams')
      .select('*')
      .eq('id', resolvedTeamId)
      .maybeSingle();

    if (!team) return errorResult('Team record not found');

    // Step 2: Check if team already finished
    if (team.end_time) {
      console.log('[TagQuest] Team already finished:', team.team_name);
      return {
        team_name: team.team_name,
        team_id: team.id,
        teammate_chip_id: teammateChipId,
        completed_quest: null,
        points_earned: 0,
        malus_applied: 0,
        new_total_score: team.score,
        level_up: null,
        best_partial_quest: null,
        end_station_reached: false,
        game_ended: true,
        status: 'team_already_finished',
        message: `${team.team_name} has already completed the game`,
      };
    }

    // Step 3: Cheat detection using previous raw data for the same chip
    const { data: previousRecords } = await supabase
      .from('launched_game_raw_data')
      .select('raw_data, created_at')
      .eq('launched_game_id', launchedGameId)
      .eq('raw_data->>id', card.id.toString())
      .order('created_at', { ascending: false })
      .limit(2);

    if (previousRecords && previousRecords.length >= 2) {
      const previousCard = previousRecords[1].raw_data as CardData;
      if (isCheatDetected(card.punches, previousCard.punches)) {
        console.log('[TagQuest] Cheat detected for chip:', card.id, 'team:', team.team_name);
        return {
          team_name: team.team_name,
          team_id: team.id,
          teammate_chip_id: teammateChipId,
          completed_quest: null,
          points_earned: 0,
          malus_applied: 0,
          new_total_score: team.score,
          level_up: null,
          best_partial_quest: null,
          end_station_reached: false,
          game_ended: false,
          status: 'cheat_detected',
          message: `Cheat detected for ${team.team_name} (chip ${card.id})`,
        };
      }
    }

    // Step 4: Load pattern items for station→quest mapping
    const patternNumber = team.pattern;

    const { data: patternRow } = await supabase
      .from('patterns')
      .select('id')
      .eq('number', patternNumber)
      .maybeSingle();

    let patternItems: PatternItem[] = [];
    if (patternRow) {
      const { data: items } = await supabase
        .from('tagquest_pattern_items')
        .select('item_index, assignment_type, station_key_number')
        .eq('pattern_id', patternRow.id);

      if (items) patternItems = items;
    }

    // Step 5: Load game data for quest definitions
    let gameDataJson: GameDataJson | null = null;
    const isElectron = typeof window !== 'undefined' && (window as any).electron?.isElectron;

    if (isElectron) {
      try {
        const raw = await (window as any).electron.games.readFile(gameUniqid, 'game-data.json');
        gameDataJson = JSON.parse(raw);
      } catch {
        console.warn('[TagQuest] Could not load game-data.json from electron');
      }
    } else {
      const { data: scenarioData } = await supabase
        .from('scenarios')
        .select('game_data_json')
        .eq('uniqid', gameUniqid)
        .maybeSingle();

      if (scenarioData?.game_data_json) {
        gameDataJson = scenarioData.game_data_json as GameDataJson;
      }
    }

    const quests = gameDataJson ? getQuests(gameDataJson) : [];
    const lateMalusPoints = gameDataJson ? getLateMalusPoints(gameDataJson) : 0;
    const levels = gameDataJson?.game_meta?.levels;

    // Step 6: Load already-scored quests for this team
    const { data: completedQuests } = await supabase
      .from('team_completed_quests')
      .select('quest_id')
      .eq('team_id', team.id);

    const completedQuestIds = new Set((completedQuests || []).map(r => r.quest_id));

    // Step 7: Sanitize - remove already-scored quest punches from working set
    const stationMap = buildStationToQuestMap(patternItems);
    let workingPunches = [...card.punches];

    for (const questId of completedQuestIds) {
      const questDef = quests.find(q => q.id === questId);
      if (!questDef) continue;

      const questPatternItems = patternItems.filter(
        pi => pi.item_index === parseInt(questDef.number, 10)
      );
      const requiredStations = new Set(questPatternItems.map(pi => String(pi.station_key_number)));

      const presentStations = new Set(workingPunches.map(p => String(p.code)));
      const allPresent = [...requiredStations].every(s => presentStations.has(s));

      if (allPresent) {
        workingPunches = workingPunches.filter(p => !requiredStations.has(String(p.code)));
      }
    }

    // Step 8: Deduplicate punches
    workingPunches = deduplicatePunches(workingPunches);

    // Step 9: Quest completion analysis
    const workingCodes = new Set(workingPunches.map(p => String(p.code)));

    interface QuestProgress {
      quest: GameQuest;
      totalSlots: number;
      matchedSlots: number;
    }
    const questProgress = new Map<string, QuestProgress>();

    for (const quest of quests) {
      if (completedQuestIds.has(quest.id)) continue;

      const questIndex = parseInt(quest.number, 10);
      const questSlots = patternItems.filter(pi => pi.item_index === questIndex);
      if (questSlots.length === 0) continue;

      const matched = questSlots.filter(pi => workingCodes.has(String(pi.station_key_number))).length;
      questProgress.set(quest.id, {
        quest,
        totalSlots: questSlots.length,
        matchedSlots: matched,
      });
    }

    const completedNow = [...questProgress.values()].filter(
      qp => qp.matchedSlots === qp.totalSlots && qp.totalSlots > 0
    );

    // Step 10: Late malus calculation
    let malusApplied = 0;
    const { data: launchedGame } = await supabase
      .from('launched_games')
      .select('start_time, duration')
      .eq('id', launchedGameId)
      .maybeSingle();

    if (launchedGame && lateMalusPoints > 0) {
      const startMs = new Date(launchedGame.start_time).getTime();
      const durationMs = (launchedGame.duration ?? 0) * 60 * 1000;
      const deadline = startMs + durationMs;
      const now = Date.now();
      if (now > deadline) {
        const minutesOver = Math.ceil((now - deadline) / 60000);
        malusApplied = minutesOver * lateMalusPoints;
      }
    }

    // Step 11: Apply scoring
    let pointsEarned = 0;
    let newCompletedQuest: PunchResult['completed_quest'] = null;

    for (const qp of completedNow) {
      const rawPts = qp.quest.points ?? qp.quest.good_answer_points ?? 0;
      const pts = typeof rawPts === 'string' ? parseInt(rawPts, 10) || 0 : rawPts;

      pointsEarned += pts;

      await supabase.from('team_completed_quests').insert({
        launched_game_id: launchedGameId,
        team_id: team.id,
        teammate_chip_id: teammateChipId ?? card.id,
        quest_id: qp.quest.id,
        quest_number: qp.quest.number,
        points_awarded: pts,
      });

      if (!newCompletedQuest) {
        newCompletedQuest = {
          id: qp.quest.id,
          number: qp.quest.number,
          text: qp.quest.text,
          points: pts,
        };
      }
    }

    const scoreDelta = pointsEarned - malusApplied;
    const prevScore = team.score ?? 0;
    const newScore = Math.max(0, prevScore + scoreDelta);

    // Step 12: Level up check
    let levelUpResult: PunchResult['level_up'] = null;
    if (levels) {
      const prevLevel = computeLevel(prevScore, levels);
      const newLevel = computeLevel(newScore, levels);
      if (newLevel && (!prevLevel || newLevel.level > prevLevel.level)) {
        levelUpResult = { new_level: newLevel.level, name: newLevel.name };
      }
    }

    // Step 13: End station detection — only end_time if card.end is present
    const endStationReached = card.end != null;

    let gameEnded = false;
    if (endStationReached && !team.end_time) {
      const endTime = Math.floor(Date.now() / 1000);
      await supabase.from('teams').update({ end_time: endTime, score: newScore }).eq('id', team.id);
      gameEnded = true;
    } else if (scoreDelta !== 0 || completedNow.length > 0) {
      await supabase.from('teams').update({ score: newScore }).eq('id', team.id);
    }

    // Step 14: Best partial quest (if no complete quest this round)
    let bestPartial: PunchResult['best_partial_quest'] = null;
    if (completedNow.length === 0) {
      const inProgress = [...questProgress.values()].filter(qp => qp.matchedSlots > 0);
      if (inProgress.length > 0) {
        const best = inProgress.reduce((a, b) => a.matchedSlots >= b.matchedSlots ? a : b);
        bestPartial = {
          id: best.quest.id,
          number: best.quest.number,
          text: best.quest.text,
          matched: best.matchedSlots,
        };
      }
    }

    const result: PunchResult = {
      team_name: team.team_name,
      team_id: team.id,
      teammate_chip_id: teammateChipId,
      completed_quest: newCompletedQuest,
      points_earned: pointsEarned,
      malus_applied: malusApplied,
      new_total_score: newScore,
      level_up: levelUpResult,
      best_partial_quest: bestPartial,
      end_station_reached: endStationReached,
      game_ended: gameEnded,
      status: 'ok',
    };

    console.log('[TagQuest] Punch processed:', JSON.stringify(result, null, 2));
    return result;
  } catch (err) {
    console.error('[TagQuest] Error processing punch:', err);
    return errorResult(String(err));
  }
}
