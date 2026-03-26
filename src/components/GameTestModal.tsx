import { useState, useEffect } from 'react';
import { X, FlaskConical, Play, CheckCircle, AlertCircle, Loader, Monitor, Image as ImageIcon, CheckSquare, Square } from 'lucide-react';
import { supabase } from '../lib/db';
import { loadPatternEnigmas } from '../utils/patterns';

interface GameTestModalProps {
  gameId: number;
  gameName: string;
  onClose: () => void;
}

interface TestConfig {
  numberOfTeams: number;
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

interface TestTeam {
  id: number;
  team_name: string;
  key_id: string;
  start_time: number | null;
  end_time: number | null;
  score: number;
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
  number: string;
  text: string;
  images: QuestImage[];
}

export function GameTestModal({ gameId, gameName, onClose }: GameTestModalProps) {
  const [gameType, setGameType] = useState<string | null>(null);
  const [loadingType, setLoadingType] = useState(true);

  const [testConfig, setTestConfig] = useState<TestConfig>({
    numberOfTeams: 3,
    goodAnswerPercent: 60,
    badAnswerPercent: 20,
    noAnswerPercent: 20,
    selectedDeviceId: '',
  });
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [testRunning, setTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testLog, setTestLog] = useState<string[]>([]);
  const [percentError, setPercentError] = useState('');

  const [quests, setQuests] = useState<Quest[]>([]);
  const [loadingQuests, setLoadingQuests] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());

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
        setLoadingQuests(true);
        const { data: scenario } = await supabase
          .from('scenarios')
          .select('game_data_json')
          .eq('uniqid', launchedGame.game_uniqid)
          .maybeSingle();

