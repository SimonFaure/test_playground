import { useState, useEffect } from 'react';
import { AlertCircle, Loader2, FileJson } from 'lucide-react';
import { supabase } from '../lib/db';

interface LayoutFile {
  name: string;
  gameType: string;
  path: string;
  updatedAt: string | null;
}

export function LayoutManagement() {
  const [layouts, setLayouts] = useState<LayoutFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLayouts();
  }, []);

  const loadLayouts = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: folders, error: foldersError } = await supabase.storage
        .from('resources')
        .list('layouts', { limit: 100 });

      if (foldersError) throw foldersError;

      const allLayouts: LayoutFile[] = [];

      for (const folder of folders || []) {
        if (folder.id === null) {
          const { data: files, error: filesError } = await supabase.storage
            .from('resources')
            .list(`layouts/${folder.name}`, { limit: 100 });

          if (filesError) continue;

          for (const file of files || []) {
            if (file.name.endsWith('.json')) {
              allLayouts.push({
                name: file.name,
                gameType: folder.name,
                path: `layouts/${folder.name}/${file.name}`,
                updatedAt: file.updated_at || null
              });
            }
          }
        }
      }

      setLayouts(allLayouts);
    } catch (err) {
      console.error('Error loading layouts:', err);
      setError('Failed to load layouts');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg flex items-center gap-2 bg-red-500/20 text-red-400 border border-red-500/30">
        <AlertCircle className="w-5 h-5" />
        <span>{error}</span>
      </div>
    );
  }

  const grouped = layouts.reduce((acc, layout) => {
    if (!acc[layout.gameType]) acc[layout.gameType] = [];
    acc[layout.gameType].push(layout);
    return acc;
  }, {} as Record<string, LayoutFile[]>);

  return (
    <div className="space-y-6">
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="text-lg mb-2">No layouts found</p>
          <p className="text-sm">Upload a layout file using the upload field above</p>
        </div>
      ) : (
        Object.entries(grouped).map(([gameType, files]) => (
          <div key={gameType} className="bg-slate-700/30 rounded-lg border border-slate-600">
            <div className="px-6 py-4 border-b border-slate-600">
              <h3 className="text-lg font-semibold text-slate-200 capitalize">{gameType} Layouts</h3>
            </div>
            <div className="divide-y divide-slate-600">
              {files.map((file) => (
                <div key={file.path} className="px-6 py-4 flex items-center gap-3">
                  <FileJson className="w-5 h-5 text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-200 truncate">{file.name}</p>
                    {file.updatedAt && (
                      <p className="text-sm text-slate-400">
                        Updated {new Date(file.updatedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
