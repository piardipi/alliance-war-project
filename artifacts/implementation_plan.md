# Implementation Plan - Phase 3.1: Africa Test Parcels

**Goal**: Generate a seamless, gapless, and interactive land parcel system specifically for the African continent to test "conquest" style map mechanics.

## User Requirements
- **Region**: Africa (Continent only).
- **Geometry**: Organic shapes (Triangles, Circles, Semi-circles implied by Voronoi/Delaunay), seamless, gapless.
- **Constraints**: No sea overlap, strictly within land boundaries.
- **Interaction**: Unique IDs, assignable colors, clickable/selectable.
- **Count**: Natural fit (adaptive).

## Proposed Solution: Restricted Relaxed Voronoi

We will use **Spherical Voronoi Tessellation** combined with **Lloyd's Relaxation** and **Geospatial Clipping**. This is the mathematically robust way to ensure "gapless" and "organic" shapes that cover a sphere's surface.

### 1. Dependencies (Re-install)
We need to restore the geospatial processing power:
- `d3-geo`: For projections and spherical math.
- `d3-geo-voronoi`: For computing the base cell mesh.
- `@turf/turf`: For robust polygon clipping (Land vs. Parcel) and geometric operations.
- `topojson-client`: To parse the high-res land mask.

### 2. Pipeline Overview

#### A. Seed Generation (Africa Focused)
- **Source**: `land-50m.json` (High resolution).
- **Binary Mask**: Create an internal canvas mask of the land.
- **Sampling**:
  - Define Africa Bounding Box:
    - Longitude: `[-20, 55]`
    - Latitude:  `[-35, 40]`
  - Randomly sample distinct white pixels (land) *only* within this box.
  - This ensures we don't generate parcels in the Americas or Asia for this test.

#### B. Tessellation & Relaxation
- **Algorithm**: `d3.geoVoronoi`
- **Relaxation**: Apply Lloyd's Algorithm (2-3 iterations).
  - *Why?* This pushes seed points apart until they are evenly spaced. It transforms random "shards" into uniform, organic "honeycomb-like" cells (which resemble rounded polygons).
- **Result**: A gapless mesh covering the bounding box area.

#### C. Clipping (The "Coastline" Rule)
- **Intersection**: Compute `turf.intersect(voronoi_cell, land_shape)`.
- **Result**: Cells that perfectly follow the coastline.
- **Filtering**: Remove cells that are essentially empty or too small (noise).

#### D. Geometry & Interaction
- **Merged Mesh**: Create a single `THREE.BufferGeometry` for performance.
- **Coloring**: Use Vertex Colors to allow individual parcel coloring (essential for "Conquest").
- **Interaction**:
  - Keep a CPU-side reference of the *unmerged* geometries or create a simple raycasting maps (Face ID -> Parcel ID).
  - On click -> Identify Parcel ID -> Change color in the global mesh attribute.

### 3. UI Changes
- Add a new checkbox: "Africa Test Parselleri (Faz-3.1)".

## Step-by-Step Execution
1.  **Install Dependencies**: `npm install d3-geo d3-geo-voronoi @turf/turf topojson-client`
2.  **Develop `main.js`**:
    -   Implement `africaLayer` object.
    -   Add `generateAfricaSeeds()` with bounding box logic.
    -   Add `processAfricaTessellation()` with relaxation + clip.
    -   Add `createInteractiveMesh()`.
    -   Add Click Handler for coloring.
3.  **Verify**:
    -   Check visual coverage of Africa.
    -   Check performance (FPS).
    -   Test clicking and color changing.

## User Review Required
- **Shapes**: The plan relies on Voronoi polygons. These are mathematically "convex polygons", often 5-6 sided, but can look triangular or semi-circular at edges. This fits "gapless" perfectly. Is this acceptable? (Yes, assumed based on "completion" requirement).
- **Count**: We will aim for ~1500-2000 cells for Africa to give a good density.
