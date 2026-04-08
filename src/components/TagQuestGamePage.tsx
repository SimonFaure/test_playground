import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Play, Users, Trophy } from 'lucide-react';
import { GameConfig } from './LaunchGameModal';
import { usbReaderService, CardData, StationData } from '../services/usbReader';
import { CardDetectionAlert } from './CardDetectionAlert';
import { supabase } from '../lib/db';
import { useGameStatePolling } from '../hooks/useGameStatePolling';
import { processTagQuestPunch } from '../services/tagquestPunchLogic';
import { logApiCall } from '../services/apiLogger';

interface TagQuestGamePageProps {
  config: GameConfig;
  gameUniqid: string;
  launchedGameId: number | null;
  onBack: () => void;
  onGameEnd?: () => void;
}

interface GameQuest {
  name: string;
  points?: string;
  sound?: string;
  main_image?: string;
  image_1?: string;
  image_2?: string;
  image_3?: string;
  image_4?: string;
  [key: string]: string | undefined;
}

interface GameData {
  game: {
    id: string;
    uniqid: string;
    type: string;
    title: string;
  };
  quests?: GameQuest[];
}

interface TeamScore {
  id: number;
  team_name: string;
  score: number;
  start_time: number | null;
  end_time: number | null;
  key_id: number;
}

interface LayoutElement {
  id: string;
  type: 'image' | 'text' | 'container' | 'quest';
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  src?: string;
  filename?: string;
  text?: string;
  previewText?: string;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  style?: Record<string, any>;
  children?: LayoutElement[];
}

interface GameLayout {
  version: string;
  elements: LayoutElement[];
  background?: string;
  width?: number;
  height?: number;
}

