import Skills from './Skills';
import styles from './HUD.module.css';

export default function HUD() {
  return (
    <div id="hud" className={styles.hud}>
      <Skills />
    </div>
  );
}

