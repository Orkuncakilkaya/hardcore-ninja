import { useState, useEffect } from 'react';
import { NetworkManager } from '../network/NetworkManager';
import { GameClient } from '../client/GameClient';
import { GameServer } from '../server/GameServer';
import { MapLoader } from '../core/MapLoader';
import styles from './Menu.module.css';
import LobbyControls from './LobbyControls';
import Settings from './Settings';
import { 
  Button, 
  TextInput, 
  Modal, 
  Text, 
  Title, 
  Group, 
  Stack, 
  Paper,
  ActionIcon,
  CopyButton,
  Tooltip,
  rem
} from '@mantine/core';
import { Icon } from '@iconify/react';

interface MenuProps {
  networkManager: NetworkManager;
  gameClient: GameClient;
}

export default function Menu({ networkManager, gameClient }: MenuProps) {
  // Status message shown to the user
  const [statusMessage, setStatusMessage] = useState('Connecting to network...');
  const [isNetworkReady, setIsNetworkReady] = useState(false);
  const [isHosting, setIsHosting] = useState(false);
  const [hostId, setHostId] = useState('');
  const [inputHostId, setInputHostId] = useState('');
  const [activeTab, setActiveTab] = useState('main'); // 'main', 'settings', 'host', 'join', 'credits'
  const [playerName, setPlayerName] = useState('');
  const [showHostMenu, setShowHostMenu] = useState(false);
  const [showJoinMenu, setShowJoinMenu] = useState(false);
  const [showNameEditModal, setShowNameEditModal] = useState(false);
  const [tempName, setTempName] = useState('');


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

  // Render the settings content
  const renderSettingsContent = () => (
    <Settings
      opened={true}
      onClose={() => setActiveTab('main')}
      audioManager={gameClient.getAudioManager()}
      variant="inline"
    />
  );

  // Render the credits content
  const renderCreditsContent = () => (
    <Stack gap="md">
      <Title order={2} ta="center">Credits</Title>

      <Paper p="md" withBorder>
        <Stack gap="md">
          <Stack gap={0}>
            <Text fw={700}>Orkun ÇAKILKAYA</Text>
            <Text size="sm" c="dimmed">orkuncakilkaya@gmail.com</Text>
          </Stack>

          <Stack gap={0}>
            <Text fw={700}>Selim DOYRANLI</Text>
            <Text size="sm" c="dimmed">selimdoyranli@gmail.com</Text>
          </Stack>
        </Stack>
      </Paper>

      <Button 
        variant="light" 
        onClick={() => setActiveTab('main')} 
        fullWidth
      >
        Back to Menu
      </Button>
    </Stack>
  );

  // Render the host menu modal
  const renderHostMenu = () => (
    <Modal 
      opened={showHostMenu} 
      onClose={() => setShowHostMenu(false)} 
      title="Host Game"
      centered
      zIndex={10000}
      withinPortal={false}
      styles={{ root: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' } }}
    >
      <Stack gap="md">
        <Text size="sm">Share this ID with your friends so they can join your game.</Text>
        
        <Group>
          <TextInput 
            value={hostId} 
            readOnly 
            style={{ flex: 1 }}
          />
          <CopyButton value={hostId} timeout={2000}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow position="right">
                <ActionIcon color={copied ? 'teal' : 'gray'} variant="subtle" onClick={copy}>
                  {copied ? <Icon icon="tabler:check" style={{ width: rem(16) }} /> : <Icon icon="tabler:copy" style={{ width: rem(16) }} />}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
        </Group>

        <Group grow>
          <Button variant="default" onClick={() => setShowHostMenu(false)}>
            Cancel
          </Button>
          <Button onClick={handleHostGame}>
            Start Game
          </Button>
        </Group>
      </Stack>
    </Modal>
  );

  // Render the join menu modal
  const renderJoinMenu = () => (
    <Modal 
      opened={showJoinMenu} 
      onClose={() => setShowJoinMenu(false)} 
      title="Join Game"
      centered
      zIndex={10000}
      withinPortal={false}
      styles={{ root: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' } }}
    >
      <Stack gap="md">
        <TextInput
          placeholder="Enter Host ID"
          value={inputHostId}
          onChange={(e) => setInputHostId(e.currentTarget.value.replace(/\s/g, ''))}
          label="Host ID"
        />
        
        <Group grow>
          <Button variant="default" onClick={() => setShowJoinMenu(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleJoinGame(inputHostId)}
            disabled={!inputHostId.trim()}
          >
            Join Game
          </Button>
        </Group>
      </Stack>
    </Modal>
  );

  // Render the name edit modal
  const renderNameEditModal = () => (
    <Modal 
      opened={showNameEditModal} 
      onClose={() => setShowNameEditModal(false)} 
      title="Edit Player Name"
      centered
      zIndex={10000}
      withinPortal={false}
      styles={{ root: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' } }}
    >
      <Stack gap="md">
        <TextInput
          placeholder="Enter Name"
          value={tempName}
          onChange={(e) => setTempName(e.currentTarget.value)}
          maxLength={15}
          data-autofocus
        />
        
        <Group grow>
          <Button variant="default" onClick={() => setShowNameEditModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveName}>
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
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
          <Stack gap="md" styles={{ root: { width: '100%' } }}>
            <Button 
              size="lg"
              onClick={() => setShowHostMenu(true)} 
              disabled={!isNetworkReady}
            >
              Host Game
            </Button>

            <Button 
              size="lg"
              onClick={() => setShowJoinMenu(true)} 
              disabled={!isNetworkReady}
            >
              Join Game
            </Button>

            <Button 
              size="lg"
              variant="light"
              onClick={() => setActiveTab('settings')} 
            >
              Settings
            </Button>

            <Button 
              size="lg"
              variant="light"
              onClick={() => setActiveTab('credits')} 
            >
              Credits
            </Button>
          </Stack>
        );
    }
  };

  return (
    <div className={styles.menuContainer}>
      <Paper 
        h="100%" 
        w={400} 
        p="xl" 
        radius={0} 
        withBorder 
        style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          pointerEvents: 'auto'
        }}
      >
        <Stack align="stretch" gap="xl" styles={{ root: { width: '100%' } }}>
          
          {renderContent()}
          
          {!isNetworkReady && (
            <Text c="dimmed" size="sm" ta="center">
              {statusMessage}
            </Text>
          )}
        </Stack>
      </Paper>
      
      {/* Top Right Name Display */}
      <div className={styles.topRightNameDisplay}>
        <Group gap="xs">
          <Text fw={500}>{playerName}</Text>
          <ActionIcon variant="subtle" size="sm" onClick={handleEditName}>
            <Icon icon="tabler:edit" style={{ width: rem(16) }} />
          </ActionIcon>
        </Group>
      </div>

      {showHostMenu && renderHostMenu()}
      {showJoinMenu && renderJoinMenu()}
      {showNameEditModal && renderNameEditModal()}
    </div>
  );
}
