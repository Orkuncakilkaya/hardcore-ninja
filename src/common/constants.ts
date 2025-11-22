export const TICK_RATE = 32;
export const TICK_INTERVAL = 1 / TICK_RATE;

export const SkillType = {
    TELEPORT: 'TELEPORT',
    HOMING_MISSILE: 'HOMING_MISSILE'
} as const;

export type SkillType = typeof SkillType[keyof typeof SkillType];

export const SKILL_CONFIG = {
    [SkillType.TELEPORT]: {
        cooldown: 5000, // 5 seconds
        range: 10,
        castTime: 0
    },
    [SkillType.HOMING_MISSILE]: {
        cooldown: 5000,
        range: 5,
        duration: 2000, // 3 seconds
        speed: 10,
        damage: 20,
        radius: 20, // Activation radius around player
        mouseRadius: 3 // Target selection radius around mouse
    }
};
