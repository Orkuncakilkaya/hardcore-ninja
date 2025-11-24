import styles from './Skills.module.css';
import { Button } from '@mantine/core';
import { Icon } from '@iconify/react';
import { SkillType } from '../common/constants';

export default function Skills() {
  const skills = [
    {
      type: SkillType.TELEPORT,
      icon: 'fluent-emoji:cyclone',
      key: 'Q'
    },
    {
      type: SkillType.HOMING_MISSILE,
      icon: 'fluent-emoji:comet',
      key: 'W'
    },
    {
      type: SkillType.LASER_BEAM,
      icon: 'fluent-emoji:water-pistol',
      key: 'E'
    },
    {
      type: SkillType.INVINCIBILITY,
      icon: 'fluent-emoji:shield',
      key: 'R'
    }
  ];
  const getCooldownId = (skillType: SkillType) => {
    switch (skillType) {
      case SkillType.TELEPORT:
        return 'cd-missile';
      case SkillType.HOMING_MISSILE:
        return 'cd-basic';
      case SkillType.LASER_BEAM:
        return 'cd-slash';
      case SkillType.INVINCIBILITY:
        return 'cd-tank';
      default:
        return '';
    }
  };

  return (
    <div id="skills" className={styles.skills}>
      {skills.map((skill) => (
        <Button
          key={skill.type}
          className={styles.skillSlot}
          data-skill={skill.type}
          variant="unstyled"
          size="compact"
          classNames={{
            label: styles.skillLabel
          }}
        >
          <div className={styles.cooldownOverlay} id={getCooldownId(skill.type)} />
          <div className={styles.cooldownText} />
          <Icon icon={skill.icon} className={styles.skillIcon} />
          <span className={styles.skillKey}>{skill.key}</span>
        </Button>
      ))}
    </div>
  );
}

