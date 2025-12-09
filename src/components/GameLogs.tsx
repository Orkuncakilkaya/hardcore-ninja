import React from 'react';
import { Stack, Text, Box } from '@mantine/core';
import styles from './GameLogs.module.css';

interface GameLogsProps {
  logs: { id: number; message: string }[];
}

const GameLogs: React.FC<GameLogsProps> = ({ logs }) => {
  return (
    <Box className={styles.gameLogs}>
      <Stack gap="xs">
        {logs.map(log => (
          <Text
            key={log.id}
            c="white"
            size="sm"
            style={{ textShadow: '1px 1px 2px black' }}
            className={styles.logEntry}
          >
            {log.message}
          </Text>
        ))}
      </Stack>
    </Box>
  );
};

export default GameLogs;
