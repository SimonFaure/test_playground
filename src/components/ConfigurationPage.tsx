import { useEffect, useState } from 'react';
import { Settings, Usb, RefreshCw, Check } from 'lucide-react';
import { supabase } from '../lib/db';
import { usbReaderService } from '../services/usbReader';

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
  const [selectedPort, setSelectedPort] = useState<string | null>(null);
  const [savedPort, setSavedPort] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    setIsElectron(usbReaderService.isElectron());
    loadSavedPort();
    if (usbReaderService.isElectron()) {
      loadPorts();
    }
  }, []);

  const loadSavedPort = async () => {
    try {
      const { data, error } = await supabase
        .from('configuration')
        .select('value')
        .eq('key', 'usb_port')
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSavedPort(data.value);
        setSelectedPort(data.value);
      }
    } catch (error) {
      console.error('Error loading saved port:', error);
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
    if (!selectedPort) {
      setMessage({ type: 'error', text: 'Please select a USB port' });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('configuration')
        .upsert(
          { key: 'usb_port', value: selectedPort, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );

      if (error) throw error;

      setSavedPort(selectedPort);
      setMessage({ type: 'success', text: 'USB port saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving port:', error);
      setMessage({ type: 'error', text: 'Failed to save USB port' });
    } finally {
      setIsSaving(false);
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
                  onClick={() => setSelectedPort(port.path)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedPort === port.path
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 bg-slate-700/30 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono font-semibold text-lg">{port.path}</span>
                        {savedPort === port.path && (
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
                    {selectedPort === port.path && (
                      <Check className="text-blue-400 flex-shrink-0" size={24} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {ports.length > 0 && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSave}
                disabled={isSaving || !selectedPort || selectedPort === savedPort}
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
          )}
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
    </div>
  );
}