        if (scenario) {
          const gdj = scenario.game_data_json;
          const rawQuests: any[] = gdj?.game_data?.quests || gdj?.quests || gdj?.game_quests || [];

          const parsedQuests: Quest[] = rawQuests.map((q: any) => {
            const images: QuestImage[] = [];
            if (q.main_image) images.push({ key: q.main_image, label: 'Main image' });
            for (let i = 1; i <= 4; i++) {
              if (q[`image_${i}`]) images.push({ key: q[`image_${i}`], label: `Image ${i}` });
            }
            return { number: q.number ?? '', text: q.text ?? `Quest ${q.number}`, images };
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

  const toggleQuestAll = (quest: Quest) => {
    const allKeys = quest.images.map(i => i.key);
    const allSelected = allKeys.every(k => selectedImages.has(k));
    setSelectedImages(prev => {
      const next = new Set(prev);
      if (allSelected) {
        allKeys.forEach(k => next.delete(k));
      } else {
        allKeys.forEach(k => next.add(k));
      }
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

  const buildTagQuestMockCard = (teamKeyId: string, imageKeys: string[]): any => {
    const now = Math.floor(Date.now() / 1000);
    const punches = imageKeys.map(code => ({ code, time: now }));
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

  const runTest = async () => {
    if (gameType !== 'tagquest' && totalPercent !== 100) {
      setPercentError('Percentages must add up to exactly 100%');
      return;
    }

    setTestRunning(true);
    setTestResults([]);
    setTestLog([]);

    const deviceLabel = testConfig.selectedDeviceId || 'game_test_simulator';
    appendLog(`Starting test simulation on device: ${deviceLabel}`);

    try {
      const { data: allTeams, error: teamsError } = await supabase
        .from('teams')
        .select('id, team_name, key_id, start_time, end_time, score')
        .eq('launched_game_id', gameId)
        .order('id', { ascending: true });

      if (teamsError) {
        appendLog(`Error loading teams: ${teamsError.message}`);
        setTestRunning(false);
        return;
      }

      const teams: TestTeam[] = allTeams || [];
      if (teams.length === 0) {
        appendLog('No teams found. Please create teams before running a test.');
        setTestRunning(false);
        return;
      }

      const teamsToTest = teams.slice(0, testConfig.numberOfTeams);
      appendLog(`Simulating ${teamsToTest.length} team(s)`);

      if (gameType?.toLowerCase() === 'tagquest') {
        const imageKeys = Array.from(selectedImages);
        appendLog(`Selected ${imageKeys.length} image(s) across ${quests.length} quest(s)`);

        const results: TestResult[] = [];

        for (const team of teamsToTest) {
          appendLog(`Processing: ${team.team_name}`);

          if (team.start_time || team.end_time) {
            await supabase.from('teams').update({ start_time: null, end_time: null, score: 0 }).eq('id', team.id);
            appendLog('  Reset previous run');
          }

          const startTime = Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 1200 + 300);
          await supabase.from('teams').update({ start_time: startTime }).eq('id', team.id);

          const mockCard = buildTagQuestMockCard(team.key_id, imageKeys);

          await supabase.from('launched_game_raw_data').insert({
            launched_game_id: gameId,
            device_id: deviceLabel,
            raw_data: mockCard,
          });

          const totalScore = imageKeys.length * 10;
          const endTime = Math.floor(Date.now() / 1000);

          const { error: endErr } = await supabase
            .from('teams')
            .update({ end_time: endTime, score: totalScore })
            .eq('id', team.id);

          if (endErr) {
            appendLog(`  Error: ${endErr.message}`);
            results.push({ teamName: team.team_name, score: 0, status: 'error', message: endErr.message });
          } else {
            const duration = endTime - startTime;
            const mins = Math.floor(duration / 60);
            const secs = duration % 60;
            const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
            appendLog(`  Done — Score: ${totalScore}, Time: ${timeStr}`);
            results.push({
              teamName: team.team_name,
              score: totalScore,
              status: 'success',
              message: `Score: ${totalScore} — Time: ${timeStr}`,
            });
          }

          await new Promise(r => setTimeout(r, 150));
        }

        setTestResults(results);
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

      const { data: launchedGameForScoring } = await supabase
        .from('launched_games')
        .select('game_uniqid')
        .eq('id', gameId)
        .maybeSingle();

      let enigmasForScoring: any[] = [];
      if (launchedGameForScoring?.game_uniqid) {
        const { data: scenarioData } = await supabase
          .from('scenarios')
          .select('game_data_json')
          .eq('uniqid', launchedGameForScoring.game_uniqid)
          .maybeSingle();

        enigmasForScoring =
          scenarioData?.game_data_json?.game_enigmas ||
          scenarioData?.game_data_json?.game_data?.game_enigmas || [];
      }

      const results: TestResult[] = [];

      for (const team of teamsToTest) {
        appendLog(`Processing: ${team.team_name}`);

        if (team.start_time || team.end_time) {
          await supabase.from('teams').update({ start_time: null, end_time: null, score: 0 }).eq('id', team.id);
          appendLog('  Reset previous run');
        }

        const startTime = Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 1200 + 300);
        await supabase.from('teams').update({ start_time: startTime }).eq('id', team.id);

        const mockCard = buildMockCard(
          team.key_id,
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
          results.push({ teamName: team.team_name, score: 0, status: 'error', message: endErr.message });
        } else {
          const duration = endTime - startTime;
          const mins = Math.floor(duration / 60);
          const secs = duration % 60;
          const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
          appendLog(`  Done — Score: ${totalScore}, Time: ${timeStr}`);
          results.push({
            teamName: team.team_name,
            score: totalScore,
            status: 'success',
            message: `Score: ${totalScore} — Time: ${timeStr}`,
          });
        }

        await new Promise(r => setTimeout(r, 150));
      }

      setTestResults(results);
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
            Run Game Test
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X size={22} />
          </button>
        </div>

        <p className="text-slate-400 text-xs mb-5">
          Game: <span className="text-white font-medium">{gameName}</span>
        </p>

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

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Number of Teams to Test
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={testConfig.numberOfTeams}
                onChange={e => handleChange('numberOfTeams', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {gameType?.toLowerCase() === 'tagquest' ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <ImageIcon size={15} className="text-amber-400" />
                    Quest Images Found
                  </label>
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
                  >
                    {allSelected ? <CheckSquare size={14} className="text-amber-400" /> : <Square size={14} />}
                    {allSelected ? 'Deselect all' : 'Select all'}
                  </button>
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
                      const questAllSelected = questKeys.every(k => selectedImages.has(k));
                      const questSomeSelected = questKeys.some(k => selectedImages.has(k));
                      return (
                        <div key={quest.number} className="bg-slate-700/40 rounded-lg border border-slate-600 overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-600/60">
                            <span className="text-sm font-medium text-white">
                              Quest {quest.number}
                              {quest.text && quest.text !== `Quest ${quest.number}` && (
                                <span className="text-slate-400 font-normal ml-1.5 text-xs">— {quest.text}</span>
                              )}
                            </span>
                            <button
                              onClick={() => toggleQuestAll(quest)}
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
                              return (
                                <button
                                  key={img.key}
                                  onClick={() => toggleImage(img.key)}
                                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition ${
                                    checked
                                      ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                                      : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-400 hover:text-white'
                                  }`}
                                >
                                  {checked ? <CheckCircle size={11} /> : <ImageIcon size={11} />}
                                  {img.label}
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

            <button
              onClick={runTest}
              disabled={testRunning || (gameType !== 'tagquest' && totalPercent !== 100)}
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

        {testResults.length > 0 && (
          <div className="mt-4">
            <h5 className="text-sm font-semibold text-slate-300 mb-2">Results</h5>
            <div className="space-y-2">
              {testResults.map((result, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                    result.status === 'success'
                      ? 'bg-green-900/20 border border-green-800/40'
                      : 'bg-red-900/20 border border-red-800/40'
                  }`}
                >
                  {result.status === 'success' ? (
                    <CheckCircle size={16} className="text-green-400 shrink-0" />
                  ) : (
                    <AlertCircle size={16} className="text-red-400 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{result.teamName}</p>
                    <p className="text-slate-400 text-xs">{result.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
