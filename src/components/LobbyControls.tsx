import styles from './LobbyControls.module.css';

interface LobbyControlsProps {
  hostId: string;
}

export default function LobbyControls({ hostId }: LobbyControlsProps) {
  return (
    <div className={styles.lobbyControls}>
      <div className={styles.myIdDisplay}>Hosting on ID: {hostId}</div>
      <div>Waiting for players...</div>
    </div>
  );
}

