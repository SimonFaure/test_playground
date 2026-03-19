import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Users, Trophy } from 'lucide-react';
import { GameConfig } from './LaunchGameModal';
import { usbReaderService, CardData, StationData } from '../services/usbReader';
import { CardDetectionAlert } from './CardDetectionAlert';
import { supabase } from '../lib/db';

interface TagQuestGamePageProps {
  config: GameConfig;
  gameUniqid: string;
  launchedGameId: number | null;
  onBack: () => void;
}

interface GameQuest {
  id: string;
  game_id?: string;
  number: string;
  text: string;
  main_image: string;
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
  game_data?: {
    quests?: GameQuest[];
  };
  game_quests?: GameQuest[];
  game_media_images?: Array<{
    id: string;
    uuid: string;
    file_name: string;
  }>;
}

interface TeamScore {
  id: number;
  team_name: string;
  score: number;
  start_time: number | null;
  end_time: number | null;
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

export function TagQuestGamePage({ config, gameUniqid, launchedGameId, onBack }: TagQuestGamePageProps) {
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
  const bgImageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const loadGameData = async () => {
      try {
        const isElectron = typeof window !== 'undefined' && (window as any).electron?.isElectron;

        if (isElectron) {
          const gameDataContent = await (window as any).electron.games.readFile(gameUniqid, 'game-data.json');
          const data = JSON.parse(gameDataContent);
          setGameData(data);

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
            const quests = scenarioData.game_data_json?.quests || [];
            setGameData({
              game: {
                id: scenarioData.id.toString(),
                uniqid: scenarioData.uniqid,
                type: scenarioData.game_type,
                title: scenarioData.title
              },
              game_quests: quests
            });

            if (scenarioData.csv_media_images) {
              const mediaMap: Record<string, string> = {};
              const lines = scenarioData.csv_media_images.split('\n').filter(Boolean);
              const headers = lines[0]?.split(',').map((h: string) => h.trim()) ?? [];

              for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map((v: string) => v.trim());
                const row: Record<string, string> = {};
                headers.forEach((h: string, idx: number) => { row[h] = values[idx] ?? ''; });

                if (row.id && row.uuid && row.file_name) {
                  const { data: urlData } = await supabase.storage
                    .from('game-media')
                    .createSignedUrl(`${gameUniqid}/media/${row.uuid}/${row.file_name}`, 3600);

                  if (urlData?.signedUrl) {
                    mediaMap[row.id] = urlData.signedUrl;
                    mediaMap[row.file_name] = urlData.signedUrl;
                  }
                }
              }

              setMediaFiles(mediaMap);
              console.log('Loaded media files from CSV:', mediaMap);
            }
          }

          const { data: allMedia } = await supabase
            .from('scenario_media')
            .select('filename, data, media_type')
            .eq('scenario_uniqid', gameUniqid);

          const mediaByFilename: Record<string, string> = {};
          if (allMedia) {
            for (const m of allMedia) {
              const mimeType = m.filename.endsWith('.jpg') || m.filename.endsWith('.jpeg')
                ? 'image/jpeg'
                : m.filename.endsWith('.png')
                ? 'image/png'
                : 'image/png';
              mediaByFilename[m.filename] = `data:${mimeType};base64,${m.data}`;
            }
          }

          setMediaFiles(prev => ({ ...prev, ...mediaByFilename }));

          const bgEntry = mediaByFilename['fond-ecran-taille-ok.jpg'] || null;

          const { data: layoutData, error: layoutError } = await supabase
            .from('layouts')
            .select('*')
            .eq('game_type', 'tagquest')
            .eq('is_active', true)
            .maybeSingle();

          if (!layoutError && layoutData) {
            const config = layoutData.config as GameLayout;

            const resolvedElements = (config.elements || []).map((el: LayoutElement) => {
              if (el.type === 'image' && el.filename) {
                const fname = el.filename.split('/').pop() ?? '';
                const resolved = mediaByFilename[fname];
                if (resolved) return { ...el, src: resolved };
              }
              return el;
            });

            setLayout({
              ...config,
              background: bgEntry || config.background,
              elements: resolvedElements
            });
          } else {
            const layoutKey = `layout_tagquest`;
            const layoutStr = localStorage.getItem(layoutKey);
            if (layoutStr) {
              setLayout(JSON.parse(layoutStr));
            } else {
              console.warn('No layout found for tagquest');
            }
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
  }, [launchedGameId]);

  const loadTeams = async () => {
    if (!launchedGameId) return;

    const { data, error } = await supabase
      .from('teams')
      .select('id, team_name, score, start_time, end_time')
      .eq('launched_game_id', launchedGameId)
      .order('score', { ascending: false });

    if (!error && data) {
      setTeams(data);
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
        await handleCardPunchLogic(card);
      }
    } catch (error) {
      console.error('Error saving card data:', error);
    }
  };

