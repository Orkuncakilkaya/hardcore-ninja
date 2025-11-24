import { useEffect } from 'react';
import { Modal, Table, Button, Group, Title, Stack } from '@mantine/core';
import type { GameState } from '../common/types';
import { GameMode } from '../common/constants';

interface ScoreboardProps {
  opened: boolean;
  onClose: () => void;
  gameState: GameState | null;
  localPlayerId: string | null;
  isHost: boolean;
  onStartGame?: () => void;
  onRestartGame?: () => void;
}

export default function Scoreboard({ 
  opened, 
  onClose, 
  gameState, 
  localPlayerId,
  isHost,
  onStartGame,
  onRestartGame
}: ScoreboardProps) {
  // Debug: Log when modal opens/closes
  useEffect(() => {
    console.log('Scoreboard modal opened:', opened, 'gameState:', gameState);
  }, [opened, gameState]);

  if (!gameState) {
    return null;
  }

  // Sort players by kills (descending)
  const sortedPlayers = [...gameState.players].sort((a, b) => {
    return (b.kills || 0) - (a.kills || 0);
  });

  const rows = sortedPlayers.map((player) => (
    <Table.Tr 
      key={player.id}
      style={{ 
        color: player.id === localPlayerId ? '#4CAF50' : 'white',
        fontWeight: player.id === localPlayerId ? 'bold' : 'normal'
      }}
    >
      <Table.Td>{player.username || player.id.substring(0, 8)}</Table.Td>
      <Table.Td>{player.kills || 0}</Table.Td>
      <Table.Td>{player.deaths || 0}</Table.Td>
      <Table.Td>{player.lastPlayerAlive || 0}</Table.Td>
    </Table.Tr>
  ));

  const showStartButton = isHost && gameState.gameMode === GameMode.WARMUP && gameState.players.length >= 2;
  const showRestartButton = isHost;

  if (!opened) {
    return null;
  }

  return (
    <Modal 
      opened={opened} 
      onClose={onClose} 
      title="Scoreboard"
      centered
      zIndex={10000}
      size="lg"
      withinPortal={false}
      withCloseButton={false}
      styles={{
        root: {
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 10000,
        },
        overlay: {
          zIndex: 9999,
        },
        inner: {
          zIndex: 10000,
        },
        content: {
          zIndex: 10000,
        },
      }}
    >
      <Stack gap="md">
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Player</Table.Th>
              <Table.Th>Kills</Table.Th>
              <Table.Th>Deaths</Table.Th>
              <Table.Th>Last Player Alive</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>

        {(showStartButton || showRestartButton) && (
          <Group justify="space-between" mt="md">
            {showStartButton && (
              <Button 
                color="green"
                onClick={onStartGame}
                style={{ flex: 1 }}
              >
                Start Game
              </Button>
            )}
            {showRestartButton && (
              <Button 
                color="red"
                onClick={onRestartGame}
                style={{ flex: 1 }}
              >
                Restart Game
              </Button>
            )}
          </Group>
        )}
      </Stack>
    </Modal>
  );
}

