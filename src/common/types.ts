

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
}

export interface GameState {
    players: PlayerState[];
    // Add other entities here (missiles, etc.)
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
