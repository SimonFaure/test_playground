import { useState, useEffect } from 'react';
import { Settings, Save, X, Monitor, Eye, EyeOff, FlaskConical, Play, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/db';
import { loadPatternEnigmas } from '../utils/patterns';

interface LaunchedGameConfigModalProps {
  gameId: number;
  gameName: string;
  onClose: () => void;
  onSave: () => void;
}

interface MetaField {
  id: number;
  meta_name: string;
  meta_value: string | null;
}

interface Device {
  id: number;
  device_id: string;
  connected: boolean;
  last_connexion_attempt: string;
}

interface RawData {
  id: number;
  device_id: string;
  raw_data: any;
  created_at: string;
}

interface TestConfig {
  numberOfTeams: number;
  goodAnswerPercent: number;
  badAnswerPercent: number;
  noAnswerPercent: number;
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

export function LaunchedGameConfigModal({ gameId, gameName, onClose, onSave }: LaunchedGameConfigModalProps) {
  const [metaFields, setMetaFields] = useState<MetaField[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [rawData, setRawData] = useState<Record<string, RawData[]>>({});
  const [showRawData, setShowRawData] = useState<Record<string, boolean>>({});

  const [testConfig, setTestConfig] = useState<TestConfig>({
    numberOfTeams: 3,
    goodAnswerPercent: 60,
    badAnswerPercent: 20,
    noAnswerPercent: 20,
  });
  const [testRunning, setTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testLog, setTestLog] = useState<string[]>([]);
  const [testPercentError, setTestPercentError] = useState('');

  useEffect(() => {
    loadMetaFields();
    loadDevices();
  }, [gameId]);

  const totalTestPercent = testConfig.goodAnswerPercent + testConfig.badAnswerPercent + testConfig.noAnswerPercent;

  const handleTestConfigChange = (field: keyof TestConfig, value: number) => {
    setTestConfig(prev => ({ ...prev, [field]: value }));
    setTestPercentError('');
  };

  const appendLog = (msg: string) => {
    setTestLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const loadMetaFields = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('launched_game_meta')
      .select('*')
      .eq('launched_game_id', gameId);

    if (error) {
      console.error('Error loading meta fields:', error);
    } else {
      const filteredData = (data || []).filter(field => field.meta_name !== 'firstChipIndex');
      setMetaFields(filteredData);

      const initialValues: Record<string, string> = {};
      filteredData.forEach(field => {
        initialValues[field.meta_name] = field.meta_value || '';
      });
      setEditedValues(initialValues);
    }
    setLoading(false);
  };

  const loadDevices = async () => {
    const { data, error } = await supabase
      .from('launched_game_devices')
      .select('*')
      .eq('launched_game_id', gameId);

    if (error) {
      console.error('Error loading devices:', error);
    } else {
      setDevices(data || []);
      await loadRawDataForDevices(data || []);
    }
  };

  const loadRawDataForDevices = async (devicesList: Device[]) => {
    const rawDataMap: Record<string, RawData[]> = {};

    for (const device of devicesList) {
      const { data, error } = await supabase
        .from('launched_game_raw_data')
        .select('*')
        .eq('launched_game_id', gameId)
        .eq('device_id', device.device_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`Error loading raw data for device ${device.device_id}:`, error);
      } else {
        rawDataMap[device.device_id] = data || [];
      }
    }

    setRawData(rawDataMap);
  };

  const toggleRawData = (deviceId: string) => {
    setShowRawData({
      ...showRawData,
      [deviceId]: !showRawData[deviceId]
    });
  };

  const handleSave = async () => {
    setSaving(true);

    for (const field of metaFields) {
      const newValue = editedValues[field.meta_name];
      if (newValue !== field.meta_value) {
        const { error } = await supabase
          .from('launched_game_meta')
          .update({ meta_value: newValue })
          .eq('id', field.id);

        if (error) {
          console.error(`Error updating ${field.meta_name}:`, error);
        }
      }
    }

    setSaving(false);
    onSave();
    onClose();
  };

  const getFieldLabel = (metaName: string): string => {
    const labels: Record<string, string> = {
      pattern: 'Pattern',
      duration: 'Duration (minutes)',
      messageDisplayDuration: 'Message Display Duration (seconds)',
      enigmaImageDisplayDuration: 'Enigma Image Display Duration (seconds)',
      colorblindMode: 'Colorblind Mode',
      autoResetTeam: 'Auto Reset Team',
      delayBeforeReset: 'Delay Before Reset (seconds)',
    };
    return labels[metaName] || metaName;
  };

  const getFieldType = (metaName: string): 'text' | 'number' | 'checkbox' => {
    if (metaName === 'colorblindMode' || metaName === 'autoResetTeam') {
      return 'checkbox';
    }
    if (metaName === 'duration' || metaName === 'messageDisplayDuration' ||
        metaName === 'enigmaImageDisplayDuration' || metaName === 'delayBeforeReset') {
      return 'number';
    }
    return 'text';
  };

  const handleValueChange = (metaName: string, value: string | boolean) => {
    const stringValue = typeof value === 'boolean' ? value.toString() : value;
    setEditedValues({
      ...editedValues,
      [metaName]: stringValue
    });
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

  const runTest = async () => {
    if (totalTestPercent !== 100) {
      setTestPercentError('Percentages must add up to exactly 100%');
      return;
    }

    setTestRunning(true);
    setTestResults([]);
    setTestLog([]);
    appendLog('Starting game test simulation...');

    try {
      const patternField = metaFields.find(f => f.meta_name === 'pattern');
      const patternName = patternField?.meta_value || 'ado_adultes';
      appendLog(`Loading pattern: ${patternName}`);

      const patternEnigmas = await loadPatternEnigmas('mystery', patternName);
      if (patternEnigmas.length === 0) {
        appendLog('Warning: No pattern enigmas loaded. Pattern file may not be available in this environment.');
      } else {
        appendLog(`Loaded ${patternEnigmas.length} enigmas from pattern`);
      }

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
        appendLog('No teams found for this game. Please create teams first.');
        setTestRunning(false);
        return;
      }

      const teamsToTest = teams.slice(0, testConfig.numberOfTeams);
      appendLog(`Running test for ${teamsToTest.length} team(s)`);

      const results: TestResult[] = [];

      for (const team of teamsToTest) {
        appendLog(`Processing team: ${team.team_name}`);

        if (team.start_time && team.end_time) {
          appendLog(`  Team ${team.team_name} already finished — resetting...`);
          await supabase
            .from('teams')
            .update({ start_time: null, end_time: null, score: 0 })
            .eq('id', team.id);
        }

        const startTime = Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 1200 + 300);
        const { error: startErr } = await supabase
          .from('teams')
          .update({ start_time: startTime })
          .eq('id', team.id);

        if (startErr) {
          appendLog(`  Error setting start time: ${startErr.message}`);
          results.push({ teamName: team.team_name, score: 0, status: 'error', message: startErr.message });
          continue;
        }

        appendLog(`  Start time set`);

        const mockCard = buildMockCard(
          team.key_id,
          patternEnigmas,
          testConfig.goodAnswerPercent,
          testConfig.badAnswerPercent
        );

        await supabase.from('launched_game_raw_data').insert({
          launched_game_id: gameId,
          device_id: 'game_test_simulator',
          raw_data: mockCard,
        });

        const { data: launchedGame } = await supabase
          .from('launched_games')
          .select('scenario_uniqid')
          .eq('id', gameId)
          .maybeSingle();

        let totalScore = 0;

        if (launchedGame?.scenario_uniqid && patternEnigmas.length > 0) {
          const { data: scenarioData } = await supabase
            .from('scenarios')
            .select('game_data_json')
            .eq('uniqid', launchedGame.scenario_uniqid)
            .maybeSingle();

          const enigmas = scenarioData?.game_data_json?.game_enigmas ||
            scenarioData?.game_data_json?.game_data?.game_enigmas || [];

          const cardPunchCodes = mockCard.punches.map((p: any) => p.code.toString());

          for (const enigma of patternEnigmas) {
            const gameEnigma = enigmas.find((ge: any) => ge.number === enigma.enigma_id);
            const goodPoints = parseInt(gameEnigma?.good_answer_points || '0');
            const wrongPoints = parseInt(gameEnigma?.wrong_answer_points || '0');

            const hasGood = enigma.good_answers.some((a: string) => cardPunchCodes.includes(a));
            const hasBad = enigma.wrong_answers.some((a: string) => cardPunchCodes.includes(a));

            if (hasGood && !hasBad) {
              totalScore += goodPoints;
            } else if (hasBad && !hasGood) {
              totalScore -= wrongPoints;
            }
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
          appendLog(`  Error setting end time: ${endErr.message}`);
          results.push({ teamName: team.team_name, score: 0, status: 'error', message: endErr.message });
        } else {
          const duration = endTime - startTime;
          const mins = Math.floor(duration / 60);
          const secs = duration % 60;
          appendLog(`  Done — Score: ${totalScore}, Time: ${mins}:${secs.toString().padStart(2, '0')}`);
          results.push({
            teamName: team.team_name,
            score: totalScore,
            status: 'success',
            message: `Score: ${totalScore} — Time: ${mins}:${secs.toString().padStart(2, '0')}`,
          });
        }

        await new Promise(r => setTimeout(r, 200));
      }

      setTestResults(results);
      appendLog('Test simulation complete.');
    } catch (err: any) {
      appendLog(`Unexpected error: ${err?.message || String(err)}`);
    } finally {
      setTestRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 border-2 border-slate-700 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings size={24} className="text-blue-500" />
            Game Configuration
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition"
            title="Close"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-4 pb-4 border-b border-slate-700">
          <p className="text-slate-400 text-sm">Game: <span className="text-white font-semibold">{gameName}</span></p>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-400">Loading configuration...</div>
        ) : (
          <div className="space-y-4">
            {metaFields.map((field) => {
              const fieldType = getFieldType(field.meta_name);
              const value = editedValues[field.meta_name] || '';

              return (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {getFieldLabel(field.meta_name)}
                  </label>
                  {fieldType === 'checkbox' ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value === 'true'}
                        onChange={(e) => handleValueChange(field.meta_name, e.target.checked)}
                        className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-slate-400 text-sm">Enable</span>
                    </label>
                  ) : (
                    <input
                      type={fieldType}
                      value={value}
                      onChange={(e) => handleValueChange(field.meta_name, e.target.value)}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {devices.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-700">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Monitor size={20} className="text-green-500" />
              Connected Devices
            </h4>
            <div className="space-y-4">
              {devices.map((device) => (
                <div key={device.id} className="bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${device.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-white font-medium">{device.device_id}</span>
                    </div>
                    {rawData[device.device_id] && rawData[device.device_id].length > 0 && (
                      <button
                        onClick={() => toggleRawData(device.device_id)}
                        className="flex items-center gap-2 px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-sm transition"
                      >
                        {showRawData[device.device_id] ? <EyeOff size={16} /> : <Eye size={16} />}
                        {showRawData[device.device_id] ? 'Hide' : 'Show'} Raw Data ({rawData[device.device_id].length})
                      </button>
                    )}
                  </div>
                  <p className="text-slate-400 text-xs">
                    Last connection: {new Date(device.last_connexion_attempt).toLocaleString()}
                  </p>

                  {showRawData[device.device_id] && rawData[device.device_id] && (
                    <div className="mt-4 space-y-3">
                      <h5 className="text-sm font-semibold text-slate-300">Card Punch Data:</h5>
                      {rawData[device.device_id].map((data) => (
                        <div key={data.id} className="bg-slate-800/70 rounded p-3">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs text-slate-400">
                              {new Date(data.created_at).toLocaleString()}
                            </span>
                          </div>
                          <pre className="text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(data.raw_data, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-700">
          <h4 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
            <FlaskConical size={20} className="text-amber-400" />
            Run Game Test
          </h4>
          <p className="text-slate-400 text-xs mb-5">
            Simulate teams playing by injecting mock card punches into the game. This will reset and overwrite team progress for the selected number of teams.
          </p>

          <div className="bg-slate-700/40 rounded-lg p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Number of Teams to Test
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={testConfig.numberOfTeams}
                onChange={(e) => handleTestConfigChange('numberOfTeams', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Good Answers %
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={testConfig.goodAnswerPercent}
                    onChange={(e) => handleTestConfigChange('goodAnswerPercent', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">%</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Bad Answers %
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={testConfig.badAnswerPercent}
                    onChange={(e) => handleTestConfigChange('badAnswerPercent', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">%</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  No Answer %
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={testConfig.noAnswerPercent}
                    onChange={(e) => handleTestConfigChange('noAnswerPercent', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">%</span>
                </div>
              </div>
            </div>

            <div className={`flex items-center justify-between text-sm px-3 py-2 rounded-md ${totalTestPercent === 100 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
              <span>Total: {totalTestPercent}%</span>
              {totalTestPercent === 100 ? (
                <span className="font-medium">Ready</span>
              ) : (
                <span className="font-medium">Must equal 100%</span>
              )}
            </div>

            {testPercentError && (
              <p className="text-red-400 text-sm">{testPercentError}</p>
            )}

            <button
              onClick={runTest}
              disabled={testRunning || totalTestPercent !== 100}
              className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition"
            >
              {testRunning ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Running Test...
                </>
              ) : (
                <>
                  <Play size={18} />
                  Run Test
                </>
              )}
            </button>
          </div>

          {testLog.length > 0 && (
            <div className="mt-4">
              <h5 className="text-sm font-semibold text-slate-300 mb-2">Test Log</h5>
              <div className="bg-slate-900 rounded-lg p-3 max-h-40 overflow-y-auto font-mono text-xs text-slate-400 space-y-1">
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
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg ${result.status === 'success' ? 'bg-green-900/20 border border-green-800/50' : 'bg-red-900/20 border border-red-800/50'}`}
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

        <div className="flex gap-3 mt-6 pt-6 border-t border-slate-700">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white rounded-lg font-medium transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
