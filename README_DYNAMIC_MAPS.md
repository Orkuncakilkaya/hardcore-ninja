# Dynamic Map System

This document provides an overview of the new dynamic map system implemented in the game.

## Overview

The dynamic map system allows level designers to create custom maps using external 3D models and textures. Maps are defined in JSON format, which specifies the meshes, their transforms, and environment settings.

## Key Features

- Support for GLTF and OBJ 3D models
- PBR textures (color, normal, roughness, etc.)
- Customizable transforms (position, rotation, scale)
- Collision detection for physics
- Environment settings (skybox, fog, lighting)
- Special entities like spawn points
- Backward compatibility with the old map format

## Implementation Details

The following files were created or modified to implement the dynamic map system:

### New Files

1. `src/common/types/MapTypes.ts` - Defines the types for the dynamic map format
2. `src/core/DynamicMapLoader.ts` - Handles loading and parsing dynamic map files
3. `public/maps/dynamic_default_map.json` - Sample map using the new format
4. `docs/map_assets.md` - Documentation for required 3D models and textures

### Modified Files

1. `src/client/ClientEntityManager.ts` - Updated to handle the new map format
2. `src/server/ServerEntityManager.ts` - Updated to handle the new map format
3. `src/components/Menu.tsx` - Updated to load the dynamic map with fallback to legacy map

## How to Use

### For Level Designers

1. Create 3D models in a tool like Blender and export them as GLTF or OBJ
2. Create PBR textures for your models
3. Define your map in JSON format following the structure in `public/maps/dynamic_default_map.json`
4. Place your assets in the appropriate directories as described in `docs/map_assets.md`

### For Developers

1. The system automatically detects whether a map is in the new dynamic format or the old legacy format
2. You can use `DynamicMapLoader.loadMap()` to load dynamic maps
3. The system will convert dynamic maps to the old format for backward compatibility if needed

## JSON Format

The dynamic map format consists of three main sections:

1. **Meshes** - Definitions of reusable 3D models with their properties
2. **Transforms** - Instances of meshes placed in the world
3. **Environment** - Settings for skybox, fog, and lighting

Example:

```json
{
  "name": "My Custom Map",
  "version": "1.0",
  "playableArea": {
    "size": 70
  },
  "meshes": {
    "my_mesh": {
      "format": "gltf",
      "meshFile": "/resources/meshes/my_mesh.gltf",
      "textures": {
        "color": "/resources/textures/my_texture.jpg"
      },
      "collision": {
        "type": "box",
        "dimensions": { "width": 2, "height": 2, "depth": 2 }
      }
    }
  },
  "transforms": [
    {
      "id": "my_object_1",
      "mesh": "my_mesh",
      "position": { "x": 0, "y": 0, "z": 0 }
    },
    {
      "id": "spawn_1",
      "entity": "spawn",
      "position": { "x": 10, "y": 0, "z": 10 }
    }
  ],
  "environment": {
    "skybox": {
      "type": "color",
      "value": 8900331
    }
  }
}
```

## Required Assets

See `docs/map_assets.md` for a detailed list of required 3D models and textures.

## Future Improvements

Potential future improvements to the dynamic map system:

1. Support for more complex collision shapes (sphere, mesh)
2. Support for animated models
3. Support for particle effects
4. Support for audio sources in the map
5. A visual map editor for easier creation
6. Support for more environment features (water, weather, etc.)
