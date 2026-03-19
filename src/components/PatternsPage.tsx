import { useState, useEffect } from 'react';
import { Map, ChevronRight, CheckCircle, XCircle, Loader, FolderOpen, Upload, Radio } from 'lucide-react';
import { getPatternFolders } from '../utils/patterns';

const DEFAULT_FOLDERS = ['ado_adultes', 'kids', 'mini_kids'];

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

interface PatternBaliseRow {
  id: string;
  pattern_id: string;
  image: number;
  position: number;
  balise_id: number;
}

interface PatternFolder {
  folder: string;
  meta: PatternMeta | null;
  source: 'static' | 'local';
}

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

function parseAnswers(raw: string): string[] {
  try {
    return JSON.parse(raw.replace(/""/g, '"'));
  } catch {
    return [];
  }
}

async function readStaticPatternFile(gameType: string, folder: string, filename: string): Promise<string | null> {
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

function readLocalPatternData(slug: string): string | null {
  const raw = localStorage.getItem(`pattern_${slug}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      if (typeof parsed.csv === 'string') return parsed.csv;
      if (typeof parsed.csvContent === 'string') return parsed.csvContent;
    }
    return null;
  } catch {
    return raw;
  }
}

function extractLocalPatternMeta(slug: string): PatternMeta | null {
  const raw = localStorage.getItem(`pattern_${slug}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      return {
        id: parsed.id || '',
        game_type: parsed.game_type || parsed.gameType || '',
        name: parsed.name || parsed.title || '',
        pattern_uniqid: parsed.pattern_uniqid || parsed.uniqid || '',
        public: parsed.public || parsed.audience || '',
      };
    }
  } catch {
  }
  return null;
}

