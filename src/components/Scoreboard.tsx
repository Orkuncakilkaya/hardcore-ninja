import { Modal, Table, Button, Group, Stack } from '@mantine/core';
import type { GameState } from '../common/types';
import { GameMode } from '../common/constants';
import styles from './Scoreboard.module.css';

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
      className={player.id === localPlayerId ? styles.localPlayerRow : styles.playerRow}
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
      classNames={{
        root: styles.modalRoot,
        overlay: styles.modalOverlay,
        inner: styles.modalInner,
        content: styles.modalContent,
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
                className={styles.actionButton}
              >
                Start Game
              </Button>
            )}
            {showRestartButton && (
              <Button 
                color="red"
                onClick={onRestartGame}
                className={styles.actionButton}
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

