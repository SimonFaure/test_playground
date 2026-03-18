import { useState, useEffect } from 'react';
import { Upload, Check, AlertCircle, Loader2, Download } from 'lucide-react';
import { supabase } from '../lib/db';

interface Layout {
  id: number;
  game_type: string;
  version: string;
  name: string;
  config: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function LayoutManagement() {
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const isElectron = typeof window !== 'undefined' && (window as any).electron?.isElectron;

  useEffect(() => {
    loadLayouts();
  }, []);

  const loadLayouts = async () => {
    try {
      const { data, error } = await supabase
        .from('layouts')
        .select('*')
        .order('game_type', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLayouts(data || []);
    } catch (error) {
      console.error('Error loading layouts:', error);
      showMessage('error', 'Failed to load layouts');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const uploadLayoutFromElectron = async (gameType: string) => {
    if (!isElectron) {
      showMessage('error', 'Layout upload is only available in Electron mode');
      return;
    }

    setUploading(true);
    try {
      const result = await (window as any).electron.layouts.readFile(gameType);

      if (!result.success) {
        showMessage('error', `No layout found for ${gameType}`);
        return;
      }

      const layoutData = JSON.parse(result.content);
      const version = result.version || '1.0';

      const { error } = await supabase
        .from('layouts')
        .upsert({
          game_type: gameType,
          version: version,
          name: `${gameType.charAt(0).toUpperCase() + gameType.slice(1)} Layout v${version}`,
          config: layoutData,
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'game_type,version'
        });

      if (error) throw error;

      await supabase
        .from('layouts')
        .update({ is_active: false })
        .eq('game_type', gameType)
        .neq('version', version);

      showMessage('success', `Layout uploaded successfully for ${gameType}`);
      loadLayouts();
    } catch (error) {
      console.error('Error uploading layout:', error);
      showMessage('error', 'Failed to upload layout');
    } finally {
      setUploading(false);
    }
  };

  const setActiveLayout = async (id: number, gameType: string) => {
    try {
      await supabase
        .from('layouts')
        .update({ is_active: false })
        .eq('game_type', gameType);

      const { error } = await supabase
        .from('layouts')
        .update({ is_active: true })
        .eq('id', id);

      if (error) throw error;

      showMessage('success', 'Active layout updated');
      loadLayouts();
    } catch (error) {
      console.error('Error setting active layout:', error);
      showMessage('error', 'Failed to update active layout');
    }
  };

  const deleteLayout = async (id: number) => {
    if (!confirm('Are you sure you want to delete this layout?')) return;

    try {
      const { error } = await supabase
        .from('layouts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showMessage('success', 'Layout deleted');
      loadLayouts();
    } catch (error) {
      console.error('Error deleting layout:', error);
      showMessage('error', 'Failed to delete layout');
    }
  };

  const uploadLayoutFromFile = async (gameType: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const fileName = file.name.toLowerCase();
      const expectedPrefix = `${gameType}_layout`;

      if (!fileName.startsWith(expectedPrefix) && !fileName.startsWith(`${gameType}_`)) {
        showMessage('error', `Please select a ${gameType} layout file (should start with "${expectedPrefix}" or "${gameType}_")`);
        return;
      }

      setUploading(true);
      try {
        const text = await file.text();
        const layoutData = JSON.parse(text);

        const version = layoutData.version || '1.0';

        const { error } = await supabase
          .from('layouts')
          .upsert({
            game_type: gameType,
            version: version,
            name: `${gameType.charAt(0).toUpperCase() + gameType.slice(1)} Layout v${version}`,
            config: layoutData,
            is_active: true,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'game_type,version'
          });

        if (error) throw error;

        await supabase
          .from('layouts')
          .update({ is_active: false })
          .eq('game_type', gameType)
          .neq('version', version);

        showMessage('success', `Layout uploaded successfully for ${gameType}`);
        loadLayouts();
      } catch (error) {
        console.error('Error uploading layout:', error);
        showMessage('error', 'Failed to upload layout. Make sure the file is valid JSON.');
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const downloadLayout = async (layout: Layout) => {
    if (!isElectron) {
      const blob = new Blob([JSON.stringify(layout.config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${layout.game_type}_layout_${layout.version}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      try {
        await (window as any).electron.layouts.saveFile(
          layout.game_type,
          layout.version,
          JSON.stringify(layout.config, null, 2)
        );
        showMessage('success', 'Layout saved to local folder');
      } catch (error) {
        showMessage('error', 'Failed to save layout locally');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
      </div>
    );
  }

  const groupedLayouts = layouts.reduce((acc, layout) => {
    if (!acc[layout.game_type]) {
      acc[layout.game_type] = [];
    }
    acc[layout.game_type].push(layout);
    return acc;
  }, {} as Record<string, Layout[]>);

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {message.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="bg-slate-700/30 rounded-lg p-6 border border-slate-600">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">
          {isElectron ? 'Upload Layouts from Local' : 'Upload Layout Files'}
        </h3>
        <div className="flex flex-wrap gap-3">
          {isElectron ? (
            <>
              <button
                onClick={() => uploadLayoutFromElectron('tagquest')}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Upload TagQuest Layout
              </button>
              <button
                onClick={() => uploadLayoutFromElectron('mystery')}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Upload Mystery Layout
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => uploadLayoutFromFile('tagquest')}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Upload TagQuest Layout
              </button>
              <button
                onClick={() => uploadLayoutFromFile('mystery')}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Upload Mystery Layout
              </button>
            </>
          )}
        </div>
        <p className="text-sm text-slate-400 mt-3">
          {isElectron
            ? 'Upload layouts from your local layouts folder'
            : 'Select a layout JSON file to upload'}
        </p>
        <div className="mt-4 p-3 bg-slate-800/50 rounded border border-slate-600">
          <p className="text-sm text-slate-300 font-medium mb-2">Layout Format:</p>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>• Element positions use percentages (0-100) relative to background image</li>
            <li>• Element IDs map to game media image IDs for automatic image loading</li>
            <li>• Background image scales to fit viewport while maintaining aspect ratio</li>
          </ul>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedLayouts).map(([gameType, gameLayouts]) => (
          <div key={gameType} className="bg-slate-700/30 rounded-lg border border-slate-600">
            <div className="px-6 py-4 border-b border-slate-600">
              <h3 className="text-lg font-semibold text-slate-200 capitalize">
                {gameType} Layouts
              </h3>
            </div>
            <div className="divide-y divide-slate-600">
              {gameLayouts.map((layout) => (
                <div key={layout.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium text-slate-200">{layout.name}</h4>
                      {layout.is_active && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                      Version {layout.version} • Updated {new Date(layout.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!layout.is_active && (
                      <button
                        onClick={() => setActiveLayout(layout.id, layout.game_type)}
                        className="px-3 py-1.5 text-sm text-blue-400 hover:bg-blue-500/20 rounded-lg border border-blue-500/30"
                      >
                        Set Active
                      </button>
                    )}
                    <button
                      onClick={() => downloadLayout(layout)}
                      className="p-2 text-slate-400 hover:bg-slate-600 rounded-lg"
                      title="Download layout"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteLayout(layout.id)}
                      className="px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/20 rounded-lg border border-red-500/30"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {Object.keys(groupedLayouts).length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p className="text-lg mb-2">No layouts uploaded yet</p>
            <p className="text-sm">Use the upload buttons above to add layouts</p>
          </div>
        )}
      </div>
    </div>
  );
}
