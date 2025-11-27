import { useState, useEffect, useRef } from 'react';
import { NetworkManager } from './network/NetworkManager';
import { GameClient } from './client/GameClient';
import Menu from './components/Menu';
import HUD from './components/HUD';
import Settings from './components/Settings';
import Scoreboard from './components/Scoreboard';
import GameModeDisplay from './components/GameModeDisplay';
import type { GameState } from './common/types';
import styles from './App.module.css';

// Extend Window interface to include networkManager property
declare global {
  interface Window {
    networkManager?: NetworkManager;
  }
}

function App() {
  const [networkManager] = useState(() => new NetworkManager());
  const [gameClient, setGameClient] = useState<GameClient | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [settingsOpened, setSettingsOpened] = useState(false);
  const [scoreboardOpened, setScoreboardOpened] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const gameClientInitialized = useRef(false);

  useEffect(() => {
    // Make networkManager available globally for components that need it
    window.networkManager = networkManager;

    // Initialize GameClient after React has rendered the DOM elements
    // Use a small delay to ensure DOM is ready
    if (!gameClientInitialized.current) {
      const timer = setTimeout(() => {
        const client = new GameClient(networkManager);

        // Set up callbacks for settings and scoreboard
        client.setOnSettingsToggle(() => {
          setSettingsOpened(prev => !prev);
        });
        client.setOnScoreboardToggle(() => {
          setScoreboardOpened(true);
        });
        client.setOnScoreboardClose(() => {
          setScoreboardOpened(false);
        });

        setGameClient(client);
        gameClientInitialized.current = true;
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [networkManager]);

  // Update gameState and localPlayerId from GameClient
  useEffect(() => {
    if (!gameClient || !gameStarted) return;

    const interval = setInterval(() => {
      const currentState = gameClient.getCurrentGameState();
      const currentPlayerId = gameClient.getLocalPlayerId();
      if (currentState) {
        setGameState(currentState);
      }
      if (currentPlayerId) {
        setLocalPlayerId(currentPlayerId);
      }
    }, 100); // Update every 100ms

    return () => clearInterval(interval);
  }, [gameClient, gameStarted]);

  useEffect(() => {
    const handleGameStarted = () => {
      setGameStarted(true);
    };

    window.addEventListener('game-started', handleGameStarted);

    return () => {
      window.removeEventListener('game-started', handleGameStarted);
    };
  }, []);

  const handleStartGame = () => {
    if (gameClient && networkManager.isHost) {
      networkManager.sendToHost({
        type: 'START_GAME',
      });
    }
  };

  const handleRestartGame = () => {
    if (gameClient && networkManager.isHost) {
      networkManager.sendToHost({
        type: 'RESTART_GAME',
      });
    }
  };

  const handleExitGame = () => {
    // Stop game client and dispose audio resources
    if (gameClient) {
      gameClient.stop();
    }

    setGameStarted(false);
    setSettingsOpened(false);
    setGameState(null);
    setLocalPlayerId(null);

    // Clear query string from URL
    const newUrl = window.location.pathname;
    window.history.replaceState({ path: newUrl }, '', newUrl);

    setTimeout(() => {
      window.location.reload();
    }, 0);
  };

  return (
    <div className={styles.app}>
      {!gameStarted && (
        <div className={styles.uiLayer}>
          {gameClient && <Menu networkManager={networkManager} gameClient={gameClient} />}
        </div>
      )}
      <HUD />
      {gameStarted && <GameModeDisplay gameState={gameState} visible={gameStarted} />}
      {gameClient && (
        <>
          <Settings
            opened={settingsOpened}
            onClose={() => setSettingsOpened(false)}
            audioManager={gameClient.getAudioManager()}
            variant="modal"
            onExitGame={handleExitGame}
          />
          <Scoreboard
            opened={scoreboardOpened}
            onClose={() => setScoreboardOpened(false)}
            gameState={gameState}
            localPlayerId={localPlayerId}
            isHost={networkManager.isHost}
            onStartGame={handleStartGame}
            onRestartGame={handleRestartGame}
          />
        </>
      )}
      <div id="game-container"></div>
    </div>
  );
}

export default App;
