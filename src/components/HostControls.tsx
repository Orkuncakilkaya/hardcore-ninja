import { useState, useEffect } from 'react';
import { NetworkManager } from '../network/NetworkManager';
import PlayerNameInput from './PlayerNameInput';
import styles from './HostControls.module.css';

interface HostControlsProps {
  hostId: string;
  onHost: () => void;
  onJoin: (hostId: string) => void;
  networkManager: NetworkManager;
}

export default function HostControls({ hostId, onHost, onJoin, networkManager }: HostControlsProps) {
  const [inputHostId, setInputHostId] = useState('');
  const [playerName, setPlayerName] = useState(() => {
    // Check both networkManager and localStorage for initial value
    return networkManager.playerName || localStorage.getItem('player_name') || '';
  });

  useEffect(() => {
    // Update from networkManager on mount
    const currentName = networkManager.playerName || localStorage.getItem('player_name') || '';
    setPlayerName(currentName);

    const handleNameChange = (e: CustomEvent) => {
      setPlayerName(e.detail || '');
    };

    window.addEventListener('player-name-changed', handleNameChange as EventListener);

    return () => {
      window.removeEventListener('player-name-changed', handleNameChange as EventListener);
    };
  }, [networkManager]);

  const hasPlayerName = playerName && playerName.trim().length > 0;

  const handleCopyHostId = () => {
    navigator.clipboard.writeText(hostId);
  };

  const handleJoin = () => {
    if (!hasPlayerName) {
      alert('Please enter and save your player name first');
      return;
    }
    if (inputHostId.trim()) {
      onJoin(inputHostId.trim());
    }
  };

  const handleHost = () => {
    if (!hasPlayerName) {
      alert('Please enter and save your player name first');
      return;
    }
    onHost();
  };

  const handleHostIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove spaces from input
    const value = e.target.value.replace(/\s/g, '');
    setInputHostId(value);
  };

  return (
    <div className={styles.hostControls}>
      <PlayerNameInput networkManager={networkManager} />
      <p>Click ID to copy peer ID</p>
      <input
        type="text"
        value={hostId}
        readOnly
        onClick={handleCopyHostId}
        className={styles.hostIdInput}
      />
      <button 
        onClick={handleHost} 
        className={styles.hostButton}
        disabled={!hasPlayerName}
      >
        Host Game
      </button>
      <div className={styles.divider}>OR</div>
      <input
        type="text"
        value={inputHostId}
        onChange={handleHostIdChange}
        placeholder="Enter Host ID"
        className={styles.joinInput}
      />
      <button 
        onClick={handleJoin} 
        className={styles.joinButton}
        disabled={!hasPlayerName || !inputHostId.trim()}
      >
        Join Game
      </button>
    </div>
  );
}

