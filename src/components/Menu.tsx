import { useState, useEffect } from 'react';
import { NetworkManager } from '../network/NetworkManager';
import { GameClient } from '../client/GameClient';
import { GameServer } from '../server/GameServer';
import { MapLoader } from '../core/MapLoader';
import styles from './Menu.module.css';
import HostControls from './HostControls';
import LobbyControls from './LobbyControls';

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

  return (
    <div className={styles.menu}>
      <h1>Hardcore Ninja</h1>
      <div className={styles.connectionStatus}>{connectionStatus}</div>
      {isNetworkReady && !isHosting && (
        <HostControls
          hostId={hostId}
          onHost={handleHostGame}
          onJoin={handleJoinGame}
          networkManager={networkManager}
        />
      )}
      {isHosting && (
        <LobbyControls hostId={hostId} />
      )}
    </div>
  );
}

