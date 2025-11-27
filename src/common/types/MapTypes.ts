import * as THREE from 'three';

// Define the structure for mesh definitions
export interface MeshDefinition {
  format: 'gltf' | 'obj'; // Support for different 3D model formats
  meshFile: string; // Path to the mesh file
  textures?: {
    color?: string; // Path to color/diffuse texture
    normal?: string; // Path to normal map
    roughness?: string; // Path to roughness map
    displacement?: string; // Path to displacement map
    metalness?: string; // Path to metalness map
    ambient?: string; // Path to ambient occlusion map
  };
  scale?: {
    x: number;
    y: number;
    z: number;
  };
  // Physics properties
  collision?: {
    type: 'box' | 'sphere' | 'mesh'; // Type of collision shape
    dimensions?: { width: number; height: number; depth: number }; // For box collision
    radius?: number; // For sphere collision
    offset?: { x: number; y: number; z: number }; // Offset from model center
  };
  // Material properties (if not using textures)
  material?: {
    color?: number;
    roughness?: number;
    metalness?: number;
  };
}

// Define the structure for entity transforms
export interface EntityTransform {
  id: string; // Unique identifier for this entity instance
  mesh?: string; // Reference to a mesh definition
  entity?: string; // Special entity type (e.g., "spawn")
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation?: {
    x: number;
    y: number;
    z: number;
  };
  scale?: {
    x: number;
    y: number;
    z: number;
  };
  properties?: Record<string, any>; // Additional entity-specific properties
  isPlayableArea?: boolean; // Flag to mark this transform as the playable area
  // playableAreaSize is now calculated from the mesh dimensions
}

// Define the structure for the map configuration
export interface DynamicMapConfig {
  name: string;
  version: string;
  // Dictionary of mesh definitions that can be reused
  meshes: Record<string, MeshDefinition>;
  // Array of entity transforms (instances of meshes in the world)
  transforms: EntityTransform[];
  // Environment settings
  environment?: {
    skybox?: {
      type: 'color' | 'cubemap' | 'hdri';
      value: string | number; // Color hex value or path to cubemap/HDRI
    };
    fog?: {
      color: number;
      near: number;
      far: number;
    };
    lighting?: {
      ambient?: {
        color: number;
        intensity: number;
      };
      directional?: {
        color: number;
        intensity: number;
        position: { x: number; y: number; z: number };
        castShadow: boolean;
      }[];
      point?: {
        color: number;
        intensity: number;
        position: { x: number; y: number; z: number };
        distance: number;
        decay: number;
        castShadow: boolean;
      }[];
    };
  };
}

// Helper function to convert our position format to THREE.Vector3
export function toVector3(position: { x: number; y: number; z: number }): THREE.Vector3 {
  return new THREE.Vector3(position.x, position.y, position.z);
}

// Helper function to convert our rotation format to THREE.Euler
export function toEuler(rotation: { x: number; y: number; z: number }): THREE.Euler {
  return new THREE.Euler(
    rotation.x * (Math.PI / 180), // Convert from degrees to radians
    rotation.y * (Math.PI / 180),
    rotation.z * (Math.PI / 180)
  );
}
