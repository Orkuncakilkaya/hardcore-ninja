import { useState, useEffect } from 'react';
import { Modal, Slider, Text, Title, Stack, Paper, Button, Group } from '@mantine/core';
import { AudioManager } from '../client/AudioManager';
import styles from './Settings.module.css';

interface SettingsProps {
  opened: boolean;
  onClose: () => void;
  audioManager: AudioManager | null;
  variant?: 'modal' | 'inline';
  onExitGame?: () => void;
}

export default function Settings({
  opened,
  onClose,
  audioManager,
  variant = 'modal',
  onExitGame,
}: SettingsProps) {
  const [bgmVolume, setBgmVolume] = useState(() =>
    audioManager ? Math.round(audioManager.getBgmVolume() * 100) : 100
  );
  const [sfxVolume, setSfxVolume] = useState(() =>
    audioManager ? Math.round(audioManager.getSfxVolume() * 100) : 100
  );

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
      <Title order={2} ta="center">
        Settings
      </Title>

      <Paper p="md" withBorder>
        <Stack gap="md">
          <Title order={3} size="h4">
            Audio
          </Title>

          <Stack gap="xs">
            <Text>Music Volume</Text>
            <Group justify="space-between">
              <Slider
                value={bgmVolume}
                onChange={setBgmVolume}
                min={0}
                max={100}
                label={null}
                className={styles.slider}
                style={{ flex: 1 }}
              />
              <Text className={styles.volumeText} w={40} ta="right">
                {bgmVolume}%
              </Text>
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
                className={styles.slider}
                style={{ flex: 1 }}
              />
              <Text className={styles.volumeText} w={40} ta="right">
                {sfxVolume}%
              </Text>
            </Group>
          </Stack>
        </Stack>
      </Paper>

      {variant === 'modal' && (
        <Stack gap="sm">
          {onExitGame && (
            <Button variant="filled" color="red" onClick={onExitGame} fullWidth>
              Exit Game
            </Button>
          )}
          <Button variant="light" onClick={onClose} fullWidth>
            Close
          </Button>
        </Stack>
      )}
      {variant === 'inline' && (
        <Button variant="light" onClick={onClose} fullWidth>
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
        classNames={{
          root: styles.modalRoot,
          overlay: styles.modalOverlay,
          inner: styles.modalInner,
          content: styles.modalContent,
        }}
      >
        {settingsContent}
      </Modal>
    );
  }

  return settingsContent;
}
