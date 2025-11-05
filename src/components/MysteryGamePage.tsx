import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { GameConfig } from './LaunchGameModal';
import { usbReaderService, CardData, StationData } from '../services/usbReader';
import { CardDetectionAlert } from './CardDetectionAlert';
import '../mystery.css';

interface MysteryGamePageProps {
  config: GameConfig;
  gameUniqid: string;
  onBack: () => void;
}

interface GameData {
  game: {
    id: string;
    uniqid: string;
    type: string;
    title: string;
  };
  game_meta: {
    number_of_enigmas: string;
    font: string;
    score_full_game: string;
    levels: Record<string, { points: string; name: string; description: string }>;
    gauge_filling: string;
    background_image: string;
    game_instructions_image: string;
    game_instructions_button_image: string;
    game_instructions_button_hover_image: string;
    time_background_image: string;
    game_refresh_button_image: string;
    game_refresh_button_hover_image: string;
    levels_gauge_image: string;
    levels_gauge_level_icon_image: string;
    score_background_image: string;
    enigmas_header_image: string;
    team_name_background_image: string;
  };
  game_enigmas: Array<{
    id: string;
    number: string;
    text: string;
    good_answer_image: string;
    good_answer_points: string;
  }>;
}

export function MysteryGamePage({ config, gameUniqid, onBack }: MysteryGamePageProps) {
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(0);
  const [completedEnigmas, setCompletedEnigmas] = useState<Set<number>>(new Set());
  const [lastCardData, setLastCardData] = useState<CardData | null>(null);
  const [stations, setStations] = useState<StationData[]>([]);
  const [showCardAlert, setShowCardAlert] = useState(false);

  useEffect(() => {
    const loadGameData = async () => {
      try {
        const response = await fetch(`/data/games/${gameUniqid}/game-data.json`);
        const data = await response.json();
        setGameData(data);
      } catch (error) {
        console.error('Error loading game data:', error);
      }
    };

    loadGameData();
  }, [gameUniqid]);

  useEffect(() => {
    if (!gameStarted) return;

    const timer = setInterval(() => {
      setTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStarted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartGame = async () => {
    setGameStarted(true);

    if (config.usbPort) {
      try {
        const initialized = await usbReaderService.initializePort(config.usbPort);
        if (initialized) {
          usbReaderService.setCardDetectedCallback((card: CardData) => {
            console.log('Card detected:', card);
            setLastCardData(card);
            setShowCardAlert(true);

            setTimeout(() => {
              setShowCardAlert(false);
            }, 5000);
          });

          usbReaderService.setCardRemovedCallback(() => {
            console.log('Card removed');
            setShowCardAlert(false);
          });

          usbReaderService.setStationsDetectedCallback((detectedStations: StationData[]) => {
            console.log('Stations detected:', detectedStations);
            setStations(detectedStations);
          });

          await usbReaderService.start();
        }
      } catch (error) {
        console.error('Error starting USB reader:', error);
      }
    }
  };

  useEffect(() => {
    return () => {
      usbReaderService.stop();
    };
  }, []);

  if (!gameData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    );
  }

  const getImageUrl = (imageId: string) => {
    return `/data/games/${gameUniqid}/media/${imageId}.png`;
  };

  const backgroundImageUrl = getImageUrl(gameData.game_meta.background_image);

  return (
    <div className="game_page_wrapper game_page_wrapper_mystery" style={{ backgroundImage: `url(${backgroundImageUrl})` }}>
      <CardDetectionAlert cardData={lastCardData} show={showCardAlert} />

      <header className="fixed top-0 left-0 right-0 bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{gameData.game.title}</h1>
            <p className="text-slate-400 text-sm">{config.name}</p>
          </div>
        </div>
      </header>

      {!gameStarted && (
        <div className="game_instructions_wrapper">
          <div
            className="mystery_game_instructions_container"
            style={{ backgroundImage: `url(${getImageUrl(gameData.game_meta.game_instructions_image)})` }}
          >
            <div id="game_instructions_button_image_container" onClick={handleStartGame}>
              <div className="game_instructions_button" id="game_instructions_button_image">
                <img src={getImageUrl(gameData.game_meta.game_instructions_button_image)} alt="start" />
              </div>
              <div className="game_instructions_button hide" id="game_instructions_button_hover_image">
                <img src={getImageUrl(gameData.game_meta.game_instructions_button_hover_image)} alt="start-hover" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="enigmas_wrapper" style={{ opacity: gameStarted ? 1 : 0 }}>
        <div className="left_column_mystery">
          <div className="time_background_image">
            <img src={getImageUrl(gameData.game_meta.time_background_image)} alt="timer" />
            <div id="time_background_image_text">{formatTime(time)}</div>
          </div>

          <div className="team_score_container">
            <img src={getImageUrl(gameData.game_meta.score_background_image)} alt="score" />
            <div className="team_score_container_text">
              <span id="game_score_container_score">{score}</span>
              <span id="game_score_container_percentage">%</span>
            </div>
            <div id="floating_enigma_score"></div>
          </div>

          <div id="game_overscore" className="team_bonus_wrapper">
            <div className="team_bonus_container team_bonus_container_empty">
              <img src={getImageUrl(gameData.game_meta.enigmas_header_image)} alt="bonus-empty" />
            </div>
          </div>
        </div>

        <div id="enigmas_grid_wrapper">
          <div className="enigmas_subwrapper">
            <div className="enigma_container" id="time_full_container">
              <div>Your time </div>
              <div id="time_full_container_detail">{formatTime(time)}</div>
            </div>

            {gameData.game_enigmas.map((enigma) => (
              <div key={enigma.id} className="enigma_wrapper">
                <div className="enigma_container" id={`enigma_container_${enigma.number}`}>
                  <div className="enigma_subcontainer enigma_texts_container">
                    <div className="enigma_text">{enigma.text}</div>
                    <div className="enigma_answer">
                      <div className="enigma_answer_image">
                        <div className="enigma_answer_image_background"></div>
                        <img
                          src={getImageUrl(enigma.good_answer_image)}
                          alt={enigma.text}
                          className={completedEnigmas.has(parseInt(enigma.number)) ? '' : 'blur'}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div id="right_column_mystery" className="right_column_mystery">
          <div id="mystery_team_name_container" className="mystery_team_name_container">
            <img src={getImageUrl(gameData.game_meta.team_name_background_image)} alt="team" />
            <div className="mystery_team_name_container_text">{config.name}</div>
          </div>

          <div id="artefacts_container" className="artefacts_container">
            <img src={getImageUrl(gameData.game_meta.enigmas_header_image)} alt="ingredients" />
          </div>

          <div className="team_enigmas_recap_container">
            {gameData.game_enigmas.map((enigma) => (
              <div
                key={enigma.id}
                className="enigmas_recap_enigma_container"
                id={`enigmas_recap_enigma_container_${enigma.number}`}
              >
                <div className="enigmas_recap_enigma_subcontainer">
                  <div className="enigma_answer">
                    <div className="enigma_answer_image_background">
                      <div className={`enigma_answer_image ${completedEnigmas.has(parseInt(enigma.number)) ? 'no_blur' : 'blur'}`}>
                        <img src={getImageUrl(enigma.good_answer_image)} alt={enigma.text} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="progress_bar_container">
        <div id="progression_wrapper">
          <div className="progress_bar">
            <div id="progress_bar_gauge_with_back">
              <img src={getImageUrl(gameData.game_meta.levels_gauge_image)} alt="gauge" />
            </div>
            <div id="progress_bar_content">
              <div
                id="progress_bar_content_inside"
                style={{
                  background: gameData.game_meta.gauge_filling,
                  width: `${score}%`
                }}
              ></div>
            </div>

            {Object.entries(gameData.game_meta.levels).map(([key, level]) => {
              const stepNumber = parseInt(key);
              const isEven = stepNumber % 2 === 0;
              const isFirst = stepNumber === 1;
              const isLast = stepNumber === Object.keys(gameData.game_meta.levels).length;
              const shouldShowIcon = stepNumber === 1 || stepNumber === 10 || stepNumber === 20 || stepNumber === 30 || stepNumber === 40 || stepNumber === 50;

              if (!shouldShowIcon) return null;

              return (
                <div
                  key={key}
                  className={`step ${isFirst ? 'first_step' : ''} ${isLast ? 'last_step' : ''}`}
                  id={`step_container_${stepNumber}`}
                >
                  <div className="step-progress"></div>
                  <div className={`icon-wrapper ${!isFirst && !isLast ? 'icon-wrapper-end' : ''} ${isLast ? 'icon-wrapper-last' : ''}`}>
                    <div id={`step_${stepNumber}`} className={`${isEven ? 'even_image' : ''} step_checkmark`}>
                      <img src={getImageUrl(gameData.game_meta.levels_gauge_level_icon_image)} alt="level-icon" />
                    </div>
                    <div className={`${isEven ? 'level_line_even' : ''} level_line`}></div>
                  </div>
                  <div className={`${isEven ? 'step_even' : 'step_odd'} step-text step-text-end step_level_hidden`}>
                    {level.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
