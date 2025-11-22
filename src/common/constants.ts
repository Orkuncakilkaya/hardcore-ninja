export const TICK_RATE = 32;
export const TICK_INTERVAL = 1 / TICK_RATE;

// Game Modes
export const GameMode = {
    WARMUP: 'WARMUP',
    ROUND: 'ROUND',
    FREEZE_TIME: 'FREEZE_TIME',
    ROUND_END: 'ROUND_END',
    GAME_OVER: 'GAME_OVER'
} as const;

export type GameMode = typeof GameMode[keyof typeof GameMode];

// Game Settings
export const GAME_CONFIG = {
    ROUNDS_TO_WIN: 15,
    FREEZE_TIME_DURATION: 5000, // 5 seconds
    ROUND_END_DURATION: 3000, // 3 seconds
    MIN_PLAYERS_TO_START: 2
};

export const SkillType = {
    TELEPORT: 'TELEPORT',
    HOMING_MISSILE: 'HOMING_MISSILE',
    LASER_BEAM: 'LASER_BEAM',
    INVINCIBILITY: 'INVINCIBILITY'
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
        damage: 100,
        radius: 20, // Activation radius around player
        mouseRadius: 3 // Target selection radius around mouse
    },
    [SkillType.LASER_BEAM]: {
        cooldown: 8000, // 8 seconds
        range: 15, // Max beam length
        lifetime: 2000, // Beam stays active for 2 seconds
        damage: 100,
        thickness: 0.3 // Beam cylinder radius
    },
    [SkillType.INVINCIBILITY]: {
        cooldown: 10000, // 10 seconds
        duration: 3000 // 3 seconds of invincibility
    }
};
