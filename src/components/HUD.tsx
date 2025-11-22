import Skills from './Skills';
import styles from './HUD.module.css';

export default function HUD() {
  return (
    <div id="hud" className={styles.hud}>
      <div id="health-bar-container" className={styles.healthBarContainer}>
        <div id="health-bar" className={styles.healthBar}></div>
        <span className={styles.healthBarText}>Health</span>
      </div>
      <Skills />
    </div>
  );
}

