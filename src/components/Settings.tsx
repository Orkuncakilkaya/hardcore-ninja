import { useState, useEffect } from 'react';
import { 
  Modal, 
  Slider, 
  Text, 
  Title, 
  Stack, 
  Paper,
  Button,
  Group
} from '@mantine/core';
import { AudioManager } from '../client/AudioManager';

interface SettingsProps {
  opened: boolean;
  onClose: () => void;
  audioManager: AudioManager | null;
  variant?: 'modal' | 'inline';
}

export default function Settings({ opened, onClose, audioManager, variant = 'modal' }: SettingsProps) {
  const [bgmVolume, setBgmVolume] = useState(10);
  const [sfxVolume, setSfxVolume] = useState(50);

  // Debug: Log when modal opens/closes
  useEffect(() => {
    console.log('Settings modal opened:', opened);
  }, [opened]);

  // Load current volume settings from audioManager
  useEffect(() => {
    if (audioManager) {
      setBgmVolume(Math.round(audioManager.getBgmVolume() * 100));
      setSfxVolume(Math.round(audioManager.getSfxVolume() * 100));
    }
  }, [audioManager, opened]);

  // Apply volume changes to audioManager
  useEffect(() => {
    if (audioManager) {
      audioManager.setBgmVolume(bgmVolume / 100);
      audioManager.setSfxVolume(sfxVolume / 100);
    }
  }, [bgmVolume, sfxVolume, audioManager]);

  const settingsContent = (
    <Stack gap="md">
      <Title order={2} ta="center">Settings</Title>

      <Paper p="md" withBorder>
        <Stack gap="md">
          <Title order={3} size="h4">Audio</Title>
          
          <Stack gap="xs">
            <Text>Music Volume</Text>
            <Group justify="space-between">
              <Slider 
                value={bgmVolume} 
                onChange={setBgmVolume} 
                min={0} 
                max={100} 
                label={null}
                style={{ flex: 1 }}
              />
              <Text style={{ minWidth: '50px', textAlign: 'right' }}>{bgmVolume}%</Text>
            </Group>
          </Stack>

          <Stack gap="xs">
            <Text>SFX Volume</Text>
            <Group justify="space-between">
              <Slider 
                value={sfxVolume} 
                onChange={setSfxVolume} 
                min={0} 
                max={100} 
                label={null}
                style={{ flex: 1 }}
              />
              <Text style={{ minWidth: '50px', textAlign: 'right' }}>{sfxVolume}%</Text>
            </Group>
          </Stack>
        </Stack>
      </Paper>

      {variant === 'modal' && (
        <Button 
          variant="light" 
          onClick={onClose} 
          fullWidth
        >
          Close
        </Button>
      )}
      {variant === 'inline' && (
        <Button 
          variant="light" 
          onClick={onClose} 
          fullWidth
        >
          Back to Menu
        </Button>
      )}
    </Stack>
  );

  if (variant === 'modal') {
    if (!opened) {
      return null;
    }
    
    return (
      <Modal 
        opened={opened} 
        onClose={onClose} 
        title="Settings"
        centered
        zIndex={10000}
        withinPortal={false}
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
        {settingsContent}
      </Modal>
    );
  }

  return settingsContent;
}

