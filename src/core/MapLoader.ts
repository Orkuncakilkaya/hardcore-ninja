import * as THREE from 'three';

export interface Vector3Config {
    x: number;
    y: number;
    z: number;
}

export interface Vector2Config {
    x: number;
    y: number;
}

export interface DimensionsConfig {
    width: number;
    height: number;
    depth: number;
}

export interface PlayableAreaConfig {
    size: number;
    wallThickness: number;
    wallHeight: number;
}

export interface WallConfig {
    id: string;
    position: Vector3Config;
    dimensions: DimensionsConfig;
    color: number;
}

export interface BoxConfig {
    id: string;
    position: Vector3Config;
    dimensions: DimensionsConfig;
    color: number;
}

export interface MapConfig {
    name: string;
    version: string;
    playableArea: PlayableAreaConfig;
    spawnPoints: Vector2Config[];
    walls: WallConfig[];
    boxes: BoxConfig[];
}

export class MapLoader {
    /**
     * Load a map configuration from a JSON file
     * @param path Path to the JSON map file (relative to public folder)
     * @returns Promise resolving to MapConfig
     */
    public static async loadMap(path: string): Promise<MapConfig> {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load map: ${response.statusText}`);
            }
            const data = await response.json();

            // Validate the map data
            MapLoader.validateMapConfig(data);

            return data as MapConfig;
        } catch (error) {
            console.error('Error loading map:', error);
            throw error;
        }
    }

    /**
     * Validate map configuration structure
     * @param data Map data to validate
     */
    private static validateMapConfig(data: any): void {
        if (!data.name || typeof data.name !== 'string') {
            throw new Error('Map must have a valid name');
        }

        if (!data.playableArea || typeof data.playableArea.size !== 'number') {
            throw new Error('Map must have a valid playableArea with size');
        }

        if (!Array.isArray(data.spawnPoints) || data.spawnPoints.length === 0) {
            throw new Error('Map must have at least one spawn point');
        }

        if (!Array.isArray(data.walls)) {
            throw new Error('Map must have walls array');
        }

        if (!Array.isArray(data.boxes)) {
            throw new Error('Map must have boxes array');
        }

        // Validate spawn points
        data.spawnPoints.forEach((sp: any, index: number) => {
            if (typeof sp.x !== 'number' || typeof sp.y !== 'number') {
                throw new Error(`Spawn point ${index} must have x and y coordinates`);
            }
        });

        // Validate walls
        data.walls.forEach((wall: any, index: number) => {
            if (!wall.id || !wall.position || !wall.dimensions) {
                throw new Error(`Wall ${index} is missing required properties`);
            }
        });

        // Validate boxes
        data.boxes.forEach((box: any, index: number) => {
            if (!box.id || !box.position || !box.dimensions) {
                throw new Error(`Box ${index} is missing required properties`);
            }
        });
    }

    /**
     * Convert Vector3Config to THREE.Vector3
     */
    public static toVector3(config: Vector3Config): THREE.Vector3 {
        return new THREE.Vector3(config.x, config.y, config.z);
    }

    /**
     * Convert Vector2Config to THREE.Vector2
     */
    public static toVector2(config: Vector2Config): THREE.Vector2 {
        return new THREE.Vector2(config.x, config.y);
    }
}
