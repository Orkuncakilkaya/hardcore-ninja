import { Text, Paper } from '@mantine/core';
import type { GameState } from '../common/types';
import { GameMode } from '../common/constants';
import styles from './GameModeDisplay.module.css';

interface GameModeDisplayProps {
  gameState: GameState | null;
  visible: boolean;
}

export default function GameModeDisplay({ gameState, visible }: GameModeDisplayProps) {
  if (!gameState || !visible) {
    return null;
  }

  let modeText = '';

  switch (gameState.gameMode) {
    case GameMode.WARMUP:
      modeText = 'Warmup';
      break;
    case GameMode.FREEZE_TIME:
      // Calculate remaining seconds in freeze time
      if (gameState.freezeTimeEnd) {
        const now = Date.now();
        const remainingMs = Math.max(0, gameState.freezeTimeEnd - now);
        const remainingSeconds = Math.ceil(remainingMs / 1000);
        modeText = `Round ${gameState.currentRound}/${gameState.totalRounds} - Freeze Time (${remainingSeconds}s)`;
      } else {
        modeText = `Round ${gameState.currentRound}/${gameState.totalRounds} - Freeze Time`;
      }
      break;
    case GameMode.ROUND:
      modeText = `Round ${gameState.currentRound}/${gameState.totalRounds}`;
      break;
    case GameMode.ROUND_END:
      // Show who won the round
      if (gameState.roundWinnerId) {
        const winner = gameState.players.find(p => p.id === gameState.roundWinnerId);
        if (winner) {
          // Calculate remaining seconds in round end
          if (gameState.freezeTimeEnd) {
            const now = Date.now();
            const remainingMs = Math.max(0, gameState.freezeTimeEnd - now);
            const remainingSeconds = Math.ceil(remainingMs / 1000);
            modeText = `Round ${gameState.currentRound - 1}/${gameState.totalRounds} - Player ${winner.username || winner.id.substring(0, 4)} Wins! (${remainingSeconds}s)`;
          } else {
            modeText = `Round ${gameState.currentRound - 1}/${gameState.totalRounds} - Player ${winner.username || winner.id.substring(0, 4)} Wins!`;
          }
        } else {
          modeText = `Round ${gameState.currentRound - 1}/${gameState.totalRounds} - Round End`;
        }
      } else {
        modeText = `Round ${gameState.currentRound - 1}/${gameState.totalRounds} - Round End`;
      }
      break;
    case GameMode.GAME_OVER:
      if (gameState.winnerId) {
        const winner = gameState.players.find(p => p.id === gameState.winnerId);
        modeText = winner ? `Game Over - Player ${winner.username || winner.id.substring(0, 4)} Wins!` : 'Game Over';
      } else {
        modeText = 'Game Over';
      }
      break;
  }

  return (
    <Paper className={styles.gameModeDisplay} p="md" withBorder>
      <Text size="xl" fw={700} ta="center">
        {modeText}
      </Text>
    </Paper>
  );
}

