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
    // Note: For more robust validation, consider using a JSON schema validation library like Ajv
    // The schema is defined in public/maps/map-schema.json

    // Basic validation checks
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
      if (!mesh.format || !['gltf', 'obj', 'primitive'].includes(mesh.format)) {
        throw new Error(`Mesh ${key} must have a valid format (gltf, obj, or primitive)`);
      }

      if (mesh.format === 'primitive') {
        // For primitive shapes, validate primitiveType
        if (
          !mesh.primitiveType ||
          !['plane', 'box', 'sphere', 'cylinder', 'cone', 'torus'].includes(mesh.primitiveType)
        ) {
          throw new Error(
            `Primitive mesh ${key} must have a valid primitiveType (plane, box, sphere, cylinder, cone, or torus)`
          );
        }

        // Validate primitiveParams based on primitiveType
        if (!mesh.primitiveParams) {
          throw new Error(`Primitive mesh ${key} must have primitiveParams`);
        }

        // Specific validation for each primitive type could be added here
      } else {
        // For gltf and obj formats, validate meshFile
        if (!mesh.meshFile || typeof mesh.meshFile !== 'string') {
          throw new Error(`Mesh ${key} must have a valid meshFile path`);
        }
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
      if (meshDef.format === 'gltf') {
        const loadPath = meshDef.meshFile;
        if (!loadPath) {
          reject(new Error('GLTF model requires a meshFile path'));
          return;
        }

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
        const loadPath = meshDef.meshFile;
        if (!loadPath) {
          reject(new Error('OBJ model requires a meshFile path'));
          return;
        }

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
      } else if (meshDef.format === 'primitive') {
        // Create a primitive shape based on primitiveType
        if (!meshDef.primitiveType || !meshDef.primitiveParams) {
          reject(new Error('Primitive shape requires primitiveType and primitiveParams'));
          return;
        }

        let geometry: THREE.BufferGeometry;
        const params = meshDef.primitiveParams;

        // Create geometry based on primitiveType
        try {
          switch (meshDef.primitiveType) {
            case 'plane':
              geometry = new THREE.PlaneGeometry(
                params.width || 1,
                params.height || 1,
                params.widthSegments || 1,
                params.heightSegments || 1
              );
              break;
            case 'box':
              geometry = new THREE.BoxGeometry(
                params.width || 1,
                params.height || 1,
                params.depth || 1,
                params.widthSegments || 1,
                params.heightSegments || 1,
                params.depthSegments || 1
              );
              break;
            case 'sphere':
              geometry = new THREE.SphereGeometry(
                params.radius || 1,
                params.widthSegments || 32,
                params.heightSegments || 16
              );
              break;
            case 'cylinder':
              geometry = new THREE.CylinderGeometry(
                params.radiusTop || 1,
                params.radiusBottom || 1,
                params.height || 1,
                params.radialSegments || 32,
                params.heightSegments || 1,
                params.openEnded || false
              );
              break;
            case 'cone':
              geometry = new THREE.ConeGeometry(
                params.radius || 1,
                params.height || 1,
                params.radialSegments || 32,
                params.heightSegments || 1,
                params.openEnded || false
              );
              break;
            case 'torus':
              geometry = new THREE.TorusGeometry(
                params.radius || 1,
                params.tube || 0.4,
                params.radialSegments || 16,
                params.tubularSegments || 100
              );
              break;
            default:
              reject(new Error(`Unsupported primitive type: ${meshDef.primitiveType}`));
              return;
          }
        } catch (error) {
          console.error('Error creating primitive geometry:', error);
          reject(error);
          return;
        }

        // Handle textures and material creation
        const createMaterialAndFinish = (textures: Record<string, THREE.Texture> = {}) => {
          try {
            let material: THREE.Material;

            // If textures were loaded, create a material with textures
            if (Object.keys(textures).length > 0 && textures.color) {
              // Create material with texture
              material = new THREE.MeshStandardMaterial({
                map: textures.color,
                roughness: meshDef.material?.roughness || 0.5,
                metalness: meshDef.material?.metalness || 0.0,
              });

              // Apply other textures if available
              if (textures.normal) {
                (material as THREE.MeshStandardMaterial).normalMap = textures.normal;
              }

              if (textures.roughness) {
                (material as THREE.MeshStandardMaterial).roughnessMap = textures.roughness;
              }

              if (textures.metalness) {
                (material as THREE.MeshStandardMaterial).metalnessMap = textures.metalness;
              }

              if (textures.displacement) {
                (material as THREE.MeshStandardMaterial).displacementMap = textures.displacement;
              }
            } else if (meshDef.material) {
              // Create material with color and properties
              material = new THREE.MeshStandardMaterial({
                color: meshDef.material.color || 0x888888,
                roughness: meshDef.material.roughness || 0.5,
                metalness: meshDef.material.metalness || 0.0,
              });
            } else {
              // Default material
              material = new THREE.MeshStandardMaterial({ color: 0x888888 });
            }

            // Create mesh
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            // Create a group to hold the mesh (for consistency with other formats)
            const group = new THREE.Group();
            group.add(mesh);

            // Apply scale if defined
            if (meshDef.scale) {
              group.scale.set(meshDef.scale.x, meshDef.scale.y, meshDef.scale.z);
            }

            resolve(group);
          } catch (error) {
            console.error('Error creating primitive material or mesh:', error);
            reject(error);
          }
        };

        // If textures are defined, load them first
        if (meshDef.textures && Object.keys(meshDef.textures).length > 0) {
          const texturePromises: Promise<[string, THREE.Texture]>[] = [];
          const textureKeys = [
            'color',
            'normal',
            'roughness',
            'metalness',
            'displacement',
            'ambient',
          ];

          // Create promises for each texture type
          textureKeys.forEach(key => {
            const texturePath = meshDef.textures?.[key as keyof typeof meshDef.textures];
            if (texturePath) {
              // Check if texture is already loaded
              const loadedTexture = this.loadedTextures.get(texturePath);
              if (loadedTexture) {
                texturePromises.push(Promise.resolve([key, loadedTexture]));
              } else {
                // Load the texture
                texturePromises.push(
                  this.loadTextureSync(texturePath).then(texture => [key, texture])
                );
              }
            }
          });

          // Wait for all textures to load
          Promise.all(texturePromises)
            .then(loadedTextures => {
              // Convert array of [key, texture] to object
              const textureMap: Record<string, THREE.Texture> = {};
              loadedTextures.forEach(([key, texture]) => {
                textureMap[key] = texture;
              });

              createMaterialAndFinish(textureMap);
            })
            .catch(error => {
              console.error('Error loading textures for primitive:', error);
              // Continue with material creation without textures
              createMaterialAndFinish();
            });
        } else {
          // No textures to load, create material directly
          createMaterialAndFinish();
        }
      } else {
        reject(new Error(`Unsupported model format: ${meshDef.format}`));
      }
    });
  }

  /**
   * Load a texture synchronously
   * @param path The path to the texture
   * @returns The loaded texture
   */
  private static loadTextureSync(path: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        path,
        texture => {
          this.loadedTextures.set(path, texture);
          resolve(texture);
        },
        undefined,
        error => {
          console.error(`Error loading texture ${path}:`, error);
          reject(error);
        }
      );
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
    // Playable areas do not have collision boxes; calling code does not need to check isPlayableArea again.
    if (transform.isPlayableArea) {
      return null;
    }
    if (!meshDef.collision) {
      return null;
    }

    if (meshDef.collision.type === 'box' && meshDef.collision.dimensions) {
      // Create a temporary Object3D to apply rotation
      const tempObject = new THREE.Object3D();

      // Set position
      tempObject.position.copy(toVector3(transform.position));

      // Apply rotation if defined
      if (transform.rotation) {
        tempObject.rotation.copy(toEuler(transform.rotation));
      }

      // Create a box geometry with the collision dimensions
      const boxGeometry = new THREE.BoxGeometry(
        meshDef.collision.dimensions.width,
        meshDef.collision.dimensions.height,
        meshDef.collision.dimensions.depth
      );

      // Create a mesh with the box geometry
      const boxMesh = new THREE.Mesh(boxGeometry);

      // Apply offset if defined
      if (meshDef.collision.offset) {
        boxMesh.position.copy(toVector3(meshDef.collision.offset));
      }

      // Add the box mesh to the temporary object
      tempObject.add(boxMesh);

      // Update the world matrix to apply transformations
      tempObject.updateMatrixWorld(true);

      // Calculate the bounding box of the rotated object
      const boundingBox = new THREE.Box3().setFromObject(tempObject);

      return boundingBox;
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

    // If the mesh has primitive parameters for a plane, use them
    if (meshDef && meshDef.primitiveType === 'plane' && meshDef.primitiveParams) {
      const params = meshDef.primitiveParams;
      if (params.width && params.height) {
        return Math.max(params.width, params.height);
      }
    }

    // If we can't calculate from the mesh, use a default value
    console.warn('Could not calculate playable area size from mesh, using default value of 70');
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
}
