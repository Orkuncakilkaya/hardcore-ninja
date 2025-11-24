import { useState, useEffect, useRef } from 'react';
import { NetworkManager } from '../network/NetworkManager';
import { GameClient } from '../client/GameClient';
import { GameServer } from '../server/GameServer';
import { MapLoader } from '../core/MapLoader';
import styles from './Menu.module.css';
import LobbyControls from './LobbyControls';


interface MenuProps {
  networkManager: NetworkManager;
  gameClient: GameClient;
}

export default function Menu({ networkManager, gameClient }: MenuProps) {
  const [statusMessage, setStatusMessage] = useState('Connecting to network...');
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
  const [showNameEditModal, setShowNameEditModal] = useState(false);
  const [tempName, setTempName] = useState('');


  const bgmVolumeRef = useRef<HTMLInputElement>(null);
  const sfxVolumeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleNetworkReady = (_e: CustomEvent) => {
      setStatusMessage('Network Ready!');
      setIsNetworkReady(true);
      setHostId(networkManager.peerId);
    };

    const handleConnected = (_e: CustomEvent) => {
      if (!networkManager.isHost) {
        setStatusMessage('Connected! Joining game...');
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
    const audioManager = gameClient.getAudioManager();
    if (audioManager) {
      audioManager.setBgmVolume(bgmVolume / 100);
      audioManager.setSfxVolume(sfxVolume / 100);
    }
  }, [bgmVolume, sfxVolume, gameClient]);



  const handleHostGame = async () => {
    networkManager.hostGame();
    setIsHosting(true);
    setStatusMessage('Hosting game...');

    try {
      const mapConfig = await MapLoader.loadMap('/maps/default_map.json');
      const server = new GameServer(networkManager, mapConfig);
      server.start();

      // Join as client
      gameClient.joinGame(networkManager.peerId);
    } catch (e) {
      console.error('Failed to start server:', e);
      setStatusMessage('Error starting server');
    }
  };

  const handleJoinGame = (hostIdToJoin: string) => {
    setInputHostId(hostIdToJoin);
    networkManager.joinGame(hostIdToJoin);
    setStatusMessage('Connecting...');
  };

  const handleBgmVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setBgmVolume(value);
  };

  const handleSfxVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setSfxVolume(value);
  };

  const handleEditName = () => {
    setTempName(playerName);
    setShowNameEditModal(true);
  };

  const handleSaveName = () => {
    if (tempName.trim()) {
      networkManager.playerName = tempName.trim();
      setShowNameEditModal(false);
    }
  };

  const handleCancelEdit = () => {
    setShowNameEditModal(false);
  };

  // Render the settings content
  const renderSettingsContent = () => (
    <div className={styles.menuContent}>
      <h2 className={styles.contentTitle}>Settings</h2>



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

  // Render the name edit modal
  const renderNameEditModal = () => (
    <div className={styles.modalOverlay}>
      <div className={styles.modalDialog}>
        <h2 className={styles.modalTitle}>Edit Player Name</h2>
        <input
          type="text"
          value={tempName}
          onChange={(e) => setTempName(e.target.value)}
          placeholder="Enter Name"
          maxLength={15}
          className={styles.modalInput}
          autoFocus
        />
        <div className={styles.modalButtons}>
          <button 
            onClick={handleSaveName} 
            className={styles.saveButton}
          >
            Save
          </button>
          <button 
            onClick={handleCancelEdit} 
            className={styles.cancelButton}
          >
            Cancel
          </button>
        </div>
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
              <button 
                onClick={() => setShowHostMenu(true)} 
                className={styles.mainMenuButton}
                disabled={!isNetworkReady}
              >
                Host Game
              </button>

              <button 
                onClick={() => setShowJoinMenu(true)} 
                className={styles.mainMenuButton}
                disabled={!isNetworkReady}
              >
                Join Game
              </button>

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
        {!isNetworkReady && (
          <div className={styles.statusMessage}>
            {statusMessage}
          </div>
        )}
      </div>
      
      {/* Top Right Name Display */}
      <div className={styles.topRightNameDisplay}>
        <span className={styles.playerNameText}>{playerName}</span>
        <button onClick={handleEditName} className={styles.editNameButton} title="Edit Name">
          ✏️
        </button>
      </div>

      {showHostMenu && renderHostMenu()}
      {showJoinMenu && renderJoinMenu()}
      {showNameEditModal && renderNameEditModal()}
    </div>
  );
}
