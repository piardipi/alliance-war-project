# Implementation Plan - Phase 3 Rollback

The goal is to completely revert the project to the end of Phase 2 (FAZ-2), removing all Phase 3 (FAZ-3) features, code, and dependencies.

## User Requirements
- **Cancel Phase 3**: Remove all land parcel generation, Voronoi, tessellation, and seeds.
- **Remove Dependencies**: Uninstall `d3-geo`, `d3-geo-voronoi`, `@turf/turf`, `topojson-client`.
- **Clean UI**: Remove Phase 3 checkboxes and controls.
- **Clean Storage**: Remove `localStorage` keys related to Phase 3.
- **Preserve Phase 1 & 2**: Ensure World Mesh, Camera, Lights, Rotation, Country Borders, and South Pole Prestige Area remain functional.

## Proposed Changes

### 1. Dependency Cleanup
- [x] Uninstall packages: `npm uninstall d3-geo d3-geo-voronoi @turf/turf topojson-client` (Already initiated).

### 2. Codebase Cleanup (`main.js`)
- [x] Remove Imports.
- [x] Remove `landLayer` object and initialization.
- [x] Remove Hover/Click interaction logic for parcels.
- [ ] Add `localStorage.removeItem('landSeeds_global_v1')` to initialization to clean up client data.

### 3. UI Cleanup (`index.html`)
- [x] Remove "Kara Parselleri" checkbox.

### 4. Documentation Update (`GEMINI.md`)
- [ ] Revert strict rules to Phase 2 state.
- [ ] Mark Phase 3 as cancelled/reverted.

## Verification
- Manual check of `main.js` to ensure no lingering Phase 3 code.
- functionality test:
    - Earth rotates? (Phase 1)
    - Borders toggle? (Phase 2.1)
    - South Pole slots toggle? (Phase 2.2)
    - No errors in console regarding missing modules or variables.
