import styles from './Skills.module.css';

export default function Skills() {
  return (
    <div id="skills" className={styles.skills}>
      <div className={styles.skillSlot} data-skill="teleport">
        <div className={styles.skillIcon}>🌀</div>
        <div className={styles.skillKey}>Q</div>
        <div id="cd-missile" className={styles.cooldownOverlay}></div>
        <div className={styles.cooldownText}></div>
      </div>
      <div className={styles.skillSlot} data-skill="missile">
        <div className={styles.skillIcon}>🚀</div>
        <div className={styles.skillKey}>W</div>
        <div id="cd-basic" className={styles.cooldownOverlay}></div>
        <div className={styles.cooldownText}></div>
      </div>
      <div className={styles.skillSlot} data-skill="laser">
        <div className={styles.skillIcon}>🔫</div>
        <div className={styles.skillKey}>E</div>
        <div id="cd-slash" className={styles.cooldownOverlay}></div>
        <div className={styles.cooldownText}></div>
      </div>
      <div className={styles.skillSlot} data-skill="invincibility">
        <div className={styles.skillIcon}>🛡️</div>
        <div className={styles.skillKey}>R</div>
        <div id="cd-tank" className={styles.cooldownOverlay}></div>
        <div className={styles.cooldownText}></div>
      </div>
    </div>
  );
}

