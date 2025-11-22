

export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export interface Vector2 {
    x: number;
    y: number;
}

export interface Quaternion {
    x: number;
    y: number;
    z: number;
    w: number;
}

export interface PlayerState {
    id: string;
    position: Vector3;
    rotation: Quaternion;
    health: number;
    maxHealth: number;
    isInvulnerable: boolean;
    isMoving: boolean;
    teleportCooldown: number;
    isTeleporting: boolean;
    homingMissileCooldown: number;
    laserBeamCooldown: number;
    invincibilityCooldown: number;
    isDead: boolean;
}

export interface MissileState {
    id: string;
    position: Vector3;
    rotation: Quaternion;
    targetId: string | null; // ID of the player being targeted, or null if directional
}

export interface LaserBeamState {
    id: string;
    ownerId: string; // Shooter player ID (for preventing self-damage)
    startPosition: Vector3;
    endPosition: Vector3;
    expiresAt: number; // Timestamp when beam disappears
}

export interface GameState {
    players: PlayerState[];
    missiles: MissileState[];
    laserBeams: LaserBeamState[];
    timestamp: number;
}

export interface MapConfig {
    name: string;
    version: string;
    playableArea: {
        size: number;
    };
    spawnPoints: Vector3[];
    walls: {
        id: string;
        position: Vector3;
        dimensions: { width: number, height: number, depth: number };
        color: number;
    }[];
    boxes: {
        id: string;
        position: Vector3;
        dimensions: { width: number, height: number, depth: number };
        color: number;
    }[];
}

export interface InputState {
    keys: { [key: string]: boolean };
    mouse: { x: number, y: number, z: number, isMouseLeftDown?: boolean } | null;
}