function extractLocalEnigmas(slug: string): PatternEnigmaRow[] | null {
  const raw = localStorage.getItem(`pattern_${slug}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      const rows: any[] = parsed.enigmas || parsed.patterns_survival_balises || parsed.data || [];
      if (Array.isArray(rows) && rows.length > 0) {
        return rows.map((row: any, i: number) => ({
          id: String(row.id ?? i + 1),
          pattern_id: String(row.pattern_id ?? ''),
          enigma_id: String(row.enigma_id ?? row.enigmaId ?? ''),
          good_answers: Array.isArray(row.good_answers) ? row.good_answers.map(String)
            : parseAnswers(row.good_answers || '[]'),
          wrong_answers: Array.isArray(row.wrong_answers) ? row.wrong_answers.map(String)
            : parseAnswers(row.wrong_answers || '[]'),
        }));
      }
    }
  } catch {
  }
  const csvContent = readLocalPatternData(slug);
  if (csvContent) {
    const rows = parseCSVRaw(csvContent);
    if (rows.length > 0 && ('enigma_id' in rows[0] || 'good_answers' in rows[0])) {
      return rows.map(row => ({
        id: row.id,
        pattern_id: row.pattern_id,
        enigma_id: row.enigma_id,
        good_answers: parseAnswers(row.good_answers || '[]'),
        wrong_answers: parseAnswers(row.wrong_answers || '[]'),
      }));
    }
  }
  return null;
}

function BaliseGrid({ balises }: { balises: PatternBaliseRow[] }) {
  const images = [...new Set(balises.map(b => b.image))].sort((a, b) => a - b);
  const positions = [...new Set(balises.map(b => b.position))].sort((a, b) => a - b);

  const lookup = new Map<string, number>();
  for (const b of balises) {
    lookup.set(`${b.image}-${b.position}`, b.balise_id);
  }

  return (
    <div className="bg-slate-800/60 border-2 border-slate-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/80 flex items-center gap-2">
        <Radio size={14} className="text-cyan-400" />
        <p className="text-slate-300 text-sm font-medium">
          Station assignments — {images.length} quest image{images.length !== 1 ? 's' : ''}, {positions.length} position{positions.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/60">
              <th className="text-left px-4 py-3 text-slate-400 font-semibold whitespace-nowrap">
                Image
              </th>
              {positions.map(pos => (
                <th key={pos} className="text-center px-3 py-3 text-slate-400 font-semibold whitespace-nowrap min-w-[64px]">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-slate-500 font-normal">pos</span>
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-slate-700 text-slate-200 font-bold text-xs">
                      {pos}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {images.map((img, index) => (
              <tr
                key={img}
                className={`border-b border-slate-700/50 transition hover:bg-slate-700/20 ${
                  index % 2 === 0 ? 'bg-transparent' : 'bg-slate-800/30'
                }`}
              >
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-900/40 border border-cyan-700/50 text-cyan-300 font-bold text-sm">
                      {img}
                    </span>
                    <span className="text-slate-500 text-xs font-mono">img {img}</span>
                  </span>
                </td>
                {positions.map(pos => {
                  const baliseId = lookup.get(`${img}-${pos}`);
                  return (
                    <td key={pos} className="px-3 py-3 text-center">
                      {baliseId !== undefined ? (
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-slate-700 border border-slate-600 text-white font-mono font-bold text-sm hover:bg-slate-600 transition">
                          {baliseId}
                        </span>
                      ) : (
                        <span className="text-slate-700 text-lg select-none">·</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type DetailTab = 'enigmas' | 'balises';

export function PatternsPage() {
  const [gameType] = useState('mystery');
  const [patterns, setPatterns] = useState<PatternFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPattern, setSelectedPattern] = useState<PatternFolder | null>(null);
  const [enigmas, setEnigmas] = useState<PatternEnigmaRow[]>([]);
  const [loadingEnigmas, setLoadingEnigmas] = useState(false);
  const [balises, setBalises] = useState<PatternBaliseRow[]>([]);
  const [loadingBalises, setLoadingBalises] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('enigmas');

  useEffect(() => {
    loadPatterns();
  }, [gameType]);

  const loadPatterns = async () => {
    setLoading(true);
    setSelectedPattern(null);
    setEnigmas([]);
    try {
      const folders = await getPatternFolders(gameType);
      const uploadedList: string[] = JSON.parse(localStorage.getItem('uploaded_patterns_list') || '[]');
      const patternList: PatternFolder[] = [];
      for (const folder of folders) {
        const isLocal = !DEFAULT_FOLDERS.includes(folder) && uploadedList.includes(folder);
        let meta: PatternMeta | null = null;
        if (isLocal) {
          meta = extractLocalPatternMeta(folder);
        } else {
          const csv = await readStaticPatternFile(gameType, folder, 'pattern.csv');
          if (csv) {
            const rows = parseCSVRaw(csv);
            if (rows.length > 0) meta = rows[0] as PatternMeta;
          }
        }
        patternList.push({ folder, meta, source: isLocal ? 'local' : 'static' });
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
    setBalises([]);
    setActiveTab('enigmas');
    setLoadingEnigmas(true);
    setLoadingBalises(true);
    try {
      if (pattern.source === 'local') {
        const rows = extractLocalEnigmas(pattern.folder);
        if (rows) setEnigmas(rows);
      } else {
        const csv = await readStaticPatternFile(gameType, pattern.folder, 'patterns_survival_balises.csv');
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
      }
    } catch (err) {
      console.error('Error loading enigmas:', err);
    }
    setLoadingEnigmas(false);

    try {
      const csv = await readStaticPatternFile(gameType, pattern.folder, 'patterns_balises.csv');
      if (csv) {
        const rows = parseCSVRaw(csv);
        const parsed: PatternBaliseRow[] = rows.map(row => ({
          id: row.id,
          pattern_id: row.pattern_id,
          image: parseInt(row.image, 10),
          position: parseInt(row.position, 10),
          balise_id: parseInt(row.balise_id, 10),
        })).filter(r => !isNaN(r.image) && !isNaN(r.position) && !isNaN(r.balise_id));
        setBalises(parsed);
      }
    } catch (err) {
      console.error('Error loading balises:', err);
    }
    setLoadingBalises(false);
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
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {pattern.source === 'local' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-400 border border-blue-800/50 font-medium flex items-center gap-1">
                          <Upload size={10} />
                          uploaded
                        </span>
                      )}
                      {pattern.meta?.game_type && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">
                          {pattern.meta.game_type}
                        </span>
                      )}
                      {pattern.meta?.public && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 border border-emerald-800/50 font-medium">
                          {pattern.meta.public}
                        </span>
                      )}
                      {pattern.meta?.id && (
                        <span className="text-xs text-slate-500">ID: {pattern.meta.id}</span>
                      )}
                    </div>
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
                  <p className="text-slate-500 text-sm mt-1">Click a pattern on the left to view its details</p>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-white">{displayName(selectedPattern)}</h3>
                  </div>
                </div>

                <div className="flex gap-1 mb-5 bg-slate-800/60 border border-slate-700 rounded-xl p-1 w-fit">
                  <button
                    onClick={() => setActiveTab('enigmas')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                      activeTab === 'enigmas'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                    }`}
                  >
                    <CheckCircle size={14} />
                    Enigmas
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${
                      activeTab === 'enigmas' ? 'bg-emerald-500/40 text-emerald-100' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {enigmas.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('balises')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                      activeTab === 'balises'
                        ? 'bg-cyan-700 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                    }`}
                  >
                    <Radio size={14} />
                    Visuel balise
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${
                      activeTab === 'balises' ? 'bg-cyan-600/40 text-cyan-100' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {balises.length}
                    </span>
                  </button>
                </div>

                {activeTab === 'enigmas' && (
                  loadingEnigmas ? (
                    <div className="flex items-center gap-3 text-slate-400 py-12 justify-center">
                      <Loader size={20} className="animate-spin" />
                      <span>Loading enigmas...</span>
                    </div>
                  ) : enigmas.length === 0 ? (
                    <div className="bg-slate-800/60 border-2 border-slate-700 rounded-xl p-8 text-center">
                      <CheckCircle size={32} className="text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No enigma data found for this pattern.</p>
                    </div>
                  ) : (
                    <div className="bg-slate-800/60 border-2 border-slate-700 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/80">
                        <p className="text-slate-400 text-sm">
                          {enigmas.length} enigma{enigmas.length !== 1 ? 's' : ''} in this pattern
                        </p>
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700 bg-slate-800/60">
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
                  )
                )}

                {activeTab === 'balises' && (
                  loadingBalises ? (
                    <div className="flex items-center gap-3 text-slate-400 py-12 justify-center">
                      <Loader size={20} className="animate-spin" />
                      <span>Loading station assignments...</span>
                    </div>
                  ) : balises.length === 0 ? (
                    <div className="bg-slate-800/60 border-2 border-slate-700 rounded-xl p-8 text-center">
                      <Radio size={32} className="text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400 font-medium">No station assignment data found.</p>
                      <p className="text-slate-500 text-xs mt-1">Add a <span className="font-mono">patterns_balises.csv</span> file to this pattern folder.</p>
                    </div>
                  ) : (
                    <BaliseGrid balises={balises} />
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
