import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import {
  type DynamicMapConfig,
  type EntityTransform,
  type MeshDefinition,
  toVector3,
  toEuler,
} from '../common/types/MapTypes';
import { type MapConfig } from '../common/types';

// Class to handle loading and parsing dynamic map files
export class DynamicMapLoader {
  private static gltfLoader: GLTFLoader;
  private static objLoader: OBJLoader;
  private static textureLoader: THREE.TextureLoader;
  private static loadedModels: Map<string, THREE.Group> = new Map();
  private static loadedTextures: Map<string, THREE.Texture> = new Map();

  /**
   * Initialize loaders
   */
  private static initLoaders() {
    if (!this.gltfLoader) {
      this.gltfLoader = new GLTFLoader();
    }
    if (!this.objLoader) {
      this.objLoader = new OBJLoader();
    }
    if (!this.textureLoader) {
      this.textureLoader = new THREE.TextureLoader();
    }
  }

  /**
   * Load a dynamic map configuration from a JSON file
   * @param path Path to the JSON map file (relative to public folder)
   * @param onProgress Optional callback for loading progress
   * @returns Promise resolving to DynamicMapConfig
   */
  public static async loadMap(
    path: string,
    onProgress?: (progress: number) => void
  ): Promise<DynamicMapConfig> {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load map: ${response.statusText}`);
      }
      const data = await response.json();

      // Validate the map data
      this.validateMapConfig(data);

      if (onProgress) {
        onProgress(0.1); // 10% progress after loading JSON
      }

      return data as DynamicMapConfig;
    } catch (error) {
      console.error('Error loading map:', error);
      throw error;
    }
  }

  /**
   * Validate dynamic map configuration structure
   * @param data Map data to validate
   */
  private static validateMapConfig(data: Partial<DynamicMapConfig>): void {
    if (!data.name || typeof data.name !== 'string') {
      throw new Error('Map must have a valid name');
    }

    if (!data.meshes || typeof data.meshes !== 'object') {
      throw new Error('Map must have a valid meshes dictionary');
    }

    if (!Array.isArray(data.transforms) || data.transforms.length === 0) {
      throw new Error('Map must have at least one transform');
    }

    // Check for a playable area transform
    const playableAreaTransform = data.transforms.find(t => t.isPlayableArea === true);
    if (!playableAreaTransform) {
      throw new Error('Map must have a transform marked as playable area (isPlayableArea: true)');
    }

    // playableAreaSize is now calculated from the mesh dimensions

    // Validate transforms
    data.transforms.forEach((transform: Partial<EntityTransform>, index: number) => {
      if (!transform.id) {
        throw new Error(`Transform ${index} must have an id`);
      }

      if (
        !transform.position ||
        typeof transform.position.x !== 'number' ||
        typeof transform.position.y !== 'number' ||
        typeof transform.position.z !== 'number'
      ) {
        throw new Error(`Transform ${transform.id} must have a valid position`);
      }

      // If it's not a special entity, it must reference a valid mesh
      if (
        !transform.entity &&
        (!transform.mesh || !data.meshes || !data.meshes[transform.mesh as string])
      ) {
        throw new Error(
          `Transform ${transform.id} must reference a valid mesh or be a special entity`
        );
      }
    });

    // Validate meshes
    Object.entries(data.meshes).forEach(([key, mesh]: [string, Partial<MeshDefinition>]) => {
      if (!mesh.format || !['gltf', 'obj'].includes(mesh.format)) {
        throw new Error(`Mesh ${key} must have a valid format (gltf or obj)`);
      }

      if (!mesh.meshFile || typeof mesh.meshFile !== 'string') {
        throw new Error(`Mesh ${key} must have a valid meshFile path`);
      }
    });
  }

  /**
   * Load all 3D models and textures defined in the map
   * @param mapConfig The map configuration
   * @param onProgress Optional callback for loading progress
   * @returns Promise resolving when all assets are loaded
   */
  public static async loadAssets(
    mapConfig: DynamicMapConfig,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    this.initLoaders();

    // Clear previously loaded assets
    this.loadedModels.clear();
    this.loadedTextures.clear();

    const meshEntries = Object.entries(mapConfig.meshes);
    const totalAssets = meshEntries.length;
    let loadedAssets = 0;

    // Load all meshes and their textures
    const loadPromises = meshEntries.map(async ([meshId, meshDef]) => {
      try {
        // Load the 3D model
        const model = await this.loadModel(meshDef);
        this.loadedModels.set(meshId, model);

        // Load textures if defined
        if (meshDef.textures) {
          await this.loadTextures(meshDef.textures);
        }

        loadedAssets++;
        if (onProgress) {
          // Progress from 10% to 90% during asset loading
          const progress = 0.1 + (loadedAssets / totalAssets) * 0.8;
          onProgress(progress);
        }
      } catch (error) {
        console.error(`Error loading mesh ${meshId}:`, error);
        throw error;
      }
    });

    await Promise.all(loadPromises);

    if (onProgress) {
      onProgress(1.0); // 100% progress when all assets are loaded
    }
  }

  /**
   * Load a 3D model based on its format
   * @param meshDef The mesh definition
   * @returns Promise resolving to the loaded model
   */
  private static loadModel(meshDef: MeshDefinition): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      const loadPath = meshDef.meshFile;

      if (meshDef.format === 'gltf') {
        this.gltfLoader.load(
          loadPath,
          gltf => {
            const model = gltf.scene;

            // Apply scale if defined
            if (meshDef.scale) {
              model.scale.set(meshDef.scale.x, meshDef.scale.y, meshDef.scale.z);
            }

            // Enable shadows for all meshes in the model
            model.traverse(child => {
              if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            resolve(model);
          },
          undefined,
          error => {
            console.error('Error loading GLTF model:', error);
            reject(error);
          }
        );
      } else if (meshDef.format === 'obj') {
        this.objLoader.load(
          loadPath,
          obj => {
            // Apply scale if defined
            if (meshDef.scale) {
              obj.scale.set(meshDef.scale.x, meshDef.scale.y, meshDef.scale.z);
            }

            // Enable shadows for all meshes in the model
            obj.traverse(child => {
              if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                // Apply material properties if defined
                if (meshDef.material) {
                  const material = new THREE.MeshStandardMaterial({
                    color: meshDef.material.color,
                    roughness: meshDef.material.roughness,
                    metalness: meshDef.material.metalness,
                  });
                  child.material = material;
                }
              }
            });

            resolve(obj);
          },
          undefined,
          error => {
            console.error('Error loading OBJ model:', error);
            reject(error);
          }
        );
      } else {
        reject(new Error(`Unsupported model format: ${meshDef.format}`));
      }
    });
  }

  /**
   * Load textures for a mesh
   * @param textures The texture definitions
   * @returns Promise resolving when all textures are loaded
   */
  private static async loadTextures(textures: MeshDefinition['textures']): Promise<void> {
    if (!textures) return;

    const texturePromises: Promise<void>[] = [];

    // Helper function to load a texture
    const loadTexture = (path: string, key: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        this.textureLoader.load(
          path,
          texture => {
            this.loadedTextures.set(key, texture);
            resolve();
          },
          undefined,
          error => {
            console.error(`Error loading texture ${key}:`, error);
            reject(error);
          }
        );
      });
    };

    // Load each texture type if defined
    if (textures.color) {
      texturePromises.push(loadTexture(textures.color, textures.color));
    }
    if (textures.normal) {
      texturePromises.push(loadTexture(textures.normal, textures.normal));
    }
    if (textures.roughness) {
      texturePromises.push(loadTexture(textures.roughness, textures.roughness));
    }
    if (textures.displacement) {
      texturePromises.push(loadTexture(textures.displacement, textures.displacement));
    }
    if (textures.metalness) {
      texturePromises.push(loadTexture(textures.metalness, textures.metalness));
    }
    if (textures.ambient) {
      texturePromises.push(loadTexture(textures.ambient, textures.ambient));
    }

    await Promise.all(texturePromises);
  }

  /**
   * Create a Three.js object from a transform definition
   * @param transform The transform definition
   * @returns The created Three.js object
   */
  public static createObject(transform: EntityTransform): THREE.Object3D | null {
    // Handle special entity types
    if (transform.entity === 'spawn') {
      // Spawn points don't need a visual representation
      return null;
    }

    // Get the model for this transform
    const model = transform.mesh ? this.loadedModels.get(transform.mesh) : null;
    if (!model) {
      console.error(`Model not found for transform ${transform.id}`);
      return null;
    }

    // Clone the model to create a new instance
    const instance = model.clone();
    instance.name = transform.id;

    // Apply position, rotation, and scale
    instance.position.copy(toVector3(transform.position));

    if (transform.rotation) {
      instance.rotation.copy(toEuler(transform.rotation));
    }

    if (transform.scale) {
      instance.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
    }

    return instance;
  }

  /**
   * Create a collision box for physics
   * @param transform The transform definition
   * @param meshDef The mesh definition
   * @returns The collision box
   */
  public static createCollisionBox(
    transform: EntityTransform,
    meshDef: MeshDefinition
  ): THREE.Box3 | null {
    if (!meshDef.collision) {
      return null;
    }

    const position = toVector3(transform.position);

    if (meshDef.collision.type === 'box' && meshDef.collision.dimensions) {
      const size = new THREE.Vector3(
        meshDef.collision.dimensions.width,
        meshDef.collision.dimensions.height,
        meshDef.collision.dimensions.depth
      );

      // Apply offset if defined
      if (meshDef.collision.offset) {
        position.add(toVector3(meshDef.collision.offset));
      }

      return new THREE.Box3().setFromCenterAndSize(position, size);
    }

    // For now, we only support box collisions
    // TODO: Implement sphere and mesh collisions

    return null;
  }

  /**
   * Find the playable area transform in a map configuration
   * @param config The map configuration
   * @returns The playable area transform or null if not found
   */
  public static findPlayableAreaTransform(config: DynamicMapConfig): EntityTransform | null {
    return config.transforms.find(t => t.isPlayableArea === true) || null;
  }

  /**
   * Calculate the playable area size from a mesh
   * @param config The map configuration
   * @param meshId The mesh ID
   * @returns The calculated playable area size
   */
  public static calculatePlayableAreaSize(config: DynamicMapConfig, meshId: string): number {
    const meshDef = config.meshes[meshId];

    // If the mesh has collision dimensions, use them
    if (meshDef && meshDef.collision && meshDef.collision.dimensions) {
      // For a ground plane, the size is typically the maximum of width and depth
      return Math.max(meshDef.collision.dimensions.width, meshDef.collision.dimensions.depth);
    }

    // If no collision dimensions, try to calculate from wall positions
    // Find walls at the edges of the map
    const walls = config.transforms.filter(
      t => t.mesh && t.id.includes('wall') && config.meshes[t.mesh]
    );

    if (walls.length > 0) {
      // Calculate the maximum distance from the center to any wall
      let maxDistance = 0;
      walls.forEach(wall => {
        const distance = Math.sqrt(
          wall.position.x * wall.position.x + wall.position.z * wall.position.z
        );
        maxDistance = Math.max(maxDistance, distance);
      });

      // The playable area size is twice the maximum distance
      return maxDistance * 2;
    }

    // If we can't calculate from walls, use a default value
    console.warn('Could not calculate playable area size, using default value of 70');
    return 70; // Default value
  }

  /**
   * Get the playable area size from a map configuration
   * @param config The map configuration
   * @returns The playable area size
   * @throws Error if no playable area transform is found
   */
  public static getPlayableAreaSize(config: DynamicMapConfig): number {
    const playableAreaTransform = this.findPlayableAreaTransform(config);
    if (!playableAreaTransform) {
      throw new Error('No valid playable area found in map configuration');
    }

    // Calculate the playable area size from the mesh
    if (playableAreaTransform.mesh) {
      return this.calculatePlayableAreaSize(config, playableAreaTransform.mesh);
    }

    // If no mesh is defined, we can't calculate the size
    throw new Error('Playable area transform must reference a valid mesh');
  }

  /**
   * Convert a dynamic map config to the old format for backward compatibility
   * @param dynamicConfig The dynamic map configuration
   * @returns The old format map configuration
   */
  public static convertToOldFormat(dynamicConfig: DynamicMapConfig): MapConfig {
    const playableAreaSize = this.getPlayableAreaSize(dynamicConfig);

    const oldConfig: MapConfig = {
      name: dynamicConfig.name,
      version: dynamicConfig.version,
      playableArea: {
        size: playableAreaSize,
      },
      spawnPoints: [],
      walls: [],
      boxes: [],
    };

    // Extract spawn points
    const spawnPoints = dynamicConfig.transforms
      .filter(t => t.entity === 'spawn')
      .map(t => ({ x: t.position.x, y: t.position.y, z: t.position.z })); // Create Vector3 objects

    oldConfig.spawnPoints = spawnPoints;

    // Extract walls and boxes
    dynamicConfig.transforms
      .filter(t => t.mesh && !t.entity)
      .forEach(t => {
        const meshDef = dynamicConfig.meshes[t.mesh!];

        // Skip if no collision info
        if (!meshDef.collision || !meshDef.collision.dimensions) {
          return;
        }

        const dimensions = meshDef.collision.dimensions;
        const isWall = t.id.includes('wall');

        const object = {
          id: t.id,
          position: {
            x: t.position.x,
            y: t.position.y,
            z: t.position.z,
          },
          dimensions: {
            width: dimensions.width,
            height: dimensions.height,
            depth: dimensions.depth,
          },
          color: meshDef.material?.color || 0x888888,
        };

        if (isWall) {
          oldConfig.walls.push(object);
        } else {
          oldConfig.boxes.push(object);
        }
      });

    return oldConfig;
  }
}
