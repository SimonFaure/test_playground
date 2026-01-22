import { useEffect, useState } from 'react';
import { Settings, Usb, RefreshCw, Check, Globe, Download, FolderOpen } from 'lucide-react';
import { usbReaderService } from '../services/usbReader';
import { loadConfig, saveConfig, AppConfig } from '../utils/config';
import { getUserScenarios, ScenarioSummary } from '../services/scenarioDownload';
import { ScenarioDownloadModal } from './ScenarioDownloadModal';

interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  pnpId?: string;
  locationId?: string;
  productId?: string;
  vendorId?: string;
}

export function ConfigurationPage() {
  const [ports, setPorts] = useState<SerialPortInfo[]>([]);
  const [config, setConfig] = useState<AppConfig>({ usbPort: '', language: 'english' });
  const [savedConfig, setSavedConfig] = useState<AppConfig>({ usbPort: '', language: 'english' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isElectron, setIsElectron] = useState(false);
  const [dbTables, setDbTables] = useState<string[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isCheckingScenarios, setIsCheckingScenarios] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [scenariosToDownload, setScenariosToDownload] = useState<ScenarioSummary[]>([]);

  useEffect(() => {
    setIsElectron(usbReaderService.isElectron());
    loadConfiguration();
    checkDatabaseConnection();
    if (usbReaderService.isElectron()) {
      loadPorts();
    }
  }, []);

  const loadConfiguration = async () => {
    try {
      const loadedConfig = await loadConfig();
      setConfig(loadedConfig);
      setSavedConfig(loadedConfig);
    } catch (error) {
      console.error('Error loading configuration:', error);
    }
  };

  const checkDatabaseConnection = async () => {
    setDbLoading(true);
    setDbError(null);
    try {
      const { supabase } = await import('../lib/db');

      if (!supabase) {
        setDbError('Database not configured. Environment variables missing.');
        setDbLoading(false);
        return;
      }

      const { error } = await supabase
        .from('configuration')
        .select('id', { count: 'exact', head: true });

      if (error) {
        console.error('Database connection error:', error);
        setDbError(`Failed to connect: ${error.message}`);
      } else {
        const tables = ['launched_games', 'launched_game_meta', 'teams', 'si_puces', 'game_types', 'configuration', 'launched_game_devices'];
        setDbTables(tables);
      }
    } catch (error: any) {
      console.error('Error checking database connection:', error);
      setDbError(`Connection failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setDbLoading(false);
    }
  };

  const loadPorts = async () => {
    setIsLoading(true);
    try {
      const availablePorts = await usbReaderService.getAvailablePorts();
      setPorts(availablePorts);
    } catch (error) {
      console.error('Error loading ports:', error);
      setMessage({ type: 'error', text: 'Failed to load USB ports' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveConfig(config);
      setSavedConfig(config);
      setMessage({ type: 'success', text: 'Configuration saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving configuration:', error);
      setMessage({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckScenarios = async () => {
    if (!config.email) {
      setMessage({ type: 'error', text: 'Please enter an email address first' });
      return;
    }

    setIsCheckingScenarios(true);
    try {
      const remoteScenarios = await getUserScenarios(config.email);
      const localData = await (window as any).electron.scenarios.load();
      const localUniqids = new Set(localData.scenarios.map((s: any) => s.uniqid));

      const missingScenarios = remoteScenarios.filter(
        scenario => !localUniqids.has(scenario.uniqid)
      );

      if (missingScenarios.length > 0) {
        setScenariosToDownload(missingScenarios);
        setShowDownloadModal(true);
      } else {
        setMessage({ type: 'success', text: 'All scenarios are up to date!' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error('Error checking scenarios:', error);
      setMessage({ type: 'error', text: 'Failed to check scenarios' });
    } finally {
      setIsCheckingScenarios(false);
    }
  };

  const handleOpenDataFolder = async () => {
    try {
      await (window as any).electron.system.openDataFolder();
      setMessage({ type: 'success', text: 'Data folder opened in File Explorer' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error opening data folder:', error);
      setMessage({ type: 'error', text: 'Failed to open data folder' });
    }
  };


  if (!isElectron) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-8">
        <div className="container mx-auto px-6">
          <div className="flex items-center gap-3 mb-8">
            <Settings className="text-blue-400" size={32} />
            <h1 className="text-3xl font-bold">Configuration</h1>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-8 text-center">
            <p className="text-slate-400">Configuration is only available in the Electron app.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-8">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="text-blue-400" size={32} />
          <h1 className="text-3xl font-bold">Configuration</h1>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Globe className="text-blue-400" size={24} />
              <h2 className="text-xl font-semibold">User Email & Scenarios</h2>
            </div>
            {isElectron && config.email && (
              <button
                onClick={handleCheckScenarios}
                disabled={isCheckingScenarios}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={16} className={isCheckingScenarios ? 'animate-pulse' : ''} />
                {isCheckingScenarios ? 'Checking...' : 'Download Scenarios'}
              </button>
            )}
          </div>

          {message && (
            <div
              className={`mb-4 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={config.email || ''}
              onChange={(e) => setConfig({ ...config, email: e.target.value })}
              placeholder="your.email@example.com"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-slate-400 mt-2">
              Used to sync scenarios from the Taghunter Admin system
            </p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving || JSON.stringify(config) === JSON.stringify(savedConfig)}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Globe className="text-blue-400" size={24} />
            <h2 className="text-xl font-semibold">Language</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setConfig({ ...config, language: 'english' })}
              className={`p-4 rounded-lg border-2 transition-all ${
                config.language === 'english'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700 bg-slate-700/30 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-lg">English</div>
                  <div className="text-sm text-slate-400">English language</div>
                </div>
                {config.language === 'english' && (
                  <Check className="text-blue-400" size={24} />
                )}
              </div>
            </button>

            <button
              onClick={() => setConfig({ ...config, language: 'french' })}
              className={`p-4 rounded-lg border-2 transition-all ${
                config.language === 'french'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700 bg-slate-700/30 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-lg">Français</div>
                  <div className="text-sm text-slate-400">French language</div>
                </div>
                {config.language === 'french' && (
                  <Check className="text-blue-400" size={24} />
                )}
              </div>
            </button>
          </div>
        </div>

        {isElectron && (
          <div className="bg-slate-800/50 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Usb className="text-blue-400" size={24} />
              <h2 className="text-xl font-semibold">USB Port Selection</h2>
            </div>
            <button
              onClick={loadPorts}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-slate-400">Loading USB ports...</div>
          ) : ports.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              No USB ports detected. Please connect a USB device and refresh.
            </div>
          ) : (
            <div className="space-y-3">
              {ports.map((port) => (
                <div
                  key={port.path}
                  onClick={() => setConfig({ ...config, usbPort: port.path })}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    config.usbPort === port.path
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 bg-slate-700/30 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono font-semibold text-lg">{port.path}</span>
                        {savedConfig.usbPort === port.path && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-400 space-y-1">
                        {port.manufacturer && (
                          <div>
                            <span className="text-slate-500">Manufacturer:</span> {port.manufacturer}
                          </div>
                        )}
                        {port.serialNumber && (
                          <div>
                            <span className="text-slate-500">Serial:</span> {port.serialNumber}
                          </div>
                        )}
                        {port.vendorId && port.productId && (
                          <div>
                            <span className="text-slate-500">VID/PID:</span> {port.vendorId}/{port.productId}
                          </div>
                        )}
                      </div>
                    </div>
                    {config.usbPort === port.path && (
                      <Check className="text-blue-400 flex-shrink-0" size={24} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
        )}

        {/* <div className="bg-slate-800/50 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Database className="text-blue-400" size={24} />
              <h2 className="text-xl font-semibold">Database Connection</h2>
            </div>
            <button
              onClick={checkDatabaseConnection}
              disabled={dbLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh database connection"
            >
              <RefreshCw size={16} className={dbLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {dbLoading ? (
            <div className="text-center py-8 text-slate-400">Checking database connection...</div>
          ) : dbError ? (
            <div className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg p-4">
              {dbError}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-4 text-green-400">
                <Check size={20} />
                <span className="font-semibold">Connected to Supabase</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Available Tables ({dbTables.length})</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {dbTables.map((table) => (
                    <div
                      key={table}
                      className="px-3 py-2 bg-slate-700/50 rounded border border-slate-600 text-sm font-mono text-slate-300"
                    >
                      {table}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div> */}

        <div className="bg-slate-800/50 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Data Folder</h3>
              <p className="text-sm text-slate-400">
                Open the application data folder to view scenarios, games, and configuration files.
              </p>
            </div>
            <button
              onClick={handleOpenDataFolder}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors"
            >
              <FolderOpen size={16} />
              Open Folder
            </button>
          </div>
          <div className="text-xs font-mono text-slate-500 bg-slate-900/50 p-3 rounded border border-slate-700">
            %APPDATA%\TagHunterPlayground\
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Information</h3>
          <div className="text-sm text-slate-400 space-y-2">
            <p>
              Select the USB port that connects to your Tag Hunter device. This port will be used when launching games.
            </p>
            <p>
              If you don't see your device, make sure it's connected and click the Refresh button.
            </p>
          </div>
        </div>
      </div>

      {isElectron && (
        <ScenarioDownloadModal
          isOpen={showDownloadModal}
          scenarios={scenariosToDownload}
          email={config.email || ''}
          onComplete={() => {
            setShowDownloadModal(false);
            setMessage({ type: 'success', text: 'Scenarios downloaded successfully!' });
            setTimeout(() => setMessage(null), 3000);
          }}
          onCancel={() => setShowDownloadModal(false)}
        />
      )}
    </div>
  );
}
