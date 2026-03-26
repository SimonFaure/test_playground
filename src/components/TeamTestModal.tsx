import { useState, useEffect } from 'react';
import { X, FlaskConical, Play, CheckCircle, AlertCircle, Loader, Monitor, Users, Image as ImageIcon, CheckSquare, Square, FileSearch } from 'lucide-react';
import { supabase } from '../lib/db';
import { loadPatternEnigmas } from '../utils/patterns';

interface TeamTestModalProps {
  gameId: number;
  gameName: string;
  team: {
    id: number;
    team_name: string;
    team_number: number;
    key_id: number;
  };
  onClose: () => void;
}

interface TestConfig {
  goodAnswerPercent: number;
  badAnswerPercent: number;
  noAnswerPercent: number;
  selectedDeviceId: string;
}

interface TestResult {
  teamName: string;
  score: number;
  status: 'success' | 'error';
  message: string;
}

interface Device {
  id: number;
  device_id: string;
  connected: boolean;
  last_connexion_attempt: string;
}

interface QuestImage {
  key: string;
  label: string;
}

interface Quest {
  index: number;
  number: string;
  text: string;
  images: QuestImage[];
}

export function TeamTestModal({ gameId, gameName, team, onClose }: TeamTestModalProps) {
  const [gameType, setGameType] = useState<string | null>(null);
  const [loadingType, setLoadingType] = useState(true);

  const [testConfig, setTestConfig] = useState<TestConfig>({
    goodAnswerPercent: 60,
    badAnswerPercent: 20,
    noAnswerPercent: 20,
    selectedDeviceId: '',
  });
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testLog, setTestLog] = useState<string[]>([]);
  const [percentError, setPercentError] = useState('');

  const [quests, setQuests] = useState<Quest[]>([]);
  const [loadingQuests, setLoadingQuests] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [gameUniqid, setGameUniqid] = useState<string | null>(null);
  const [endChip, setEndChip] = useState(false);

  const [patternCheckResult, setPatternCheckResult] = useState<{ found: boolean; slug: string; path?: string } | null>(null);
  const [checkingPattern, setCheckingPattern] = useState(false);

  const totalPercent = testConfig.goodAnswerPercent + testConfig.badAnswerPercent + testConfig.noAnswerPercent;

  useEffect(() => {
    loadDevices();
    detectGameType();
  }, [gameId]);

  const detectGameType = async () => {
    setLoadingType(true);
    const { data: launchedGame } = await supabase
      .from('launched_games')
      .select('game_type, game_uniqid')
      .eq('id', gameId)
      .maybeSingle();

    if (launchedGame) {
      setGameType(launchedGame.game_type);

      if (launchedGame.game_type?.toLowerCase() === 'tagquest' && launchedGame.game_uniqid) {
        setGameUniqid(launchedGame.game_uniqid);
        setLoadingQuests(true);
        const { data: scenario } = await supabase
          .from('scenarios')
          .select('game_data_json')
          .eq('uniqid', launchedGame.game_uniqid)
          .maybeSingle();

        if (scenario) {
          let gdj = scenario.game_data_json;

          if (!gdj) {
            const { data: gameDataFile } = await supabase.storage
              .from('resources')
              .download(`scenarios/${launchedGame.game_uniqid}/game-data.json`);

            if (gameDataFile) {
              const text = await gameDataFile.text();
              gdj = JSON.parse(text);
            }
          }

          const rawQuests: any[] = gdj?.game_data?.quests || gdj?.quests || gdj?.game_quests || [];

          const parsedQuests: Quest[] = rawQuests.map((q: any, idx: number) => {
            const images: QuestImage[] = [];
            if (q.main_image) images.push({ key: q.main_image, label: 'Main' });
            for (let i = 1; i <= 4; i++) {
              if (q[`image_${i}`]) images.push({ key: q[`image_${i}`], label: `Image ${i}` });
            }
            return { index: idx + 1, number: q.number ?? '', text: q.text ?? '', images };
          });

          setQuests(parsedQuests);
        }
        setLoadingQuests(false);
      }
    }

    setLoadingType(false);
  };

  const loadDevices = async () => {
    setLoadingDevices(true);
    const { data, error } = await supabase
      .from('launched_game_devices')
      .select('*')
      .eq('launched_game_id', gameId)
      .order('last_connexion_attempt', { ascending: false });

    if (!error && data) {
      setDevices(data);
      if (data.length > 0) {
        setTestConfig(prev => ({ ...prev, selectedDeviceId: data[0].device_id }));
      }
    }
    setLoadingDevices(false);
  };

  const handleChange = (field: keyof TestConfig, value: number | string) => {
    setTestConfig(prev => ({ ...prev, [field]: value }));
    setPercentError('');
  };

  const appendLog = (msg: string) => {
    setTestLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const toggleImage = (key: string) => {
    setSelectedImages(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectQuestAll = (quest: Quest) => {
    const allKeys = quest.images.map(i => i.key);
    setSelectedImages(prev => {
      const next = new Set(prev);
      allKeys.forEach(k => next.add(k));
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allKeys = quests.flatMap(q => q.images.map(i => i.key));
    const allSelected = allKeys.every(k => selectedImages.has(k));
    if (allSelected) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(allKeys));
    }
  };

  const buildMockCard = (teamKeyId: string, patternEnigmas: any[], goodPct: number, badPct: number): any => {
    const punches: Array<{ code: string; time: number }> = [];
    const now = Math.floor(Date.now() / 1000);

    for (const enigma of patternEnigmas) {
      const roll = Math.random() * 100;
      if (roll < goodPct && enigma.good_answers.length > 0) {
        const answer = enigma.good_answers[Math.floor(Math.random() * enigma.good_answers.length)];
        punches.push({ code: answer, time: now });
      } else if (roll < goodPct + badPct && enigma.wrong_answers.length > 0) {
        const answer = enigma.wrong_answers[Math.floor(Math.random() * enigma.wrong_answers.length)];
        punches.push({ code: answer, time: now });
      }
    }

    return {
      id: teamKeyId,
      series: 0,
      nbPunch: punches.length,
      start: { code: '255', time: now - 600 },
      check: null,
      end: { code: '254', time: now },
      punches,
    };
  };

  interface PatternItem {
    item_index: number;
    assignment_type: string;
    station_key_number: number;
  }

  const checkPatternFile = async () => {
    setCheckingPattern(true);
    setPatternCheckResult(null);
    try {
      const { data: metaRows } = await supabase
        .from('launched_game_meta')
        .select('meta_name, meta_value')
        .eq('launched_game_id', gameId);

      const patternSlug = metaRows?.find(m => m.meta_name === 'pattern')?.meta_value || 'ado_adultes';
      const { getPatternFilesFromStorage } = await import('../utils/patterns');
      const storageFiles = await getPatternFilesFromStorage('mystery');
      const match = storageFiles.find(f => f.slug === patternSlug);
      if (match) {
        setPatternCheckResult({ found: true, slug: patternSlug, path: match.storagePath });
      } else {
        setPatternCheckResult({ found: false, slug: patternSlug });
      }
    } catch (e) {
      setPatternCheckResult({ found: false, slug: '?' });
    } finally {
      setCheckingPattern(false);
    }
  };

  const loadPatternItems = async (patternSlug: string): Promise<PatternItem[]> => {
    const fetchPatternJson = async (storagePath: string): Promise<PatternItem[] | null> => {
      try {
        const { data: urlData } = supabase.storage.from('resources').getPublicUrl(storagePath);
        const resp = await fetch(urlData.publicUrl);
        if (resp.ok) {
          const json = await resp.json();
          if (Array.isArray(json?.pattern_data)) return json.pattern_data;
        }
      } catch {}
      return null;
    };

    try {
      const { getPatternFilesFromStorage } = await import('../utils/patterns');
      const storageFiles = await getPatternFilesFromStorage('mystery');
      const match = storageFiles.find(f => f.slug === patternSlug);
      if (match) {
        const items = await fetchPatternJson(`patterns/mystery/${match.fileName}`);
        if (items) {
          appendLog(`Pattern file: patterns/mystery/${match.fileName}`);
          return items;
        }
      }
    } catch {}

    appendLog(`No pattern items found for slug: ${patternSlug}`);
    return [];
  };

  const buildTagQuestMockCard = (
    teamKeyId: string,
    selectedImageKeys: Set<string>,
    patternItems: PatternItem[],
    withEnd: boolean
  ): any => {
    const now = Math.floor(Date.now() / 1000);

    const itemMap: Record<string, number> = {};
    patternItems.forEach(p => {
      itemMap[`${p.item_index}:${p.assignment_type}`] = p.station_key_number;
    });

    const punches: Array<{ code: string; time: number }> = [];
    for (const quest of quests) {
      for (const img of quest.images) {
        if (!selectedImageKeys.has(img.key)) continue;
        if (img.label === 'Main') continue;
        const imgIndexMatch = img.label.match(/^Image\s+(\d+)$/i);
        if (!imgIndexMatch) continue;
        const imgIndex = parseInt(imgIndexMatch[1], 10);
        const assignmentType = `image_${imgIndex}`;
        const stationKey = itemMap[`${quest.index}:${assignmentType}`];
        if (stationKey !== undefined) {
          punches.push({ code: String(stationKey), time: now });
        }
      }
    }

    return {
      id: teamKeyId,
      series: 0,
      nbPunch: punches.length,
      start: { code: '255', time: now - 600 },
      check: null,
      end: withEnd ? { code: '254', time: now } : null,
      punches,
    };
  };

  const runTest = async () => {
    if (gameType?.toLowerCase() !== 'tagquest' && totalPercent !== 100) {
      setPercentError('Percentages must add up to exactly 100%');
      return;
    }

    setTestRunning(true);
    setTestResult(null);
    setTestLog([]);

    const deviceLabel = testConfig.selectedDeviceId || 'game_test_simulator';
    appendLog(`Starting test simulation on device: ${deviceLabel}`);

    try {
      const { data: currentTeam } = await supabase
        .from('teams')
        .select('start_time, end_time')
        .eq('id', team.id)
        .maybeSingle();

      if (currentTeam?.start_time || currentTeam?.end_time) {
        await supabase.from('teams').update({ start_time: null, end_time: null, score: 0 }).eq('id', team.id);
        appendLog('  Reset previous run');
      }

      appendLog(`Processing: ${team.team_name}`);

      if (gameType?.toLowerCase() === 'tagquest') {
        appendLog(`Selected ${selectedImages.size} image(s) across ${quests.length} quest(s)`);

        const { data: metaDataTQ } = await supabase
          .from('launched_game_meta')
          .select('meta_name, meta_value')
          .eq('launched_game_id', gameId);

        const metaMapTQ: Record<string, string> = {};
        metaDataTQ?.forEach(m => { metaMapTQ[m.meta_name] = m.meta_value || ''; });
        const tqPatternName = metaMapTQ.pattern || 'ado_adultes';

        appendLog(`Loading pattern items: ${tqPatternName}`);
        const tqPatternItems = await loadPatternItems(tqPatternName);
        appendLog(`Loaded ${tqPatternItems.length} pattern item(s)`);

        const startTime = Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 1200 + 300);
        await supabase.from('teams').update({ start_time: startTime }).eq('id', team.id);

        const mockCard = buildTagQuestMockCard(team.key_id.toString(), selectedImages, tqPatternItems, endChip);

        appendLog(`Punch: ${JSON.stringify(mockCard)}`);

        await supabase.from('launched_game_raw_data').insert({
          launched_game_id: gameId,
          device_id: deviceLabel,
          raw_data: mockCard,
        });

        const totalScore = mockCard.nbPunch * 10;
        const endTime = Math.floor(Date.now() / 1000);

        const { error: endErr } = await supabase
          .from('teams')
          .update({ end_time: endTime, score: totalScore })
          .eq('id', team.id);

        if (endErr) {
          appendLog(`  Error: ${endErr.message}`);
          setTestResult({ teamName: team.team_name, score: 0, status: 'error', message: endErr.message });
        } else {
          const duration = endTime - startTime;
          const mins = Math.floor(duration / 60);
          const secs = duration % 60;
          const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
          appendLog(`  Done — Score: ${totalScore}, Time: ${timeStr}`);
          setTestResult({ teamName: team.team_name, score: totalScore, status: 'success', message: `Score: ${totalScore} — Time: ${timeStr}` });
        }

        appendLog('Simulation complete.');
        return;
      }

      const { data: metaData } = await supabase
        .from('launched_game_meta')
        .select('meta_name, meta_value')
        .eq('launched_game_id', gameId);

      const metaMap: Record<string, string> = {};
      metaData?.forEach(m => { metaMap[m.meta_name] = m.meta_value || ''; });
      const patternName = metaMap.pattern || 'ado_adultes';

      appendLog(`Loading pattern: ${patternName}`);
      const patternEnigmas = await loadPatternEnigmas('mystery', patternName);

      if (patternEnigmas.length === 0) {
        appendLog('Warning: No pattern enigmas loaded (pattern file may not be available here)');
      } else {
        appendLog(`Loaded ${patternEnigmas.length} enigmas`);
      }

      const { data: launchedGame } = await supabase
        .from('launched_games')
        .select('game_uniqid')
        .eq('id', gameId)
        .maybeSingle();

      let enigmasForScoring: any[] = [];
      if (launchedGame?.game_uniqid) {
        const { data: scenarioData } = await supabase
          .from('scenarios')
          .select('game_data_json')
          .eq('uniqid', launchedGame.game_uniqid)
          .maybeSingle();

        enigmasForScoring =
          scenarioData?.game_data_json?.game_enigmas ||
          scenarioData?.game_data_json?.game_data?.game_enigmas || [];
      }

      const startTime = Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 1200 + 300);
      await supabase.from('teams').update({ start_time: startTime }).eq('id', team.id);

      const mockCard = buildMockCard(
        team.key_id.toString(),
        patternEnigmas,
        testConfig.goodAnswerPercent,
        testConfig.badAnswerPercent
      );

      await supabase.from('launched_game_raw_data').insert({
        launched_game_id: gameId,
        device_id: deviceLabel,
        raw_data: mockCard,
      });

      let totalScore = 0;
      if (enigmasForScoring.length > 0 && patternEnigmas.length > 0) {
        const cardCodes = mockCard.punches.map((p: any) => p.code.toString());
        for (const enigma of patternEnigmas) {
          const ge = enigmasForScoring.find((e: any) => e.number === enigma.enigma_id);
          const goodPts = parseInt(ge?.good_answer_points || '0');
          const wrongPts = parseInt(ge?.wrong_answer_points || '0');
          const hasGood = enigma.good_answers.some((a: string) => cardCodes.includes(a));
          const hasBad = enigma.wrong_answers.some((a: string) => cardCodes.includes(a));
          if (hasGood && !hasBad) totalScore += goodPts;
          else if (hasBad && !hasGood) totalScore -= wrongPts;
        }
      } else if (patternEnigmas.length === 0) {
        totalScore = mockCard.punches.length * 10;
      }

      const endTime = Math.floor(Date.now() / 1000);
      const { error: endErr } = await supabase
        .from('teams')
        .update({ end_time: endTime, score: totalScore })
        .eq('id', team.id);

      if (endErr) {
        appendLog(`  Error: ${endErr.message}`);
        setTestResult({ teamName: team.team_name, score: 0, status: 'error', message: endErr.message });
      } else {
        const duration = endTime - startTime;
        const mins = Math.floor(duration / 60);
        const secs = duration % 60;
        const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
        appendLog(`  Done — Score: ${totalScore}, Time: ${timeStr}`);
        setTestResult({ teamName: team.team_name, score: totalScore, status: 'success', message: `Score: ${totalScore} — Time: ${timeStr}` });
      }

      appendLog('Simulation complete.');
    } catch (err: any) {
      appendLog(`Unexpected error: ${err?.message || String(err)}`);
    } finally {
      setTestRunning(false);
    }
  };

  const allImageKeys = quests.flatMap(q => q.images.map(i => i.key));
  const allSelected = allImageKeys.length > 0 && allImageKeys.every(k => selectedImages.has(k));

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-slate-800 border-2 border-slate-700 rounded-xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <FlaskConical size={22} className="text-amber-400" />
            Run Team Test
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X size={22} />
          </button>
        </div>

        <p className="text-slate-400 text-xs mb-5">
          Game: <span className="text-white font-medium">{gameName}</span>
        </p>

        <div className="mb-5 px-4 py-3 bg-slate-700/50 rounded-lg border border-slate-600 flex items-center gap-3">
          <Users size={18} className="text-blue-400 shrink-0" />
          <div>
            <p className="text-white text-sm font-semibold">{team.team_name}</p>
            <p className="text-slate-400 text-xs">Team {team.team_number} · Chip #{team.key_id}</p>
          </div>
        </div>

        {loadingType ? (
          <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
            <Loader size={18} className="animate-spin" />
            <span className="text-sm">Loading game configuration...</span>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Connected Device
              </label>
              {loadingDevices ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                  <Loader size={14} className="animate-spin" />
                  Loading devices...
                </div>
              ) : devices.length === 0 ? (
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-700/50 rounded-lg border border-slate-600">
                  <Monitor size={16} className="text-slate-400" />
                  <span className="text-slate-400 text-sm">No connected devices — will use simulator</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {devices.map(device => (
                    <label
                      key={device.id}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition ${
                        testConfig.selectedDeviceId === device.device_id
                          ? 'border-amber-500 bg-amber-900/20'
                          : 'border-slate-600 bg-slate-700/40 hover:border-slate-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name="device"
                        value={device.device_id}
                        checked={testConfig.selectedDeviceId === device.device_id}
                        onChange={() => handleChange('selectedDeviceId', device.device_id)}
                        className="sr-only"
                      />
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${device.connected ? 'bg-green-400' : 'bg-slate-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{device.device_id}</p>
                        <p className="text-slate-400 text-xs">
                          {device.connected ? 'Connected' : 'Disconnected'} · last seen {new Date(device.last_connexion_attempt).toLocaleTimeString()}
                        </p>
                      </div>
                      {testConfig.selectedDeviceId === device.device_id && (
                        <CheckCircle size={16} className="text-amber-400 shrink-0" />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {gameType?.toLowerCase() === 'tagquest' ? (
              <div>
                <div className="flex items-center mb-3">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <ImageIcon size={15} className="text-amber-400" />
                    Quest Images Found
                  </label>
                </div>

                {loadingQuests ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm py-3">
                    <Loader size={14} className="animate-spin" />
                    Loading quests...
                  </div>
                ) : quests.length === 0 ? (
                  <div className="px-4 py-3 bg-slate-700/50 rounded-lg border border-slate-600 text-slate-400 text-sm">
                    No quests found for this game.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {quests.map(quest => {
                      const questKeys = quest.images.map(i => i.key);
                      const questAllSelected = questKeys.length > 0 && questKeys.every(k => selectedImages.has(k));
                      const questSomeSelected = questKeys.some(k => selectedImages.has(k));
                      return (
                        <div key={quest.index} className="bg-slate-700/40 rounded-lg border border-slate-600 overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-600/60">
                            <span className="text-sm font-medium text-white">
                              Quest {quest.index}
                            </span>
                            <button
                              onClick={() => selectQuestAll(quest)}
                              className={`flex items-center gap-1 text-xs transition ${
                                questAllSelected ? 'text-amber-400' : questSomeSelected ? 'text-amber-400/60' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {questAllSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                              All
                            </button>
                          </div>
                          <div className="p-2 flex flex-wrap gap-2">
                            {quest.images.map(img => {
                              const checked = selectedImages.has(img.key);
                              const isMain = img.label === 'Main';
                              const { data: urlData } = supabase.storage
                                .from('resources')
                                .getPublicUrl(`scenarios/${gameUniqid}/images/${img.key}`);
                              return (
                                <button
                                  key={img.key}
                                  onClick={() => isMain ? selectQuestAll(quest) : toggleImage(img.key)}
                                  className={`relative flex flex-col items-center gap-1 rounded-lg border-2 overflow-hidden transition ${
                                    checked
                                      ? 'border-amber-500 ring-1 ring-amber-500/50'
                                      : 'border-slate-600 hover:border-slate-400'
                                  }`}
                                  style={{ width: 80 }}
                                >
                                  <div className="w-full bg-slate-800" style={{ height: 60 }}>
                                    <img
                                      src={urlData.publicUrl}
                                      alt={img.label}
                                      className="w-full h-full object-cover"
                                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                    />
                                  </div>
                                  <span className={`text-[10px] font-medium pb-1 px-1 truncate w-full text-center ${checked ? 'text-amber-300' : 'text-slate-400'}`}>
                                    {img.label}
                                  </span>
                                  {checked && (
                                    <div className="absolute top-1 right-1 bg-amber-500 rounded-full p-0.5">
                                      <CheckCircle size={9} className="text-slate-900" />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className={`mt-3 flex items-center justify-between text-sm px-3 py-2 rounded-lg ${
                  selectedImages.size > 0 ? 'bg-amber-900/25 text-amber-400' : 'bg-slate-700/50 text-slate-400'
                }`}>
                  <span>{selectedImages.size} image{selectedImages.size !== 1 ? 's' : ''} selected</span>
                  <span className="text-xs font-medium">Score: {selectedImages.size * 10} pts</span>
                </div>

                <label className="mt-3 flex items-center gap-2.5 cursor-pointer select-none">
                  <button
                    type="button"
                    onClick={() => setEndChip(v => !v)}
                    className={`flex items-center justify-center w-4 h-4 rounded border transition ${endChip ? 'bg-amber-500 border-amber-500' : 'bg-transparent border-slate-500'}`}
                  >
                    {endChip && <CheckCircle size={10} className="text-slate-900" />}
                  </button>
                  <span className="text-sm text-slate-300">End chip</span>
                </label>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Answer Distribution</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-xs text-slate-300 font-medium">Good</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={testConfig.goodAnswerPercent}
                        onChange={e => handleChange('goodAnswerPercent', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-full px-3 py-2 pr-7 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">%</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <span className="text-xs text-slate-300 font-medium">Bad</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={testConfig.badAnswerPercent}
                        onChange={e => handleChange('badAnswerPercent', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-full px-3 py-2 pr-7 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">%</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-2 h-2 rounded-full bg-slate-400" />
                      <span className="text-xs text-slate-300 font-medium">None</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={testConfig.noAnswerPercent}
                        onChange={e => handleChange('noAnswerPercent', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-full px-3 py-2 pr-7 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">%</span>
                    </div>
                  </div>
                </div>

                <div className={`mt-3 flex items-center justify-between text-sm px-3 py-2 rounded-lg ${totalPercent === 100 ? 'bg-green-900/25 text-green-400' : 'bg-red-900/25 text-red-400'}`}>
                  <span>Total: <span className="font-semibold">{totalPercent}%</span></span>
                  <span className="font-medium text-xs">{totalPercent === 100 ? 'Ready' : 'Must equal 100%'}</span>
                </div>

                {percentError && <p className="text-red-400 text-xs mt-1">{percentError}</p>}
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={checkPatternFile}
                disabled={checkingPattern || testRunning}
                className="w-full px-4 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 rounded-lg font-medium flex items-center justify-center gap-2 transition text-sm border border-slate-600"
              >
                {checkingPattern ? (
                  <>
                    <Loader size={15} className="animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <FileSearch size={15} />
                    Check Pattern File
                  </>
                )}
              </button>

              {patternCheckResult && (
                <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-xs ${
                  patternCheckResult.found
                    ? 'bg-green-900/25 border border-green-800/40 text-green-300'
                    : 'bg-red-900/25 border border-red-800/40 text-red-300'
                }`}>
                  {patternCheckResult.found
                    ? <CheckCircle size={14} className="shrink-0 mt-0.5 text-green-400" />
                    : <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-400" />
                  }
                  <div className="min-w-0">
                    <span className="font-semibold">{patternCheckResult.slug}</span>
                    {patternCheckResult.found
                      ? <p className="text-green-400/80 mt-0.5 font-mono break-all">{patternCheckResult.path}</p>
                      : <p className="mt-0.5">Pattern file not found in storage</p>
                    }
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={runTest}
              disabled={testRunning || (gameType?.toLowerCase() !== 'tagquest' && totalPercent !== 100)}
              className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition"
            >
              {testRunning ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play size={18} />
                  Run Test
                </>
              )}
            </button>
          </div>
        )}

        {testLog.length > 0 && (
          <div className="mt-5">
            <h5 className="text-sm font-semibold text-slate-300 mb-2">Log</h5>
            <div className="bg-slate-900 rounded-lg p-3 max-h-36 overflow-y-auto font-mono text-xs text-slate-400 space-y-0.5">
              {testLog.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        )}

        {testResult && (
          <div className="mt-4">
            <h5 className="text-sm font-semibold text-slate-300 mb-2">Result</h5>
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                testResult.status === 'success'
                  ? 'bg-green-900/20 border border-green-800/40'
                  : 'bg-red-900/20 border border-red-800/40'
              }`}
            >
              {testResult.status === 'success' ? (
                <CheckCircle size={16} className="text-green-400 shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-red-400 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{testResult.teamName}</p>
                <p className="text-slate-400 text-xs">{testResult.message}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