export function TagQuestGamePage({ config, gameUniqid, launchedGameId, onBack, onGameEnd }: TagQuestGamePageProps) {
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [layout, setLayout] = useState<GameLayout | null>(null);
  const [layoutLoading, setLayoutLoading] = useState(true);
  const [gameStarted, setGameStarted] = useState(true);
  const [lastCardData, setLastCardData] = useState<CardData | null>(null);
  const [showCardAlert, setShowCardAlert] = useState(false);
  const [teams, setTeams] = useState<TeamScore[]>([]);
  const [gameMessage, setGameMessage] = useState('');
  const [mediaFiles, setMediaFiles] = useState<Record<string, string>>({});
  const [bgDimensions, setBgDimensions] = useState<{ width: number; height: number } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [launchedGameInfo, setLaunchedGameInfo] = useState<{ start_time: string | null; duration: number | null } | null>(null);
  const [victoryType, setVictoryType] = useState<'speed' | 'score'>(config.victoryType || 'speed');
  const [playMode, setPlayMode] = useState<'solo' | 'team'>(config.playMode || 'solo');
  const [teamsConfig, setTeamsConfig] = useState<import('./LaunchGameModal').Team[]>(config.teams || []);
  const [punchLogs, setPunchLogs] = useState<Array<{ timestamp: Date; result: any }>>([]);
  const bgImageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const loadGameData = async () => {
      try {
        const isElectron = typeof window !== 'undefined' && (window as any).electron?.isElectron;

        if (isElectron) {
          const gameDataContent = await (window as any).electron.games.readFile(gameUniqid, 'game-data.json');
          const data = JSON.parse(gameDataContent);
          setGameData({
            game: {
              id: gameUniqid,
              uniqid: gameUniqid,
              type: 'tagquest',
              title: data.title || data.game?.title || gameUniqid,
            },
            quests: data.quests || [],
          });

          const csvContent = await (window as any).electron.games.readFile(gameUniqid, 'csv/game_media_images.csv');
          if (csvContent) {
            const lines = csvContent.split('\n');
            const headers = lines[0].split(',');
            const mediaMap: Record<string, string> = {};

            for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;

              const values = line.split(',');
              const id = values[0];
              const uuid = values[3];
              const fileName = values[6];

              if (id && uuid && fileName) {
                const mediaPath = `data/games/${gameUniqid}/media/${uuid}/${fileName}`;
                mediaMap[id] = mediaPath;
                mediaMap[fileName] = mediaPath;
              }
            }

            setMediaFiles(mediaMap);
            console.log('Loaded media files:', mediaMap);
          }

          const layoutResult = await (window as any).electron.layouts.readFile('tagquest');
          if (layoutResult.success) {
            const layoutData = JSON.parse(layoutResult.content);
            setLayout(layoutData);
            console.log('Layout loaded:', layoutData);
          } else {
            console.warn('No layout found for tagquest:', layoutResult.error);
          }
        } else {
          const { data: scenarioData, error } = await supabase
            .from('scenarios')
            .select('*')
            .eq('uniqid', gameUniqid)
            .maybeSingle();

          if (error) {
            console.error('Error loading scenario:', error);
            return;
          }

          if (scenarioData) {
            let gdj = scenarioData.game_data_json;

            if (!gdj) {
              const { data: gameDataFile } = await supabase.storage
                .from('resources')
                .download(`scenarios/${gameUniqid}/game-data.json`);

              if (gameDataFile) {
                const text = await gameDataFile.text();
                gdj = JSON.parse(text);
              }
            }

            const quests = gdj?.quests || [];
            setGameData({
              game: {
                id: scenarioData.id.toString(),
                uniqid: scenarioData.uniqid,
                type: scenarioData.game_type,
                title: scenarioData.title
              },
              quests,
            });
          }

          const mediaByFilename: Record<string, string> = {};

          const { data: storageMediaFiles } = await supabase.storage
            .from('resources')
            .list(`scenarios/${gameUniqid}/media`, { limit: 1000 });

          if (storageMediaFiles) {
            for (const file of storageMediaFiles) {
              if (file.name) {
                const { data: urlData } = supabase.storage
                  .from('resources')
                  .getPublicUrl(`scenarios/${gameUniqid}/media/${file.name}`);
                const url = urlData.publicUrl;
                const baseName = file.name.startsWith('media/') ? file.name.slice('media/'.length) : file.name;
                mediaByFilename[baseName] = url;
                mediaByFilename[`media/${baseName}`] = url;
              }
            }
          }

          setMediaFiles(prev => ({ ...prev, ...mediaByFilename }));

          const bgEntry = mediaByFilename['fond-ecran-taille-ok.jpg'] || null;

          let layoutConfig: GameLayout | null = null;

          const { data: storageFiles } = await supabase.storage
            .from('resources')
            .list('layouts/tagquest', { limit: 100 });

          if (storageFiles && storageFiles.length > 0) {
            const jsonFiles = storageFiles
              .filter(f => f.name.endsWith('.json'))
              .sort((a, b) => {
                const vA = parseInt(a.name.match(/(\d+)/)?.[1] ?? '0', 10);
                const vB = parseInt(b.name.match(/(\d+)/)?.[1] ?? '0', 10);
                return vB - vA;
              });

            if (jsonFiles.length > 0) {
              const { data: fileData } = await supabase.storage
                .from('resources')
                .download(`layouts/tagquest/${jsonFiles[0].name}`);

              if (fileData) {
                const text = await fileData.text();
                const parsed = JSON.parse(text);
                layoutConfig = (parsed.config ?? parsed) as GameLayout;
              }
            }
          }

          if (!layoutConfig) {
            const layoutStr = localStorage.getItem('layout_tagquest');
            if (layoutStr) {
              layoutConfig = JSON.parse(layoutStr) as GameLayout;
            }
          }

          if (layoutConfig) {
            const resolvedElements = (layoutConfig.elements || []).map((el: LayoutElement) => {
              if (el.type === 'image' && el.filename) {
                const fname = el.filename.split('/').pop() ?? '';
                const resolved = mediaByFilename[fname];
                if (resolved) return { ...el, src: resolved };
              }
              return el;
            });

            setLayout({
              ...layoutConfig,
              background: bgEntry || layoutConfig.background,
              elements: resolvedElements
            });
          } else {
            console.warn('No layout found for tagquest');
          }
        }
      } catch (error) {
        console.error('Error loading game data:', error);
      } finally {
        setLayoutLoading(false);
      }
    };

    loadGameData();
  }, [gameUniqid]);

  useEffect(() => {
    if (launchedGameId) {
      loadTeams();
      const interval = setInterval(loadTeams, 2000);
      return () => clearInterval(interval);
    }
  }, [launchedGameId, victoryType]);

  useEffect(() => {
    if (!launchedGameId) return;

    const startAllTeams = async () => {
      const startTime = Math.floor(Date.now() / 1000);
      const { error } = await supabase
        .from('teams')
        .update({ start_time: startTime, end_time: null })
        .eq('launched_game_id', launchedGameId);

      if (error) {
        console.error('[TagQuest] Error starting all teams:', error);
      } else {
        console.log('[TagQuest] All teams started at', startTime);
      }
    };

    startAllTeams();
  }, [launchedGameId]);

  useEffect(() => {
    if (!launchedGameId) return;

    const fetchLaunchedGame = async () => {
      const { data } = await supabase
        .from('launched_games')
        .select('start_time, duration')
        .eq('id', launchedGameId)
        .maybeSingle();

      if (data) {
        setLaunchedGameInfo({ start_time: data.start_time, duration: data.duration });
      }
    };

    const fetchMeta = async () => {
      const { data } = await supabase
        .from('launched_game_meta')
        .select('meta_name, meta_value')
        .eq('launched_game_id', launchedGameId)
        .in('meta_name', ['victoryType', 'playMode', 'teamsConfig']);

      if (data) {
        const map: Record<string, string> = {};
        data.forEach(row => { map[row.meta_name] = row.meta_value || ''; });

        if (map.victoryType === 'score' || map.victoryType === 'speed') {
          setVictoryType(map.victoryType);
        }
        if (map.playMode === 'solo' || map.playMode === 'team') {
          setPlayMode(map.playMode);
        }
        if (map.teamsConfig) {
          try {
            setTeamsConfig(JSON.parse(map.teamsConfig));
          } catch {}
        }
      }
    };

    fetchLaunchedGame();
    fetchMeta();
  }, [launchedGameId]);

  useEffect(() => {
    if (!launchedGameInfo?.start_time || launchedGameInfo.duration == null) return;

    const tick = () => {
      const startMs = new Date(launchedGameInfo.start_time!).getTime();
      const durationMs = (launchedGameInfo.duration ?? 0) * 60 * 1000;
      const endMs = startMs + durationMs;
      const remaining = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
      setCountdown(remaining);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [launchedGameInfo]);

  const loadTeams = async () => {
    if (!launchedGameId) return;

    const { data, error } = await supabase
      .from('teams')
      .select('id, team_name, score, start_time, end_time, key_id')
      .eq('launched_game_id', launchedGameId);

    if (!error && data) {
      const sorted = [...data].sort((a, b) => {
        if (victoryType === 'speed') {
          if (a.end_time && b.end_time) return a.end_time - b.end_time;
          if (a.end_time) return -1;
          if (b.end_time) return 1;
          if (a.start_time && b.start_time) return a.start_time - b.start_time;
          if (a.start_time) return -1;
          if (b.start_time) return 1;
          return 0;
        }
        return (b.score ?? 0) - (a.score ?? 0);
      });
      setTeams(sorted);
    }
  };

  const saveCardData = async (card: CardData) => {
    if (!supabase || !launchedGameId) {
      return;
    }

    try {
      let deviceId = 'web_browser';
      const isElectron = typeof window !== 'undefined' && (window as any).electron?.isElectron;

      if (isElectron) {
        try {
          deviceId = await (window as any).electron.getComputerName();
        } catch (error) {
          console.error('Error getting computer name:', error);
        }
      }

      const rawDataJson = JSON.parse(JSON.stringify(card));

      const { error } = await supabase.from('launched_game_raw_data').insert({
        launched_game_id: launchedGameId,
        device_id: deviceId,
        raw_data: rawDataJson,
      });

      if (error) {
        console.error('Error saving card data:', error);
      } else {
        console.log('✓ Card data saved successfully');
      }
    } catch (error) {
      console.error('Error saving card data:', error);
    }
  };

  const handleCardPunchLogic = async (card: CardData) => {
    if (!launchedGameId) return;

    const result = await processTagQuestPunch(
      card,
      launchedGameId,
      gameUniqid,
      playMode,
      teamsConfig
    );

    await logApiCall({
      endpoint: `/tagquest/punch/${launchedGameId}`,
      method: 'PUNCH',
      requestBody: card as unknown as Record<string, unknown>,
      responseData: result,
      statusCode: result.status === 'ok' ? 200 : result.status === 'error' ? 500 : 422,
      errorMessage: result.status !== 'ok' ? result.message : undefined,
    });

    setPunchLogs(prev => [{ timestamp: new Date(), result }, ...prev].slice(0, 50));

    if (result.status === 'ok') {
      if (result.completed_quest) {
        showMessage(
          `${result.team_name} — ${result.completed_quest.name} complete! +${result.completed_quest.points} pts${result.malus_applied > 0 ? ` (−${result.malus_applied} late malus)` : ''}`
        );
      } else if (result.best_partial_quest) {
        showMessage(
          `${result.team_name} — ${result.best_partial_quest.name}: ${result.best_partial_quest.matched} image(s) found`
        );
      }
      if (result.level_up) {
        showMessage(`${result.team_name} — Level up: ${result.level_up.name}!`);
      }
      if (result.game_ended) {
        showMessage(`${result.team_name} — Game finished!`);
      }
      loadTeams();
    }
  };

  const showMessage = (message: string) => {
    setGameMessage(message);
    setTimeout(() => setGameMessage(''), 5000);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCardPunchLogicRef = useRef(handleCardPunchLogic);
  useEffect(() => { handleCardPunchLogicRef.current = handleCardPunchLogic; });

  const handleNewBip = useCallback((row: { raw_data: any }) => {
    const card = row.raw_data;
    if (card) {
      console.log('🏷️  CARD DETECTED (test/simulation):', card);
      setLastCardData(card);
      setShowCardAlert(true);
      setTimeout(() => setShowCardAlert(false), 5000);
      handleCardPunchLogicRef.current(card);
    }
  }, []);

  useGameStatePolling({
    launchedGameId,
    numberOfTeams: config.numberOfTeams,
    onGameEnded: () => onGameEnd?.(),
    onAllTeamsFinished: () => onGameEnd?.(),
    onNewBip: handleNewBip,
  });

  useEffect(() => {
    const isElectron = typeof window !== 'undefined' && (window as any).electron?.isElectron;
    if (isElectron) {
      (window as any).electron.db.connect().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const initializeUSB = async () => {
      if (usbReaderService.isElectron() && config.usbPort) {
        try {
          console.log('🔌 Initializing USB reader on port:', config.usbPort);
          const initialized = await usbReaderService.initializePort(config.usbPort);
          if (initialized) {
            console.log('✓ USB reader initialized successfully');
            usbReaderService.setCardDetectedCallback((card: CardData) => {
              console.log('🏷️  CARD DETECTED:', card);
              saveCardData(card);
              setLastCardData(card);
              setShowCardAlert(true);
              setTimeout(() => setShowCardAlert(false), 5000);
            });

            usbReaderService.setCardRemovedCallback(() => {
              console.log('🏷️  CARD REMOVED');
              setShowCardAlert(false);
            });
          }
        } catch (error) {
          console.error('Error initializing USB reader:', error);
        }
      }
    };

    if (gameStarted) {
      initializeUSB();
    }

    return () => {
      if (usbReaderService.isElectron()) {
        usbReaderService.stopReading();
      }
    };
  }, [gameStarted, config.usbPort]);

  const updateBgDimensions = useCallback(() => {
    if (bgImageRef.current) {
      setBgDimensions({
        width: bgImageRef.current.offsetWidth,
        height: bgImageRef.current.offsetHeight
      });
    }
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(updateBgDimensions);
    if (bgImageRef.current) observer.observe(bgImageRef.current);
    window.addEventListener('resize', updateBgDimensions);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateBgDimensions);
    };
  }, [updateBgDimensions, layout]);

  const renderLayoutElement = (element: LayoutElement, index: number): JSX.Element | JSX.Element[] => {
    if (!bgDimensions) {
      return <div key={`${element.id}-${index}`} />;
    }

    const wrapperStyle: React.CSSProperties = {
      position: 'absolute',
      left: element.x !== undefined ? `${(element.x / 100) * bgDimensions.width}px` : undefined,
      top: element.y !== undefined ? `${(element.y / 100) * bgDimensions.height}px` : undefined,
      width: element.width !== undefined ? `${(element.width / 100) * bgDimensions.width}px` : undefined,
      height: element.height !== undefined ? `${(element.height / 100) * bgDimensions.height}px` : undefined,
      ...element.style
    };

    let imageSrc = element.src || element.filename;
    if (element.type === 'image' && !imageSrc && element.id) {
      imageSrc = mediaFiles[element.id] || '';
    }

    if (element.id === 'animation_quest_image') {
      const quests = gameData?.quests || [];

      if (!quests.length) return <div key={`${element.id}-${index}`} style={wrapperStyle} />;

      const resolveMedia = (key: string | undefined): string => {
        if (!key) return '';
        return mediaFiles[key] || mediaFiles[key.replace(/^media\//, '')] || mediaFiles[`media/${key}`] || '';
      };

      return quests.flatMap((quest, questIndex) => {
        const questNum = questIndex + 1;
        const mainSrc = resolveMedia(quest.main_image);
        const subImages = ([quest.image_1, quest.image_2, quest.image_3, quest.image_4] as (string | undefined)[])
          .filter((img): img is string => !!img)
          .map(imgKey => resolveMedia(imgKey));

        const questHeight = element.height !== undefined ? `${(element.height / 100) * bgDimensions.height}px` : wrapperStyle.height;

        return [
          <div key={`quest-${questNum}-wrapper`} id={`quest-${questNum}-wrapper`} style={{ ...wrapperStyle, width: questHeight, display: 'none' }}>
            <div className="main_quest_image" style={{ position: 'absolute', top: 0, left: 0, width: '100%', filter: 'blur(8px)' }}>
              <img src={mainSrc} alt={quest.name} style={{ width: '100%' }} />
            </div>
            <div className="quest_images" style={{ position: 'absolute', top: 0, left: 0, width: '100%', display: 'flex', flexWrap: 'wrap', filter: 'blur(8px)' }}>
              {subImages.map((src, i) => (
                <img key={i} src={src} alt={`${quest.name} ${i + 1}`} style={{ width: '50%' }} />
              ))}
            </div>
          </div>,
          <div key={`quest-${questNum}-title`} className="quest_title" style={{ ...wrapperStyle, display: 'none', color: element.color || '#fff', fontFamily: element.fontFamily, fontSize: element.fontSize !== undefined ? `${(element.fontSize / 100) * bgDimensions.height}px` : undefined }}>
            {quest.name}
          </div>
        ];
      });
    }

    const elementId = element.id?.toLowerCase() ?? '';
    const isMultiplicator = elementId.includes('multiplicat');
    const isPoints = elementId.includes('points');
    const isTimer = elementId.includes('timer') || elementId.includes('countdown');

    switch (element.type) {
      case 'image':
        return (
          <div key={`${element.id}-${index}`} style={{ ...wrapperStyle, display: 'none' }}>
            <img
              src={imageSrc || ''}
              alt={element.id}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
        );
      case 'text': {
        let displayText: string | number | undefined;
        if (isTimer) {
          displayText = countdown !== null ? formatTime(countdown) : formatTime(0);
        } else if (isMultiplicator || isPoints) {
          displayText = 0;
        } else {
          displayText = element.text ?? element.previewText;
        }
        return (
          <div key={`${element.id}-${index}`} style={{ ...wrapperStyle, display: isTimer ? (wrapperStyle.display ?? 'block') : 'none' }}>
            <div
              style={{
                width: '100%',
                height: '100%',
                fontSize: element.fontSize !== undefined ? `${(element.fontSize / 100) * bgDimensions.height}px` : undefined,
                color: element.color,
                fontFamily: element.fontFamily,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              {displayText}
            </div>
          </div>
        );
      }
      case 'container':
        return (
          <div key={`${element.id}-${index}`} style={{ ...wrapperStyle, display: 'none' }}>
            {element.children?.map((child, childIndex) => renderLayoutElement(child, childIndex))}
          </div>
        );
      default:
        return <div key={`${element.id}-${index}`}>Unknown element type</div>;
    }
  };

  const renderPunchLog = () => {
    if (punchLogs.length === 0) return null;
    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: '220px',
        backgroundColor: 'rgba(0,0,0,0.88)',
        borderTop: '1px solid rgba(255,255,255,0.12)',
        overflowY: 'auto',
        zIndex: 9000,
        fontFamily: 'monospace',
        fontSize: '11px',
      }}>
        <div style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0 }}>
          <span style={{ fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '10px' }}>Punch Console</span>
          <button
            onClick={() => setPunchLogs([])}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '10px', padding: '2px 6px' }}
          >
            clear
          </button>
        </div>
        {punchLogs.map((entry, i) => {
          const isOk = entry.result?.status === 'ok';
          const isError = entry.result?.status === 'error';
          const color = isOk ? '#4ade80' : isError ? '#f87171' : '#fbbf24';
          const time = entry.timestamp.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
          return (
            <div key={i} style={{ padding: '3px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ color: '#475569', whiteSpace: 'nowrap', flexShrink: 0 }}>{time}</span>
              <span style={{ color, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>[{entry.result?.status?.toUpperCase()}]</span>
              <span style={{ color: '#cbd5e1', wordBreak: 'break-all' }}>{JSON.stringify(entry.result)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  if (!gameData || layoutLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading game data...</div>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-8">
        <button
          onClick={onBack}
          className="absolute top-6 left-6 text-white/70 hover:text-white transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="text-center max-w-2xl">
          <h1 className="text-5xl font-bold text-white mb-6">{gameData.game.title}</h1>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 mb-8">
            <div className="flex items-center justify-center gap-3 text-white/80 mb-6">
              <Users className="w-6 h-6" />
              <span className="text-lg">{config.teams?.length || config.numberOfTeams || 0} Teams</span>
            </div>
            <p className="text-white/60 mb-2">USB Port: {config.usbPort || 'Not configured'}</p>
            <p className="text-white/60">Message Duration: {config.messageDisplayDuration}s</p>
          </div>

          <button
            onClick={handleStartGame}
            className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-lg text-xl font-semibold transition-colors flex items-center gap-3 mx-auto"
          >
            <Play className="w-6 h-6" />
            Start Game
          </button>
          <p className="text-white/40 mt-4">Press Enter to start</p>
        </div>
      </div>
    );
  }

  if (layout) {
    return (
      <div style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {layout.background && (
          <img
            ref={bgImageRef}
            src={layout.background}
            alt="Background"
            onLoad={updateBgDimensions}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'center'
            }}
          />
        )}

        {bgDimensions && layout.elements?.map((element, index) => renderLayoutElement(element, index))}

        {gameMessage && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '20px 40px',
            borderRadius: '10px',
            fontSize: '24px',
            fontWeight: 'bold',
            zIndex: 1000
          }}>
            {gameMessage}
          </div>
        )}

        <CardDetectionAlert
            cardData={lastCardData}
            show={showCardAlert}
          />
        {renderPunchLog()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <button
        onClick={onBack}
        className="text-white/70 hover:text-white transition-colors flex items-center gap-2 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      <div className="max-w-6xl mx-auto">
        {config.testMode && (
          <div className="flex items-center justify-center gap-3 mb-6 px-4 py-3 bg-amber-500/20 border border-amber-500/50 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-400 font-semibold text-sm tracking-wide uppercase">Test Mode — Max 5 Teams</span>
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </div>
        )}

        <h1 className="text-4xl font-bold text-white mb-8 text-center">{gameData.game.title}</h1>

        {gameMessage && (
          <div className="bg-blue-600 text-white p-4 rounded-lg mb-6 text-center text-xl font-semibold">
            {gameMessage}
          </div>
        )}

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between text-white mb-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6" />
              <h2 className="text-2xl font-bold">Leaderboard</h2>
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
              victoryType === 'speed'
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
            }`}>
              {victoryType === 'speed' ? 'Rapidite' : 'Score'}
            </span>
          </div>

          <div className="space-y-3">
            {teams.length === 0 ? (
              <p className="text-white/60 text-center py-8">No teams have started yet</p>
            ) : (
              teams.map((team, index) => {
                const configTeam = teamsConfig.find(
                  t => t.chipId === team.key_id || t.name === team.team_name
                );
                const teammates = playMode === 'team' ? (configTeam?.teammates ?? []) : [];
                return (
                  <div
                    key={team.id}
                    className="bg-white/5 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`text-2xl font-bold ${
                          index === 0 ? 'text-yellow-400' :
                          index === 1 ? 'text-gray-300' :
                          index === 2 ? 'text-amber-600' :
                          'text-white/60'
                        }`}>
                          #{index + 1}
                        </div>
                        <div>
                          <div className="text-white font-semibold text-lg">{team.team_name}</div>
                          <div className="text-white/60 text-sm">
                            {team.start_time && team.end_time ? (
                              <>Finished &mdash; {formatTime(team.end_time - team.start_time)}</>
                            ) : team.start_time ? (
                              <>In progress...</>
                            ) : (
                              <>Not started</>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {victoryType === 'score' ? (
                          <div className="text-2xl font-bold text-white">{team.score} pts</div>
                        ) : (
                          team.end_time ? (
                            <div className="text-lg font-bold text-orange-400">{formatTime(team.end_time - (team.start_time ?? team.end_time))}</div>
                          ) : (
                            <div className="text-sm text-white/40">&mdash;</div>
                          )
                        )}
                      </div>
                    </div>
                    {teammates.length > 1 && (
                      <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-2">
                        {teammates.map((mate, mi) => (
                          <span key={mi} className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-full text-xs text-white/70">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block" />
                            {mate.name}
                            <span className="text-white/30">#{mate.chipNumber}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-yellow-600/20 border border-yellow-600 text-yellow-100 p-4 rounded-lg">
          <p className="font-semibold mb-2">No Layout Found</p>
          <p className="text-sm">
            To display the custom game layout, please upload a TagQuest layout file or sync with the server.
            Currently showing the default leaderboard view.
          </p>
        </div>
      </div>

      <CardDetectionAlert
          cardData={lastCardData}
          show={showCardAlert}
        />
      {renderPunchLog()}
    </div>
  );
}
