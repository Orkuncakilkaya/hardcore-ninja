import React from 'react';
import { Modal, Button, Text, Stack } from '@mantine/core';

interface HostDisconnectedModalProps {
  opened: boolean;
  onExit: () => void;
}

export const HostDisconnectedModal: React.FC<HostDisconnectedModalProps> = ({ opened, onExit }) => {
  return (
    <Modal
      opened={opened}
      onClose={() => {}} // Prevent closing by clicking outside or escape
      title="Game Ended"
      centered
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
      zIndex={10000}
      withinPortal={false}
      overlayProps={{
        backgroundOpacity: 0.55,
        blur: 3,
      }}
    >
      <Stack>
        <Text>The host has ended the game.</Text>
        <Button color="red" onClick={onExit} fullWidth>
          Exit Game
        </Button>
      </Stack>
    </Modal>
  );
};
