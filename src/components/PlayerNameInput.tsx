import { useState, useEffect } from 'react';
import { NetworkManager } from '../network/NetworkManager';
import styles from './PlayerNameInput.module.css';

interface PlayerNameInputProps {
  networkManager: NetworkManager;
}

export default function PlayerNameInput({ networkManager }: PlayerNameInputProps) {
  const [playerName, setPlayerName] = useState('');
  const [isEditing, setIsEditing] = useState(true);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const savedName = localStorage.getItem('player_name');
    if (savedName) {
      setPlayerName(savedName);
      setInputValue(savedName);
      setIsEditing(false);
    }

    const handleNameChange = (e: CustomEvent) => {
      const name = e.detail;
      if (name) {
        setPlayerName(name);
        setIsEditing(false);
      } else {
        setPlayerName('');
        setIsEditing(true);
        setInputValue('');
      }
    };

    window.addEventListener('player-name-changed', handleNameChange as EventListener);

    return () => {
      window.removeEventListener('player-name-changed', handleNameChange as EventListener);
    };
  }, []);

  const handleSave = () => {
    const name = inputValue.trim();
    if (name) {
      networkManager.playerName = name;
    } else {
      alert('Please enter a name');
    }
  };

  const handleReset = () => {
    networkManager.playerName = '';
    setInputValue('');
  };

  if (!isEditing && playerName) {
    return (
      <div className={styles.playerNameDisplay}>
        <span className={styles.playerNameText}>Playing as: {playerName}</span>
        <button onClick={handleReset} className={styles.resetButton}>
          Reset
        </button>
      </div>
    );
  }

  return (
    <div className={styles.playerNameContainer}>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Enter your name"
        maxLength={15}
        className={styles.playerNameInput}
      />
      <button onClick={handleSave} className={styles.saveButton}>
        Save Name
      </button>
    </div>
  );
}

