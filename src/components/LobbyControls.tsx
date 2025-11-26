import { Paper, Text, Stack, Loader, Group, ThemeIcon, rem } from '@mantine/core';
import { Icon } from '@iconify/react';

interface LobbyControlsProps {
  hostId: string;
}

export default function LobbyControls({ hostId }: LobbyControlsProps) {
  return (
    <Paper p="xl" withBorder w="100%">
      <Stack align="center" gap="lg">
        <ThemeIcon size={60} radius="md" variant="light">
          <Icon icon="tabler:server" style={{ width: rem(32), height: rem(32) }} />
        </ThemeIcon>
        
        <Stack gap="xs" align="center">
          <Text size="sm" c="dimmed">Hosting on ID</Text>
          <Text size="xl" fw={700} ff="monospace">{hostId}</Text>
        </Stack>

        <Group gap="xs">
          <Loader size="sm" type="dots" />
          <Text size="sm">Waiting for players...</Text>
        </Group>
      </Stack>
    </Paper>
  );
}

