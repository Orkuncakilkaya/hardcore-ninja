import { useState, useEffect, useRef } from 'react';
import { NetworkManager } from '../network/NetworkManager';
import { GameClient } from '../client/GameClient';
import { GameServer } from '../server/GameServer';
import { MapLoader } from '../core/MapLoader';
import styles from './Menu.module.css';
import HostControls from './HostControls';
import LobbyControls from './LobbyControls';
import PlayerNameInput from './PlayerNameInput';

interface MenuProps {
  networkManager: NetworkManager;
  gameClient: GameClient;
}

export default function Menu({ networkManager, gameClient }: MenuProps) {
  const [connectionStatus, setConnectionStatus] = useState('Connecting to network...');
  const [isNetworkReady, setIsNetworkReady] = useState(false);
  const [isHosting, setIsHosting] = useState(false);
  const [hostId, setHostId] = useState('');
  const [inputHostId, setInputHostId] = useState('');
  const [bgmVolume, setBgmVolume] = useState(10);
  const [sfxVolume, setSfxVolume] = useState(50);
  const [activeTab, setActiveTab] = useState('main'); // 'main', 'settings', 'host', 'join', 'credits'
  const [playerName, setPlayerName] = useState('');
  const [showHostMenu, setShowHostMenu] = useState(false);
  const [showJoinMenu, setShowJoinMenu] = useState(false);
  const [autoFocusNameInput, setAutoFocusNameInput] = useState(false);

  const bgmVolumeRef = useRef<HTMLInputElement>(null);
  const sfxVolumeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleNetworkReady = (_e: CustomEvent) => {
      setConnectionStatus('Network Ready!');
      setIsNetworkReady(true);
      setHostId(networkManager.peerId);
    };

    const handleConnected = (_e: CustomEvent) => {
      if (!networkManager.isHost) {
        setConnectionStatus('Connected! Joining game...');
        gameClient.joinGame(inputHostId);
      }
    };

    window.addEventListener('network-ready', handleNetworkReady as EventListener);
    window.addEventListener('connected', handleConnected as EventListener);

    return () => {
      window.removeEventListener('network-ready', handleNetworkReady as EventListener);
      window.removeEventListener('connected', handleConnected as EventListener);
    };
  }, [networkManager, gameClient, inputHostId]);

  // Update player name when it changes
  useEffect(() => {
    const savedName = localStorage.getItem('player_name') || networkManager.playerName || '';
    setPlayerName(savedName);

    const handleNameChange = (e: CustomEvent) => {
      setPlayerName(e.detail || '');
    };

    window.addEventListener('player-name-changed', handleNameChange as EventListener);

    return () => {
      window.removeEventListener('player-name-changed', handleNameChange as EventListener);
    };
  }, [networkManager]);

  // Apply audio settings when they change
  useEffect(() => {
    if (gameClient.audioManager) {
      gameClient.audioManager.setBgmVolume(bgmVolume / 100);
      gameClient.audioManager.setSfxVolume(sfxVolume / 100);
    }
  }, [bgmVolume, sfxVolume, gameClient.audioManager]);

  // Reset autoFocus when activeTab changes or component unmounts
  useEffect(() => {
    if (activeTab !== 'settings') {
      setAutoFocusNameInput(false);
    }
  }, [activeTab]);

  const handleHostGame = async () => {
    networkManager.hostGame();
    setIsHosting(true);
    setConnectionStatus('Hosting game...');

    try {
      const mapConfig = await MapLoader.loadMap('/maps/default_map.json');
      const server = new GameServer(networkManager, mapConfig);
      server.start();

      // Join as client
      gameClient.joinGame(networkManager.peerId);
    } catch (e) {
      console.error('Failed to start server:', e);
      setConnectionStatus('Error starting server');
    }
  };

  const handleJoinGame = (hostIdToJoin: string) => {
    setInputHostId(hostIdToJoin);
    networkManager.joinGame(hostIdToJoin);
    setConnectionStatus('Connecting...');
  };

  const handleBgmVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setBgmVolume(value);
  };

  const handleSfxVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setSfxVolume(value);
  };

  // Check if player name is saved
  const hasPlayerName = playerName && playerName.trim().length > 0;

  // Render the settings content
  const renderSettingsContent = () => (
    <div className={styles.menuContent}>
      <h2 className={styles.contentTitle}>Settings</h2>

      <div className={styles.settingsSection}>
        <h3 className={styles.settingsSectionTitle}>Player</h3>
        <PlayerNameInput 
          networkManager={networkManager} 
          autoFocus={autoFocusNameInput} 
        />
      </div>

      <div className={styles.settingsSection}>
        <h3 className={styles.settingsSectionTitle}>Audio</h3>
        <div className={styles.audioControl}>
          <label className={styles.audioLabel}>Music Volume:</label>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={bgmVolume} 
            onChange={handleBgmVolumeChange}
            className={styles.audioSlider}
            ref={bgmVolumeRef}
          />
          <span className={styles.audioValue}>{bgmVolume}%</span>
        </div>
        <div className={styles.audioControl}>
          <label className={styles.audioLabel}>SFX Volume:</label>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={sfxVolume} 
            onChange={handleSfxVolumeChange}
            className={styles.audioSlider}
            ref={sfxVolumeRef}
          />
          <span className={styles.audioValue}>{sfxVolume}%</span>
        </div>
      </div>

      <button 
        onClick={() => setActiveTab('main')} 
        className={styles.backButton}
      >
        Back to Menu
      </button>
    </div>
  );

  // Render the credits content
  const renderCreditsContent = () => (
    <div className={styles.menuContent}>
      <h2 className={styles.contentTitle}>Credits</h2>

      <div className={styles.creditsSection}>
        <div className={styles.creditItem}>
          <div className={styles.creditName}>Orkun ÇAKILKAYA</div>
          <div className={styles.creditEmail}>orkuncakilkaya@gmail.com</div>
        </div>

        <div className={styles.creditItem}>
          <div className={styles.creditName}>Selim DOYRANLI</div>
          <div className={styles.creditEmail}>selimdoyranli@gmail.com</div>
        </div>
      </div>

      <button 
        onClick={() => setActiveTab('main')} 
        className={styles.backButton}
      >
        Back to Menu
      </button>
    </div>
  );

  // Render the host menu
  const renderHostMenu = () => (
    <div className={styles.menuOverlay}>
      <div className={styles.menuDialog}>
        <h2 className={styles.dialogTitle}>Host Game</h2>
        <p>Click ID to copy peer ID</p>
        <input
          type="text"
          value={hostId}
          readOnly
          onClick={() => navigator.clipboard.writeText(hostId)}
          className={styles.hostIdInput}
        />
        <button 
          onClick={handleHostGame} 
          className={styles.hostButton}
        >
          Start Game
        </button>
        <button 
          onClick={() => setShowHostMenu(false)} 
          className={styles.backButton}
        >
          Cancel
        </button>
      </div>
    </div>
  );

  // Render the join menu
  const renderJoinMenu = () => (
    <div className={styles.menuOverlay}>
      <div className={styles.menuDialog}>
        <h2 className={styles.dialogTitle}>Join Game</h2>
        <input
          type="text"
          value={inputHostId}
          onChange={(e) => setInputHostId(e.target.value.replace(/\s/g, ''))}
          placeholder="Enter Host ID"
          className={styles.joinInput}
        />
        <button 
          onClick={() => handleJoinGame(inputHostId)} 
          className={styles.joinButton}
          disabled={!inputHostId.trim()}
        >
          Join Game
        </button>
        <button 
          onClick={() => setShowJoinMenu(false)} 
          className={styles.backButton}
        >
          Cancel
        </button>
      </div>
    </div>
  );

  // Render the main content
  const renderContent = () => {
    if (isHosting) {
      return <LobbyControls hostId={hostId} />;
    }

    switch (activeTab) {
      case 'settings':
        return renderSettingsContent();
      case 'credits':
        return renderCreditsContent();
      default:
        return (
          <div className={styles.mainMenu}>
            <div className={styles.menuButtons}>
              <div style={{ marginBottom: '20px' }}>
                <PlayerNameInput 
                  networkManager={networkManager} 
                  autoFocus={autoFocusNameInput} 
                />
              </div>

              <div className={!hasPlayerName ? styles.tooltipWrapper : ''}>
                <button 
                  onClick={() => setShowHostMenu(true)} 
                  className={`${styles.mainMenuButton} ${!hasPlayerName ? styles.disabledButton : ''}`}
                  disabled={!hasPlayerName || !isNetworkReady}
                >
                  Host Game
                  {!hasPlayerName && (
                    <div className={styles.buttonAlert}>
                      ⚠️
                    </div>
                  )}
                </button>
                {!hasPlayerName && <span className={styles.tooltip}>Please set playername before</span>}
              </div>

              <div className={!hasPlayerName ? styles.tooltipWrapper : ''}>
                <button 
                  onClick={() => setShowJoinMenu(true)} 
                  className={`${styles.mainMenuButton} ${!hasPlayerName ? styles.disabledButton : ''}`}
                  disabled={!hasPlayerName || !isNetworkReady}
                >
                  Join Game
                  {!hasPlayerName && (
                    <div className={styles.buttonAlert}>
                      ⚠️
                    </div>
                  )}
                </button>
                {!hasPlayerName && <span className={styles.tooltip}>Please set playername before</span>}
              </div>

              <button 
                onClick={() => setActiveTab('settings')} 
                className={styles.mainMenuButton}
              >
                Settings
              </button>

              <button 
                onClick={() => setActiveTab('credits')} 
                className={styles.mainMenuButton}
              >
                Credits
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={styles.menuContainer}>
      <div className={styles.menu}>
        {renderContent()}
      </div>
      {showHostMenu && renderHostMenu()}
      {showJoinMenu && renderJoinMenu()}
    </div>
  );
}
