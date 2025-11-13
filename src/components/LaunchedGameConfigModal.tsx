import { useState, useEffect } from 'react';
import { Settings, Save, X } from 'lucide-react';
import { supabase } from '../lib/db';

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

export function LaunchedGameConfigModal({ gameId, gameName, onClose, onSave }: LaunchedGameConfigModalProps) {
  const [metaFields, setMetaFields] = useState<MetaField[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMetaFields();
  }, [gameId]);

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
