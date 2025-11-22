import styles from './Skills.module.css';

export default function Skills() {
  return (
    <div id="skills" className={styles.skills}>
      <div className={styles.skillSlot}>
        Q
        <div id="cd-missile" className={styles.cooldownOverlay}></div>
      </div>
      <div className={styles.skillSlot}>
        W
        <div id="cd-basic" className={styles.cooldownOverlay}></div>
      </div>
      <div className={styles.skillSlot}>
        E
        <div id="cd-slash" className={styles.cooldownOverlay}></div>
      </div>
      <div className={styles.skillSlot}>
        R
        <div id="cd-tank" className={styles.cooldownOverlay}></div>
      </div>
      <div className={styles.skillSlot}>
        SPC
        <div id="cd-ult" className={styles.cooldownOverlay}></div>
      </div>
    </div>
  );
}