  const handleCardPunchLogic = async (card: CardData) => {
    if (!supabase || !launchedGameId) {
      return;
    }

    try {
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('launched_game_id', launchedGameId)
        .eq('key_id', card.id)
        .maybeSingle();

      if (teamError) {
        console.error('Error finding team:', teamError);
        return;
      }

      if (!team) {
        console.warn('No team found with card ID:', card.id);
        return;
      }

      if (!team.start_time) {
        const startTime = Math.floor(Date.now() / 1000);
        const { error: updateError } = await supabase
          .from('teams')
          .update({ start_time: startTime })
          .eq('id', team.id);

        if (updateError) {
          console.error('Error updating team start time:', updateError);
        } else {
          console.log('✓ Team started:', team.team_name);
          showMessage(`${team.team_name} - Game started!`);
        }
      } else if (!team.end_time) {
        const endTime = Math.floor(Date.now() / 1000);
        const duration = endTime - team.start_time;

        const cardPunchCodes = card.punches.map(p => p.code.toString());
        const totalScore = cardPunchCodes.length * 10;

        const { error: updateError } = await supabase
          .from('teams')
          .update({
            end_time: endTime,
            score: totalScore
          })
          .eq('id', team.id);

        if (updateError) {
          console.error('Error updating team end time:', updateError);
        } else {
          console.log('✓ Team finished:', team.team_name);
          showMessage(`${team.team_name} finished! Score: ${totalScore} - Time: ${formatTime(duration)}`);
          loadTeams();
        }
      } else {
        console.log('Team has already finished the game');
      }
    } catch (error) {
      console.error('Error handling card punch logic:', error);
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
      const quests = gameData?.game_data?.quests || gameData?.game_quests || [];
      if (!quests.length) return <div key={`${element.id}-${index}`} style={wrapperStyle} />;

      return quests.flatMap((quest) => {
        const mainSrc = mediaFiles[quest.main_image] || '';
        const subImages = ([quest.image_1, quest.image_2, quest.image_3, quest.image_4] as (string | undefined)[])
          .filter((img): img is string => !!img)
          .map(imgKey => mediaFiles[imgKey] || imgKey);

        return [
          <div key={`quest-${quest.id}-wrapper`} id={`quest-${quest.id}-wrapper`} style={{ ...wrapperStyle }}>
            <div className="main_quest_image" style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}>
              <img src={mainSrc} alt={quest.text} style={{ width: '100%' }} />
            </div>
            <div className="quest_images" style={{ position: 'absolute', top: 0, left: 0, width: '100%', display: 'flex', flexWrap: 'wrap' }}>
              {subImages.map((src, i) => (
                <img key={i} src={src} alt={`${quest.text} ${i + 1}`} style={{ width: '50%' }} />
              ))}
            </div>
          </div>,
          <div key={`quest-${quest.id}-title`} className="quest_title" style={{ ...wrapperStyle, color: element.color || '#fff', fontFamily: element.fontFamily, fontSize: element.fontSize !== undefined ? `${(element.fontSize / 100) * bgDimensions.height}px` : undefined }}>
            {quest.text}
          </div>
        ];
      });
    }

    switch (element.type) {
      case 'image':
        return (
          <div key={`${element.id}-${index}`} style={wrapperStyle}>
            <img
              src={imageSrc || ''}
              alt={element.id}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
        );
      case 'text':
        return (
          <div key={`${element.id}-${index}`} style={wrapperStyle}>
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
              {element.text ?? element.previewText}
            </div>
          </div>
        );
      case 'container':
        return (
          <div key={`${element.id}-${index}`} style={wrapperStyle}>
            {element.children?.map((child, childIndex) => renderLayoutElement(child, childIndex))}
          </div>
        );
      default:
        return <div key={`${element.id}-${index}`}>Unknown element type</div>;
    }
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
    const handleBgImageLoad = () => {
      if (bgImageRef.current) {
        setBgDimensions({
          width: bgImageRef.current.offsetWidth,
          height: bgImageRef.current.offsetHeight
        });
      }
    };

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
            onLoad={handleBgImageLoad}
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

        {showCardAlert && lastCardData && (
          <CardDetectionAlert
            cardData={lastCardData}
            onClose={() => setShowCardAlert(false)}
          />
        )}
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
        <h1 className="text-4xl font-bold text-white mb-8 text-center">{gameData.game.title}</h1>

        {gameMessage && (
          <div className="bg-blue-600 text-white p-4 rounded-lg mb-6 text-center text-xl font-semibold">
            {gameMessage}
          </div>
        )}

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 text-white mb-4">
            <Trophy className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Leaderboard</h2>
          </div>

          <div className="space-y-3">
            {teams.length === 0 ? (
              <p className="text-white/60 text-center py-8">No teams have started yet</p>
            ) : (
              teams.map((team, index) => (
                <div
                  key={team.id}
                  className="bg-white/5 rounded-lg p-4 flex items-center justify-between"
                >
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
                          <>Time: {formatTime(team.end_time - team.start_time)}</>
                        ) : team.start_time ? (
                          <>In progress...</>
                        ) : (
                          <>Not started</>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {team.score} pts
                  </div>
                </div>
              ))
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

      {showCardAlert && lastCardData && (
        <CardDetectionAlert
          cardData={lastCardData}
          onClose={() => setShowCardAlert(false)}
        />
      )}
    </div>
  );
}
