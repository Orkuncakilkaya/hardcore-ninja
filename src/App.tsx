import { useState, useEffect, useRef } from 'react';
import { NetworkManager } from './network/NetworkManager';
import { GameClient } from './client/GameClient';
import Menu from './components/Menu';
import HUD from './components/HUD';
import styles from './App.module.css';

function App() {
  const [networkManager] = useState(() => new NetworkManager());
  const [gameClient, setGameClient] = useState<GameClient | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const gameClientInitialized = useRef(false);

  useEffect(() => {
    // Make networkManager available globally for components that need it
    (window as any).networkManager = networkManager;

    // Initialize GameClient after React has rendered the DOM elements
    // Use a small delay to ensure DOM is ready
    if (!gameClientInitialized.current) {
      const timer = setTimeout(() => {
        const client = new GameClient(networkManager);
        setGameClient(client);
        gameClientInitialized.current = true;
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [networkManager]);

  useEffect(() => {
    const handleGameStarted = () => {
      setGameStarted(true);
    };

    window.addEventListener('game-started', handleGameStarted);

    return () => {
      window.removeEventListener('game-started', handleGameStarted);
    };
  }, []);

  return (
    <div className={styles.app}>
      {!gameStarted && (
        <div className={styles.uiLayer}>
          {gameClient && <Menu networkManager={networkManager} gameClient={gameClient} />}
        </div>
      )}
      <HUD />
      <div id="game-container"></div>
    </div>
  );
}

export default App;

