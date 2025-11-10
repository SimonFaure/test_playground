import { useState, useEffect } from 'react';
import { ShieldCheck, Check } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  email: string;
  url: string;
}

const DEFAULT_CLIENT: Client = {
  id: 'default',
  name: 'Default Server',
  email: 'default@taghunter.com',
  url: '192.168.129.250'
};

export function AdminConfigPage() {
  const [clients, setClients] = useState<Client[]>([DEFAULT_CLIENT]);
  const [selectedClientId, setSelectedClientId] = useState<string>('default');
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    const isElectron = typeof window !== 'undefined' && (window as any).electron?.isElectron;

    if (isElectron) {
      try {
        const result = await (window as any).electron.clients.load();
        if (result.success && result.clients.length > 0) {
          setClients([DEFAULT_CLIENT, ...result.clients]);
        }

        const selectedResult = await (window as any).electron.clients.loadSelected();
        if (selectedResult.success && selectedResult.client) {
          setSelectedClientId(selectedResult.client.id);
        } else {
          setSelectedClientId('default');
        }
      } catch (error) {
        console.error('Error loading clients:', error);
      }
    }
    setLoading(false);
  };

  const handleClientSelect = async (client: Client) => {
    setSelectedClientId(client.id);

    const isElectron = typeof window !== 'undefined' && (window as any).electron?.isElectron;
    if (isElectron) {
      try {
        const result = await (window as any).electron.clients.saveSelected(client);
        if (result.success) {
          setSaveMessage('Client configuration saved successfully');
          setTimeout(() => setSaveMessage(''), 3000);
        }
      } catch (error) {
        console.error('Error saving selected client:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700">
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="container mx-auto px-6 py-8">
      <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="text-red-500" size={32} />
          <h2 className="text-2xl font-bold text-white">Admin Configuration</h2>
        </div>

        {saveMessage && (
          <div className="mb-4 p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-400">
            {saveMessage}
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white mb-4">Select Client</h3>
          {clients.map((client) => (
            <label
              key={client.id}
              className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition ${
                selectedClientId === client.id
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
              }`}
            >
              <input
                type="radio"
                name="client"
                value={client.id}
                checked={selectedClientId === client.id}
                onChange={() => handleClientSelect(client)}
                className="hidden"
              />
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedClientId === client.id
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-slate-400'
                }`}>
                  {selectedClientId === client.id && <Check size={14} className="text-white" />}
                </div>
                <div className="flex-1">
                  <div className="text-white font-semibold">{client.name}</div>
                  <div className="text-slate-400 text-sm">{client.email}</div>
                  <div className="text-slate-500 text-sm mt-1">Database: {client.url}</div>
                </div>
              </div>
            </label>
          ))}
        </div>

        {selectedClientId && (
          <div className="mt-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
            <p className="text-slate-300 text-sm">
              The selected client's database URL and email will be used throughout the application.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
