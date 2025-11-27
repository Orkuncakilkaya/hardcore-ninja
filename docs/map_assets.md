# Map Assets Documentation

This document outlines the 3D models and textures needed for the new dynamic map system.

## Required 3D Models

The following GLTF models need to be created and placed in the `/resources/meshes/` directory:

1. **ground_plane.gltf** - A flat plane for the ground (can be a simple plane mesh)
2. **wall.gltf** - A standard wall segment
3. **wall_long.gltf** - A long wall segment for the map boundaries
4. **box_small.gltf** - A small crate/box (3x3x3 units)
5. **box_large.gltf** - A larger crate/box (6x3x3 units)
6. **ventilation_box.gltf** - A ventilation unit or similar decorative object

## Required Textures

The following textures need to be created and placed in the appropriate directories:

### Ground Textures
- `/resources/textures/Tiles108_1K-JPG/Tiles108_1K-JPG_Color.jpg`
- `/resources/textures/Tiles108_1K-JPG/Tiles108_1K-JPG_NormalGL.jpg`
- `/resources/textures/Tiles108_1K-JPG/Tiles108_1K-JPG_Roughness.jpg`
- `/resources/textures/Tiles108_1K-JPG/Tiles108_1K-JPG_Displacement.jpg`

### Brick Textures (for walls)
- `/resources/textures/brick/brick_color.jpg`
- `/resources/textures/brick/brick_normal.jpg`
- `/resources/textures/brick/brick_roughness.jpg`

### Crate Textures (for boxes)
- `/resources/textures/crate/crate_color.jpg`
- `/resources/textures/crate/crate_normal.jpg`
- `/resources/textures/crate/crate_roughness.jpg`

### Ventilation Textures
- `/resources/textures/ventilation/ventilation_color.jpg`
- `/resources/textures/ventilation/ventilation_normal.jpg`
- `/resources/textures/ventilation/ventilation_roughness.jpg`

## Model Specifications

### Ground Plane
- Simple flat plane
- Size: 70x70 units
- UV mapped for proper texture tiling

### Wall
- Simple rectangular box
- Size: 2x1x2 units (width x height x depth)
- UV mapped for brick textures

### Wall Long
- Elongated rectangular box
- Size: 74x1x2 units (width x height x depth)
- UV mapped for brick textures

### Box Small
- Cubic box
- Size: 3x3x3 units
- UV mapped for crate textures

### Box Large
- Rectangular box
- Size: 6x3x3 units
- UV mapped for crate textures

### Ventilation Box
- Detailed ventilation unit with grates, pipes, etc.
- Size: approximately 2x2x2 units
- UV mapped for ventilation textures

## Creating Your Own Maps

To create your own maps:

1. Define mesh types in the `meshes` section of your map JSON
2. Create instances of these meshes in the `transforms` section
3. Add spawn points as special entities
4. Configure environment settings like lighting and fog

See the sample map at `/public/maps/dynamic_default_map.json` for a complete example.

## Tips for Level Designers

- Use a 3D modeling tool like Blender to create and export GLTF models
- Keep model complexity reasonable for good performance
- Use PBR textures (color, normal, roughness) for realistic materials
- Test your maps with different lighting conditions
- Add collision information to all objects that should block player movement
- Use rotation to create variety with the same models
- Consider the gameplay implications of object placement
