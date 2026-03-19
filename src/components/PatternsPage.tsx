import { useState, useEffect } from 'react';
import { Map, ChevronRight, ArrowLeft, CheckCircle, XCircle, Loader, FolderOpen } from 'lucide-react';
import { getPatternFolders } from '../utils/patterns';

interface PatternMeta {
  id: string;
  game_type: string;
  name: string;
  pattern_uniqid: string;
  public: string;
}

interface PatternEnigmaRow {
  id: string;
  pattern_id: string;
  enigma_id: string;
  good_answers: string[];
  wrong_answers: string[];
}

interface PatternFolder {
  folder: string;
  meta: PatternMeta | null;
}

const GAME_TYPES = ['mystery'];

function parseCSVRaw(csvContent: string): any[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const result: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
    const obj: any = {};
    headers.forEach((header, index) => {
      let value = values[index]?.trim() || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      obj[header] = value;
    });
    result.push(obj);
  }
  return result;
}

async function readPatternFile(gameType: string, folder: string, filename: string): Promise<string | null> {
  if ((window as any).electron?.patterns?.readFile) {
    try {
      return await (window as any).electron.patterns.readFile(gameType, folder, filename);
    } catch {
      return null;
    }
  }
  try {
    const res = await fetch(`/data/patterns/${gameType}/${folder}/${filename}`);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function parseAnswers(raw: string): string[] {
  try {
    return JSON.parse(raw.replace(/""/g, '"'));
  } catch {
    return [];
  }
}

export function PatternsPage() {
  const [gameType] = useState('mystery');
  const [patterns, setPatterns] = useState<PatternFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPattern, setSelectedPattern] = useState<PatternFolder | null>(null);
  const [enigmas, setEnigmas] = useState<PatternEnigmaRow[]>([]);
  const [loadingEnigmas, setLoadingEnigmas] = useState(false);

  useEffect(() => {
    loadPatterns();
  }, [gameType]);

  const loadPatterns = async () => {
    setLoading(true);
    setSelectedPattern(null);
    setEnigmas([]);
    try {
      const folders = await getPatternFolders(gameType);
      const patternList: PatternFolder[] = [];
      for (const folder of folders) {
        const csv = await readPatternFile(gameType, folder, 'pattern.csv');
        let meta: PatternMeta | null = null;
        if (csv) {
          const rows = parseCSVRaw(csv);
          if (rows.length > 0) meta = rows[0] as PatternMeta;
        }
        patternList.push({ folder, meta });
      }
      setPatterns(patternList);
    } catch (err) {
      console.error('Error loading patterns:', err);
    }
    setLoading(false);
  };

  const handleSelectPattern = async (pattern: PatternFolder) => {
    setSelectedPattern(pattern);
    setEnigmas([]);
    setLoadingEnigmas(true);
    try {
      const csv = await readPatternFile(gameType, pattern.folder, 'patterns_survival_balises.csv');
      if (csv) {
        const rows = parseCSVRaw(csv);
        const parsed: PatternEnigmaRow[] = rows.map(row => ({
          id: row.id,
          pattern_id: row.pattern_id,
          enigma_id: row.enigma_id,
          good_answers: parseAnswers(row.good_answers || '[]'),
          wrong_answers: parseAnswers(row.wrong_answers || '[]'),
        }));
        setEnigmas(parsed);
      }
    } catch (err) {
      console.error('Error loading enigmas:', err);
    }
    setLoadingEnigmas(false);
  };

  const displayName = (p: PatternFolder) =>
    p.meta?.name || p.folder.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Map size={28} className="text-emerald-400" />
        <div>
          <h2 className="text-3xl font-bold text-white">Patterns</h2>
          <p className="text-slate-400 text-sm mt-0.5">Browse game patterns and their enigma answer tables</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-slate-400 py-12">
          <Loader size={20} className="animate-spin" />
          <span>Loading patterns...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FolderOpen size={14} />
              {gameType} — {patterns.length} pattern{patterns.length !== 1 ? 's' : ''}
            </h3>

            {patterns.length === 0 && (
              <div className="text-slate-500 text-sm py-6 text-center">No patterns found.</div>
            )}

            {patterns.map(pattern => (
              <button
                key={pattern.folder}
                onClick={() => handleSelectPattern(pattern)}
                className={`w-full text-left p-4 rounded-xl border-2 transition group ${
                  selectedPattern?.folder === pattern.folder
                    ? 'bg-emerald-900/25 border-emerald-500'
                    : 'bg-slate-800/60 border-slate-700 hover:border-slate-500 hover:bg-slate-700/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-white font-semibold truncate">{displayName(pattern)}</p>
                    <p className="text-slate-400 text-xs mt-0.5 font-mono">{pattern.folder}</p>
                    {pattern.meta && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">
                          {pattern.meta.game_type}
                        </span>
                        {pattern.meta.public && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 border border-emerald-800/50 font-medium">
                            {pattern.meta.public}
                          </span>
                        )}
                        {pattern.meta.id && (
                          <span className="text-xs text-slate-500">ID: {pattern.meta.id}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <ChevronRight
                    size={18}
                    className={`shrink-0 ml-3 transition-transform ${
                      selectedPattern?.folder === pattern.folder
                        ? 'text-emerald-400 translate-x-0.5'
                        : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  />
                </div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-2">
            {!selectedPattern ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center py-20">
                  <Map size={48} className="text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg font-medium">Select a pattern</p>
                  <p className="text-slate-500 text-sm mt-1">Click a pattern on the left to view its enigma table</p>
                </div>
              </div>
            ) : loadingEnigmas ? (
              <div className="flex items-center gap-3 text-slate-400 py-12 justify-center">
                <Loader size={20} className="animate-spin" />
                <span>Loading enigmas...</span>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-white">{displayName(selectedPattern)}</h3>
                    <p className="text-slate-400 text-sm mt-0.5">
                      {enigmas.length} enigma{enigmas.length !== 1 ? 's' : ''} in this pattern
                    </p>
                  </div>
                </div>

                {enigmas.length === 0 ? (
                  <div className="bg-slate-800/60 border-2 border-slate-700 rounded-xl p-8 text-center">
                    <p className="text-slate-400">No enigma data found for this pattern.</p>
                  </div>
                ) : (
                  <div className="bg-slate-800/60 border-2 border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700 bg-slate-800/80">
                          <th className="text-left px-4 py-3 text-slate-400 font-semibold w-12">#</th>
                          <th className="text-left px-4 py-3 text-slate-400 font-semibold w-24">Enigma</th>
                          <th className="text-left px-4 py-3 text-slate-400 font-semibold">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle size={13} className="text-green-400" />
                              Good Answers
                            </span>
                          </th>
                          <th className="text-left px-4 py-3 text-slate-400 font-semibold">
                            <span className="flex items-center gap-1.5">
                              <XCircle size={13} className="text-red-400" />
                              Wrong Answers
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {enigmas.map((row, index) => (
                          <tr
                            key={row.id}
                            className={`border-b border-slate-700/50 transition hover:bg-slate-700/30 ${
                              index % 2 === 0 ? 'bg-transparent' : 'bg-slate-800/30'
                            }`}
                          >
                            <td className="px-4 py-3 text-slate-500 text-xs font-mono">{row.id}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-700 text-white font-bold text-sm">
                                {row.enigma_id}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1.5">
                                {row.good_answers.length > 0 ? (
                                  row.good_answers.map((ans, i) => (
                                    <span
                                      key={i}
                                      className="inline-flex items-center px-2.5 py-1 rounded-lg bg-green-900/30 border border-green-700/50 text-green-300 font-mono font-semibold text-xs"
                                    >
                                      {ans}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-600 text-xs italic">—</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1.5">
                                {row.wrong_answers.length > 0 ? (
                                  row.wrong_answers.map((ans, i) => (
                                    <span
                                      key={i}
                                      className="inline-flex items-center px-2.5 py-1 rounded-lg bg-red-900/30 border border-red-700/50 text-red-300 font-mono font-semibold text-xs"
                                    >
                                      {ans}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-600 text-xs italic">—</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
