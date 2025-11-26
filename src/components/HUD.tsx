import { memo } from 'react';
import Skills from './Skills';
import styles from './HUD.module.css';

function HUD() {
  return (
    <div id="hud" className={styles.hud}>
      <Skills />
    </div>
  );
}

export default memo(HUD);

