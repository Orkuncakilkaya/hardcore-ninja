export const TICK_RATE = 32;
export const TICK_INTERVAL = 1 / TICK_RATE;

export const SkillType = {
    TELEPORT: 'TELEPORT'
} as const;

export type SkillType = typeof SkillType[keyof typeof SkillType];

export const SKILL_CONFIG = {
    [SkillType.TELEPORT]: {
        cooldown: 5000, // 5 seconds
        range: 10,
        castTime: 0
    }
};
