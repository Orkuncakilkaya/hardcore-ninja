# Primitive Shapes in Dynamic Maps

This document explains how to use primitive shapes in your dynamic maps.

## Overview

In addition to GLTF and OBJ models, the dynamic map system now supports primitive shapes such as:
- Planes
- Boxes
- Spheres
- Cylinders
- Cones
- Tori (donut shapes)

These primitive shapes can be used to create simple geometry without needing to create 3D models in external software. They can be colored or textured just like regular models.

## How to Use Primitive Shapes

To use a primitive shape in your map, define a mesh with `format: "primitive"` and specify the `primitiveType` and `primitiveParams`.

### Basic Example

```json
"simple_box": {
  "format": "primitive",
  "primitiveType": "box",
  "primitiveParams": {
    "width": 3,
    "height": 3,
    "depth": 3
  },
  "material": {
    "color": 16711680,  // Red color in hex
    "roughness": 0.5,
    "metalness": 0.2
  }
}
```

## Primitive Types and Parameters

### Plane

A flat rectangular surface.

```json
"plane": {
  "format": "primitive",
  "primitiveType": "plane",
  "primitiveParams": {
    "width": 10,
    "height": 10,
    "widthSegments": 1,
    "heightSegments": 1
  }
}
```

### Box

A rectangular cuboid.

```json
"box": {
  "format": "primitive",
  "primitiveType": "box",
  "primitiveParams": {
    "width": 3,
    "height": 3,
    "depth": 3,
    "widthSegments": 1,
    "heightSegments": 1,
    "depthSegments": 1
  }
}
```

### Sphere

A spherical shape.

```json
"sphere": {
  "format": "primitive",
  "primitiveType": "sphere",
  "primitiveParams": {
    "radius": 2,
    "widthSegments": 32,
    "heightSegments": 16
  }
}
```

### Cylinder

A cylindrical shape.

```json
"cylinder": {
  "format": "primitive",
  "primitiveType": "cylinder",
  "primitiveParams": {
    "radiusTop": 1.5,
    "radiusBottom": 1.5,
    "height": 4,
    "radialSegments": 32,
    "heightSegments": 1,
    "openEnded": false
  }
}
```

### Cone

A conical shape.

```json
"cone": {
  "format": "primitive",
  "primitiveType": "cone",
  "primitiveParams": {
    "radius": 2,
    "height": 4,
    "radialSegments": 32,
    "heightSegments": 1,
    "openEnded": false
  }
}
```

### Torus

A donut-shaped object.

```json
"torus": {
  "format": "primitive",
  "primitiveType": "torus",
  "primitiveParams": {
    "radius": 2,
    "tube": 0.5,
    "radialSegments": 16,
    "tubularSegments": 100
  }
}
```

## Applying Materials and Textures

### Solid Colors

To apply a solid color to a primitive shape, use the `material` property:

```json
"material": {
  "color": 16711680,  // Red color in hex
  "roughness": 0.5,   // 0 = smooth, 1 = rough
  "metalness": 0.2    // 0 = non-metallic, 1 = metallic
}
```

### Textures

To apply textures to a primitive shape, use the `textures` property:

```json
"textures": {
  "color": "/resources/textures/crate/crate_color.jpg",
  "normal": "/resources/textures/crate/crate_normal.jpg",
  "roughness": "/resources/textures/crate/crate_roughness.jpg",
  "displacement": "/resources/textures/crate/crate_displacement.jpg",
  "metalness": "/resources/textures/crate/crate_metalness.jpg"
}
```

## Collision Detection

Primitive shapes support the same collision detection options as regular models:

```json
"collision": {
  "type": "box",
  "dimensions": {
    "width": 3,
    "height": 3,
    "depth": 3
  }
}
```

or

```json
"collision": {
  "type": "sphere",
  "radius": 2
}
```

## Complete Example

See the `public/maps/primitive_shapes_demo.json` file for a complete example of using primitive shapes in a map.

## Tips and Best Practices

1. Use primitive shapes for simple geometry to reduce file size and loading times.
2. For complex shapes, GLTF or OBJ models are still recommended.
3. Adjust the segment parameters to control the level of detail (higher values = smoother curves but more polygons).
4. Remember that primitive shapes are rendered as meshes, so they can be transformed (positioned, rotated, scaled) like any other mesh.
5. When using textures with primitive shapes, be aware that the UV mapping is automatically generated and may not be ideal for all textures.
