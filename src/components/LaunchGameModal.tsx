import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { getPatternFolders, getGamePublic } from '../utils/patterns';
import { usbReaderService, USBPort } from '../services/usbReader';
import { supabase } from '../lib/db';
import type { SiPuce } from '../types/database';

interface LaunchGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameTitle: string;
  gameUniqid: string;
  gameTypeName: string;
  onLaunch: (config: GameConfig) => void;
}

export interface GameConfig {
  name: string;
  numberOfTeams: number;
  firstChipIndex: number;
  pattern: string;
  duration: number;
  messageDisplayDuration: number;
  enigmaImageDisplayDuration: number;
  colorblindMode: boolean;
  autoResetTeam: boolean;
  delayBeforeReset: number;
  usbPort?: string;
  teams?: Team[];
}

export interface Team {
  chipId: number;
  chipNumber: number;
  name: string;
}

export function LaunchGameModal({ isOpen, onClose, gameTitle, gameUniqid, gameTypeName, onLaunch }: LaunchGameModalProps) {
  const getDefaultName = () => {
    const now = new Date();
    const date = now.toLocaleDateString('fr-FR');
    const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${gameTitle} ${date} ${time}`;
  };

  const [config, setConfig] = useState<GameConfig>({
    name: '',
    numberOfTeams: 1,
    firstChipIndex: 1,
    pattern: '',
    duration: 60,
    messageDisplayDuration: 5,
    enigmaImageDisplayDuration: 1,
    colorblindMode: false,
    autoResetTeam: false,
    delayBeforeReset: 10,
    usbPort: '',
  });
  const [patternFolders, setPatternFolders] = useState<string[]>([]);
  const [defaultPattern, setDefaultPattern] = useState<string>('');
  const [usbPorts, setUsbPorts] = useState<USBPort[]>([]);
  const [savedUsbPort, setSavedUsbPort] = useState<string>('');
  const [step, setStep] = useState<1 | 2>(1);
  const [teams, setTeams] = useState<Team[]>([]);
  const [availableChips, setAvailableChips] = useState<SiPuce[]>([]);
  const [usedChipIds, setUsedChipIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      if (!gameTypeName || !gameUniqid) return;

      const folders = await getPatternFolders(gameTypeName);
      setPatternFolders(folders);
      console.log(folders);

      const gamePublic = await getGamePublic(gameUniqid);
      console.log('game_public for game:', gameUniqid, '=', gamePublic);
      const pattern = gamePublic || folders[0] || '';
      setDefaultPattern(pattern);

      if (usbReaderService.isElectron()) {
        try {
          const ports = await usbReaderService.getAvailablePorts();
          setUsbPorts(ports);
        } catch (error) {
          console.error('Error loading USB ports:', error);
        }
      }
    };
    loadData();
  }, [gameTypeName, gameUniqid]);

  useEffect(() => {
    const loadSavedPort = async () => {
      try {
        const { loadConfig } = await import('../utils/config');
        const config = await loadConfig();
        setSavedUsbPort(config.usbPort);
      } catch (error) {
        console.error('Error loading saved USB port:', error);
      }
    };

    if (isOpen && usbReaderService.isElectron()) {
      loadSavedPort();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setConfig({
        name: '',
        numberOfTeams: 10,
        firstChipIndex: 1,
        pattern: defaultPattern,
        duration: 60,
        messageDisplayDuration: 5,
        enigmaImageDisplayDuration: 1,
        colorblindMode: false,
        autoResetTeam: false,
        delayBeforeReset: 10,
        usbPort: savedUsbPort,
      });
      setStep(1);
      setTeams([]);
    }
  }, [isOpen, defaultPattern, savedUsbPort]);

  useEffect(() => {
    const loadChips = async () => {
      const { data, error } = await supabase
        .from('si_puces')
        .select('*')
        .order('key_number', { ascending: true });

      if (error) {
        console.error('Error loading chips:', error);
        return;
      }

      setAvailableChips(data || []);
    };

    const loadUsedChips = async () => {
      const { data, error } = await supabase
        .from('launched_games')
        .select('id')
        .eq('ended', false);

      if (error) {
        console.error('Error loading launched games:', error);
        return;
      }

      const launchedGameIds = data?.map(g => g.id) || [];

      if (launchedGameIds.length > 0) {
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('key_id')
          .in('launched_game_id', launchedGameIds);

        if (teamsError) {
          console.error('Error loading teams:', teamsError);
          return;
        }

        const usedIds = new Set(teamsData?.map(t => t.key_id) || []);
        setUsedChipIds(usedIds);
      } else {
        setUsedChipIds(new Set());
      }
    };

    if (isOpen) {
      loadChips();
      loadUsedChips();
    }
  }, [isOpen]);

  const handleNextStep = () => {
    const startIndex = config.firstChipIndex;
    const numberOfTeams = config.numberOfTeams;

    const chipsForTeams = availableChips
      .filter(chip => chip.key_number >= startIndex && chip.key_number < startIndex + numberOfTeams)
      .slice(0, numberOfTeams);

    const newTeams: Team[] = chipsForTeams.map(chip => ({
      chipId: chip.id,
      chipNumber: chip.key_number,
      name: chip.key_name,
    }));

    setTeams(newTeams);
    setStep(2);
  };

  const updateTeamName = (index: number, newName: string) => {
    setTeams(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], name: newName };
      return updated;
    });
  };

  const updateTeamChip = (index: number, chipId: number) => {
    const chip = availableChips.find(c => c.id === chipId);
    if (!chip) return;

    setTeams(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        chipId: chip.id,
        chipNumber: chip.key_number,
        name: chip.key_name
      };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step === 1) {
      handleNextStep();
      return;
    }

    if (usbReaderService.isElectron() && !config.usbPort) {
      alert('Please select a USB port to launch the game in Electron mode.');
      return;
    }

    const finalConfig = {
      ...config,
      name: config.name.trim() || getDefaultName(),
      teams,
    };

    onLaunch(finalConfig);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full h-full max-w-4xl max-h-screen overflow-auto bg-slate-900 shadow-2xl md:rounded-xl md:m-8 md:h-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-slate-800 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white">Launch Game Configuration</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {step === 1 && (
          <>
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-slate-300">
              Game Name
            </label>
            <input
              type="text"
              id="name"
              value={config.name}
              onChange={(e) => setConfig({ ...config, name: e.target.value })}
              placeholder={getDefaultName()}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500">Leave empty to use default: {getDefaultName()}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="numberOfTeams" className="block text-sm font-medium text-slate-300">
                Number of Teams
              </label>
              <input
                type="number"
                id="numberOfTeams"
                min="1"
                value={config.numberOfTeams}
                onChange={(e) => setConfig({ ...config, numberOfTeams: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="firstChipIndex" className="block text-sm font-medium text-slate-300">
                Index of First Chip
              </label>
              <input
                type="number"
                id="firstChipIndex"
                min="0"
                value={config.firstChipIndex}
                onChange={(e) => setConfig({ ...config, firstChipIndex: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="pattern" className="block text-sm font-medium text-slate-300">
                Pattern
              </label>
              <select
                id="pattern"
                value={config.pattern}
                onChange={(e) => setConfig({ ...config, pattern: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >

                {
                  patternFolders.length === 0 ? (
                  <option value="">Loading patterns...</option>
                ) : (
                  patternFolders.map((folder) => (
                    <option
                      key={folder}
                      value={folder}
                      selected={folder === defaultPattern}
                    >
                      {folder}
                    </option>
                  ))
                )}
              </select>
            </div>

            {usbReaderService.isElectron() && (
              <div className="space-y-2">
                <label htmlFor="usbPort" className="block text-sm font-medium text-slate-300">
                  USB Port {savedUsbPort && <span className="text-green-400 text-xs">(Saved)</span>}
                </label>
                <select
                  id="usbPort"
                  value={config.usbPort}
                  onChange={(e) => setConfig({ ...config, usbPort: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No USB Port (Testing Mode)</option>
                  {usbPorts.map((port) => (
                    <option key={port.path} value={port.path}>
                      {port.path} {port.manufacturer ? `- ${port.manufacturer}` : ''}
                      {savedUsbPort === port.path ? ' (Saved)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="duration" className="block text-sm font-medium text-slate-300">
                Duration (minutes)
              </label>
              <input
                type="number"
                id="duration"
                min="1"
                value={config.duration}
                onChange={(e) => setConfig({ ...config, duration: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="messageDisplayDuration" className="block text-sm font-medium text-slate-300">
                Message Display Duration (seconds)
              </label>
              <input
                type="number"
                id="messageDisplayDuration"
                min="1"
                value={config.messageDisplayDuration}
                onChange={(e) => setConfig({ ...config, messageDisplayDuration: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="enigmaImageDisplayDuration" className="block text-sm font-medium text-slate-300">
                Enigma Image Display Duration (seconds)
              </label>
              <input
                type="number"
                id="enigmaImageDisplayDuration"
                min="1"
                value={config.enigmaImageDisplayDuration}
                onChange={(e) => setConfig({ ...config, enigmaImageDisplayDuration: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="space-y-4 p-4 bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="colorblindMode"
                checked={config.colorblindMode}
                onChange={(e) => setConfig({ ...config, colorblindMode: e.target.checked })}
                className="w-5 h-5 bg-slate-700 border-slate-600 rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="colorblindMode" className="text-sm font-medium text-slate-300">
                Colorblind Mode
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="autoResetTeam"
                checked={config.autoResetTeam}
                onChange={(e) => setConfig({ ...config, autoResetTeam: e.target.checked })}
                className="w-5 h-5 bg-slate-700 border-slate-600 rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="autoResetTeam" className="text-sm font-medium text-slate-300">
                Auto-reset Team
              </label>
            </div>

            {config.autoResetTeam && (
              <div className="ml-8 space-y-2">
                <label htmlFor="delayBeforeReset" className="block text-sm font-medium text-slate-300">
                  Delay Before Reset (seconds)
                </label>
                <input
                  type="number"
                  id="delayBeforeReset"
                  min="0"
                  value={config.delayBeforeReset}
                  onChange={(e) => setConfig({ ...config, delayBeforeReset: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition font-medium flex items-center gap-2"
            >
              Next
              <ChevronRight size={20} />
            </button>
          </div>
          </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-white border-b border-slate-700 pb-2">Configure Teams</h3>
                <div className="space-y-3">
                  {teams.map((team, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                      </div>
                      <div className="flex-shrink-0 min-w-[200px]">
                        <select
                          value={team.chipId}
                          onChange={(e) => updateTeamChip(index, parseInt(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        >
                          {availableChips.map(chip => {
                            const isUsedInCurrentGame = teams.some((t, i) => i !== index && t.chipId === chip.id);
                            const isUsedInOtherGame = usedChipIds.has(chip.id);
                            const isDisabled = isUsedInCurrentGame || isUsedInOtherGame;

                            return (
                              <option key={chip.id} value={chip.id} disabled={isDisabled}>
                                Chip #{chip.key_number} - {chip.key_name}{isDisabled ? ' (In use)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={team.name}
                          onChange={(e) => updateTeamName(index, e.target.value)}
                          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Team name"
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition font-medium flex items-center gap-2"
                >
                  <ChevronLeft size={20} />
                  Back
                </button>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition font-medium"
                  >
                    Launch Game
                  </button>
                </div>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
