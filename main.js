import * as THREE from 'three';
import { tiktokLayer } from './tiktokLayer.js';
import { InteractionState, setupInteractionEvents } from './EventManager.js';

// --- Scene Setup ---
const scene = new THREE.Scene();

// Cleanup Phase 3 Data (Rollback - HARD RESET)
const phase3Keys = [
  'landSeeds_global_v1',
  'landParcels_v1',
  'voronoi_cache',
  'phase3_debug'
];
phase3Keys.forEach(k => localStorage.removeItem(k));
console.log("Phase 3 Data Cleared. System rolled back to Phase 2.");

// Camera positioned to view the earth clearly - Closer for better immersion
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 2.8); // Moved closer (was 3.5)

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.max(window.devicePixelRatio, 2.0)); // Force high DPI for sharpness
// Tone mapping for more realistic lighting
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);



// --- Earth Setup ---
const earthGeometry = new THREE.SphereGeometry(1, 64, 64);

// Loading textures - High Quality with Anisotropy
const textureLoader = new THREE.TextureLoader();
const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

const loadTexture = (url) => {
  const tex = textureLoader.load(url);
  tex.anisotropy = maxAnisotropy;
  return tex;
};

// Load shared textures once
const earthMap = loadTexture('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg');
const earthSpecular = loadTexture('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg');
const earthNormal = loadTexture('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg');

const earthMaterial = new THREE.MeshPhongMaterial({
  map: earthMap,
  specularMap: earthSpecular,
  normalMap: earthNormal,
  specular: new THREE.Color(0x333333),
  shininess: 10
});

const earth = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earth);

// --- Starfield Background (Flowing Right to Left) ---
const starGeometry = new THREE.BufferGeometry();
const starMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.02,
  transparent: true,
  opacity: 0.8,
  sizeAttenuation: true
});

const starCount = 3000;
const starPositions = new Float32Array(starCount * 3);
const starSpeeds = [];

for (let i = 0; i < starCount; i++) {
  const x = (Math.random() - 0.5) * 200; // Wider spread for flow
  const y = (Math.random() - 0.5) * 100;
  const z = - (Math.random() * 50 + 20); // Push stars further back

  starPositions[i * 3] = x;
  starPositions[i * 3 + 1] = y;
  starPositions[i * 3 + 2] = z;

  // Random speed for parallax effect
  starSpeeds.push(0.02 + Math.random() * 0.03);
}

starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// --- Lighting ---
// Adjusted for high contrast and realism
const ambientLight = new THREE.AmbientLight(0x404040, 3.5); // High ambient for "Bright Everywhere" look
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 2.0); // Balanced Sun
sunLight.position.set(5, 3, 5);
scene.add(sunLight);

// --- Event Listeners ---
setupInteractionEvents(camera, earth, renderer);

// --- Phase 5.1: Banner System ---
import { BannerManager } from './BannerManager.js';
const bannerManager = new BannerManager();
// --------------------------------

// --- Animation Loop ---
function animate() {
  requestAnimationFrame(animate);

  // 1. Earth Auto-Rotation (Stops on Hover or Drag)
  if (!InteractionState.isHovering && !InteractionState.isDragging) {
    earth.rotation.y -= 0.0007; // Rotate from left to right (negative Y) - slightly faster
  }

  // 2. Starfield Flow (Independent, always flowing Right to Left)
  const positions = stars.geometry.attributes.position.array;
  for (let i = 0; i < starCount; i++) {
    // Move X coordinate left
    positions[i * 3] -= starSpeeds[i];

    // Reset if too far left
    if (positions[i * 3] < -100) {
      positions[i * 3] = 100;
    }
  }
  stars.geometry.attributes.position.needsUpdate = true;

  renderer.render(scene, camera);
}

animate();


// --- UI Elements ---
const panel = document.getElementById('mode-panel');
const toggleBtn = document.getElementById('mode-toggle-btn');
const closeBtn = document.getElementById('close-panel-btn');
const modeInputs = document.querySelectorAll('input[name="world-mode"]');

// --- Settings Persistence ---
function saveSettings() {
  const settings = {
    borderVisible: document.getElementById('layer-borders')?.checked ?? true,
    southPoleVisible: document.getElementById('layer-south-pole')?.checked ?? true,
    labelsVisible: document.getElementById('toggle-labels')?.checked ?? true,
    labelScale: document.getElementById('label-scale-slider')?.value ?? '1.0',
    worldMode: document.querySelector('input[name="world-mode"]:checked')?.value ?? 'realistic'
  };
  localStorage.setItem('piardiarena_settings', JSON.stringify(settings));
}

function loadSettings() {
  const saved = localStorage.getItem('piardiarena_settings');
  if (!saved) return;

  try {
    const settings = JSON.parse(saved);

    // Apply border visibility
    const borderCheckbox = document.getElementById('layer-borders');
    if (borderCheckbox) {
      borderCheckbox.checked = settings.borderVisible;
      if (window.worldLayers) window.worldLayers.toggleBorders(settings.borderVisible);
    }

    // Apply south pole visibility
    const southPoleCheckbox = document.getElementById('layer-south-pole');
    if (southPoleCheckbox) southPoleCheckbox.checked = settings.southPoleVisible;

    // Apply labels visibility
    const labelsCheckbox = document.getElementById('toggle-labels');
    if (labelsCheckbox) {
      labelsCheckbox.checked = settings.labelsVisible;
      if (window.toggleLabels) window.toggleLabels(settings.labelsVisible);
    }

    // Apply label scale
    const scaleSlider = document.getElementById('label-scale-slider');
    const scaleVal = document.getElementById('label-scale-val');
    if (scaleSlider && scaleVal) {
      scaleSlider.value = settings.labelScale;
      scaleVal.innerText = settings.labelScale;
      if (window.setLabelScale) window.setLabelScale(settings.labelScale);
    }

    // Apply world mode
    const modeRadio = document.querySelector(`input[name="world-mode"][value="${settings.worldMode}"]`);
    if (modeRadio) modeRadio.checked = true;

  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}

// Toggle Panel
if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    panel.classList.add('open');
    toggleBtn.style.opacity = '0'; // Hide button when panel is open
    const midBtnContainer = document.getElementById('mid-right-buttons-container');
    if (midBtnContainer) midBtnContainer.style.right = '264px';
  });
}

// Close Panel
if (closeBtn) {
  closeBtn.addEventListener('click', () => {
    panel.classList.remove('open');
    toggleBtn.style.opacity = '1'; // Show button when panel is closed
    const midBtnContainer = document.getElementById('mid-right-buttons-container');
    if (midBtnContainer) midBtnContainer.style.right = '24px';
  });
}

// Add change listeners to save settings
document.getElementById('layer-borders')?.addEventListener('change', saveSettings);
document.getElementById('layer-south-pole')?.addEventListener('change', saveSettings);
document.getElementById('toggle-labels')?.addEventListener('change', saveSettings);
document.getElementById('label-scale-slider')?.addEventListener('input', saveSettings);
modeInputs.forEach(input => input.addEventListener('change', saveSettings));

// Load settings on page load
window.addEventListener('load', () => {
  setTimeout(loadSettings, 500); // Delay to ensure all systems are initialized
});

// Reset Map Button
const resetMapBtn = document.getElementById('reset-map-btn');
if (resetMapBtn) {
  resetMapBtn.addEventListener('click', () => {
    if (confirm('Haritayı sıfırlamak istediğinizden emin misiniz? Tüm oyuncu fetihleri silinecek!')) {
      if (window.conquestLayer) {
        window.conquestLayer.resetMap();
        alert('Harita başarıyla sıfırlandı!');
      }
    }
  });
}

// Settings Toggle (Top-Right) - REMOVED in FAZ-4.2
// const settingsBtn = document.getElementById('settings-toggle-btn');
// const settingsBar = document.getElementById('settings-bar');

// if (settingsBtn && settingsBar) {
//   settingsBtn.addEventListener('click', () => {
//     settingsBar.classList.toggle('open');
//     settingsBtn.style.transform = settingsBar.classList.contains('open') ? 'rotate(90deg)' : 'rotate(0deg)';
//   });
// }

// --- Materials ---
// Reuse existing textureLoader from above

// 1. Realistic Material (Existing)
// 1. Realistic Material (Existing)
const realisticMaterial = new THREE.MeshPhongMaterial({
  map: earthMap,
  specularMap: earthSpecular,
  normalMap: earthNormal,
  specular: new THREE.Color(0x333333),
  shininess: 10
});

// 2. Cartoon Material (New Shader)
// Using the specular map (black/white mask) to determine land vs sea
const cartoonUniforms = {
  specularMap: { value: realisticMaterial.specularMap },
  seaColor: { value: new THREE.Color(0x1a237e) }, // Parliament Blue (Deep)
  landColor: { value: new THREE.Color(0x8d6e63) }, // Earthy Brown (Clay-like)
  lightDirection: { value: sunLight.position }
};

const cartoonMaterial = new THREE.ShaderMaterial({
  uniforms: cartoonUniforms,
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform sampler2D specularMap;
    uniform vec3 seaColor;
    uniform vec3 landColor;
    uniform vec3 lightDirection;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      // 1. Determine Land vs Sea using the mask
      float mask = texture2D(specularMap, vUv).r;
      // Smooth transition to prevent aliasing/waviness
      float landFactor = smoothstep(0.05, 0.15, mask);
      vec3 baseColor = mix(landColor, seaColor, landFactor);

      // 2. Semi-Realistic Lighting (Softer than Cel Shading)
      vec3 normal = normalize(vNormal);
      vec3 lightDir = normalize(lightDirection);
      
      // Standard Lambert lighting + wrap for softness
      float NdotL = dot(normal, lightDir);
      float lightIntensity = smoothstep(-0.2, 1.0, NdotL); // Soft shadow transition
      
      // 3. Fresnel / Atmosphere Effect (Rim Light)
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
      vec3 atmosphereColor = vec3(0.4, 0.6, 1.0); // Light blue rim
      
      // Combine
      vec3 finalColor = baseColor * (0.3 + 0.7 * lightIntensity); // Ambient + Diffuse
      finalColor += atmosphereColor * fresnel * 0.5; // Add rim light

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
});

// 3. Conquest Material (New Shader - Dark/Strong)
const conquestUniforms = {
  specularMap: { value: realisticMaterial.specularMap },
  normalMap: { value: realisticMaterial.normalMap },
  seaColor: { value: new THREE.Color(0x0a1025) }, // Dark Navy / Night Blue
  landColor: { value: new THREE.Color(0x5d4037) }, // Dark Copper / Burnt Earth
  lightDirection: { value: sunLight.position }
};

const conquestMaterial = new THREE.ShaderMaterial({
  uniforms: conquestUniforms,
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform sampler2D specularMap;
    uniform sampler2D normalMap;
    uniform vec3 seaColor;
    uniform vec3 landColor;
    uniform vec3 lightDirection;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      // 1. Determine Land vs Sea
      float mask = texture2D(specularMap, vUv).r;
      float landFactor = smoothstep(0.05, 0.15, mask);
      vec3 baseColor = mix(landColor, seaColor, landFactor);

      // 2. Strong Lighting with Normal Map Influence
      // Perturb normal with normal map for \"Rough\" feel
      vec3 mapN = texture2D(normalMap, vUv).rgb * 2.0 - 1.0;
      vec3 normal = normalize(vNormal + mapN * 0.5); // Apply bumpiness
      
      vec3 lightDir = normalize(lightDirection);
      float NdotL = max(dot(normal, lightDir), 0.0);
      
      // High contrast lighting (Strong shadows)
      float lightIntensity = pow(NdotL, 1.2); 

      // 3. Metallic/Specular Highlight for \"Conquerable\" feel
      vec3 viewDir = normalize(vViewPosition);
      vec3 halfVector = normalize(lightDir + viewDir);
      float NdotH = max(dot(normal, halfVector), 0.0);
      float specular = pow(NdotH, 4.0); // Very wide spread (was 16.0)
      
      // Copper-ish tint for land specular, Blueish for sea
      vec3 specColor = mix(vec3(1.0, 0.8, 0.6), vec3(0.5, 0.7, 1.2), landFactor); // Brighter tint

      // Combine
      // Increased ambient and diffuse contribution for brightness
      vec3 finalColor = baseColor * (0.9 + 1.1 * lightIntensity); 
      finalColor += specColor * specular * 1.0; // Wide highlights

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
});

// Initial Material & Persistence
const savedMode = localStorage.getItem('worldMode') || 'realistic';
if (savedMode === 'cartoon') {
  earth.material = cartoonMaterial;
} else if (savedMode === 'conquest') {
  earth.material = conquestMaterial;
} else {
  earth.material = realisticMaterial;
}

// Set initial checked state
modeInputs.forEach(input => {
  if (input.value === savedMode) {
    input.checked = true;
  }
});

// Mode Switching Logic
modeInputs.forEach(input => {
  input.addEventListener('change', (e) => {
    const selectedMode = e.target.value;
    localStorage.setItem('worldMode', selectedMode); // Save to local storage

    if (selectedMode === 'cartoon') {
      earth.material = cartoonMaterial;
    } else if (selectedMode === 'conquest') {
      earth.material = conquestMaterial;
    } else {
      earth.material = realisticMaterial;
    }
  });
});

// --- Phase 2.1: World Layers (Borders) ---
const worldLayers = {
  borders: null,

  init: async function () {
    await this.createBorders();
  },

  createBorders: async function () {
    try {
      const response = await fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json');
      const data = await response.json();

      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5 });
      const group = new THREE.Group();

      data.features.forEach(feature => {
        const polygons = feature.geometry.type === 'Polygon'
          ? [feature.geometry.coordinates]
          : feature.geometry.coordinates;

        polygons.forEach(polygon => {
          polygon.forEach(ring => {
            const points = [];
            ring.forEach(coord => {
              const [lon, lat] = coord;
              if (lat < -60) return; // Phase 2.2 Refinement: Aggressive filter to keep South Pole clean
              const { x, y, z } = this.latLonToVector3(lat, lon, 1.002); // Radius * 1.001 + margin
              points.push(new THREE.Vector3(x, y, z));
            });
            if (points.length > 1) {
              const geometry = new THREE.BufferGeometry().setFromPoints(points);
              const line = new THREE.Line(geometry, lineMaterial);
              group.add(line);
            }
          });
        });
      });

      this.borders = group;
      // Raised to 1.016 to stay above the Conquest Layer (which is now 1.015)
      this.borders.scale.set(1.016, 1.016, 1.016);
      earth.add(this.borders);
      console.log("Borders loaded.");

    } catch (e) {
      console.error("Failed to load borders:", e);
    }
  },

  latLonToVector3: function (lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));
    return { x, y, z };
  },

  toggleBorders: function (visible) {
    if (this.borders) this.borders.visible = visible;
  }
};

worldLayers.init();

// Make worldLayers globally accessible for UI controls
window.worldLayers = worldLayers;

// --- Phase 3: Conquest System (Texture Diffusion) ---
const conquestLayer = {
  width: 1024,
  height: 512,
  canvas: null,
  ctx: null,
  texture: null,
  mesh: null,
  landData: null, // Uint8ClampedArray (r,g,b,a)
  grid: null, // Uint8Array (Owner ID per pixel, 0=Empty)
  players: {}, // { [id]: { id, username, color, landCount, centerSum: {x,y,z,count}, sprite: THREE.Sprite } }
  frontier: {}, // { [id]: [pixelIndices] }
  nextPlayerId: 1, // Start dynamic players from 1
  alliances: [], // Yüklenen ittifaklar (LocalStorage'dan)

  // seeds: [], // KEEPING seeds for backward compat / initial spawn logic if needed, but primarily using players now.
  // Actually, let's keep seeds array for the generic "grow from seed" logic, but mapped to players.

  init: async function () {
    // 0. Cleanup Previous Mesh
    if (this.mesh && earth) {
      earth.remove(this.mesh);
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) this.mesh.material.dispose();
      this.mesh = null;
    }
    // Cleanup Sprites
    // Cleanup Sprites
    Object.values(this.players).forEach(p => {
      if (p.avatars) {
        p.avatars.forEach(av => {
          if (av.sprite) earth.remove(av.sprite);
          if (av.label) earth.remove(av.label);
        });
      } else if (p.sprite) {
        earth.remove(p.sprite);
      }
    });
    this.players = {};

    // Search scene for stale meshes
    if (earth) {
      for (let i = earth.children.length - 1; i >= 0; i--) {
        if (earth.children[i].name === 'ConquestOverlay' || earth.children[i].name === 'PlayerAvatar' || earth.children[i].material?.map?.image instanceof HTMLCanvasElement) {
          earth.remove(earth.children[i]);
        }
      }
    }

    // 1. Setup Canvas & Grid
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

    this.grid = new Uint8Array(this.width * this.height);
    this.imageData = this.ctx.createImageData(this.width, this.height);

    await this.loadLandMask();
    this.countTotalLand();
    this.computeConnectedComponents();

    this.createOverlay();

    // Initialize Default Players (1-10)


    // Call shared init defaults
    // this.initDefaultPlayers(); // DISABLED for production/clean start logic

    // Load State or Spawn Defaults
    const loaded = this.loadGameState();

    if (!loaded) {
      // Spawn 10 initial seeds for base colors if no saved state
      console.log("Spawning initial 10 base players... SKIPPED via visual fix request");
      // this.spawnSeeds(10);
    }

    this.loadAlliances(); // Yükle

    this.updateLeaderboard();

    // Setup debounced save (save max once per 2 seconds)
    let saveTimeout;
    this.saveGameStateDebounced = () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => this.saveGameState(), 2000);
    };
  },

  countTotalLand: function () {
    let count = 0;
    for (let i = 0; i < this.width * this.height; i++) {
      if (this.isLand(i)) count++;
    }
    this.totalLandPixels = count;
    // User request: 7000 clicks to full.
    this.pixelsPerClick = Math.ceil(this.totalLandPixels / 7000);
    console.log(`Conquest: Total Land: ${count}, Rate: ${this.pixelsPerClick} px/click`);

    // Update UI total
    const info = document.getElementById('total-land-info');
    if (info) info.innerText = `Toplam Kara: ${count.toLocaleString()} birim`;
  },

  computeConnectedComponents: function () {
    console.log("Computing Connected Components...");
    this.componentMap = new Uint16Array(this.width * this.height);
    let compId = 1;
    const visited = new Uint8Array(this.width * this.height);

    for (let i = 0; i < this.width * this.height; i++) {
      if (this.isLand(i) && visited[i] === 0) {
        // Start BFS for new component
        visited[i] = 1;
        this.componentMap[i] = compId;
        const queue = [i];

        let head = 0;
        while (head < queue.length) {
          const curr = queue[head++];
          const cx = curr % this.width;
          const cy = Math.floor(curr / this.width);

          // Neighbors (4-way)
          const offsets = [
            { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
            { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
          ];

          for (let n of offsets) {
            let nx = cx + n.dx;
            let ny = cy + n.dy;

            if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
              const nIdx = ny * this.width + nx;
              if (this.isLand(nIdx) && visited[nIdx] === 0) {
                visited[nIdx] = 1;
                this.componentMap[nIdx] = compId;
                queue.push(nIdx);
              }
            }
          }
        }
        compId++;
      }
    }
    console.log(`Conquest: Found ${compId - 1} connected components.`);
  },

  spawnPlayer: function (username, avatarUrl) {
    if (Object.keys(this.players).length >= 10000) {
      console.warn("Max players reached!");
      return null;
    }

    // Check if exists
    const existing = Object.values(this.players).find(p => p.username === username);
    if (existing) return existing;

    // FAZ-4.3: Deterministic Color from Username
    // FAZ-4.3: Strict Unique & Vibrant Colors
    const id = this.nextPlayerId++;

    // FAZ-4.3: Golden Angle for clean separation
    // Hue = (id * 137.508) % 360
    const goldenAngle = 137.50776405;
    const hue = (id * goldenAngle) % 360;
    const baseHue = hue / 360;

    // Vibrant Color: Saturation 100%, Lightness 50%
    const color = new THREE.Color().setHSL(baseHue, 1.0, 0.5);

    // Create Player Object
    this.players[id] = {
      id: id,
      username: username,
      avatar: avatarUrl,
      baseHue: baseHue,
      color: { r: color.r * 255, g: color.g * 255, b: color.b * 255 },
      landCount: 0,
      centerSum: { x: 0, y: 0, z: 0, count: 0 },
      avatars: []
    };

    // Initial Avatar (Primary)
    const sprite = this.createAvatarSprite(avatarUrl);
    sprite.url = avatarUrl; // to track different members
    const label = this.createLabelSprite(username);

    // Başlangıç pozisyonunu Pasifik Okyanusu'na koy (güney kutbu yerine)
    // lat=0, lon=-160° → orta Pasifik (büyük okyanus)
    const defaultPos = { x: -0.940, y: 0.0, z: 0.342 };
    const ds = 1.05; // sphere yüzeyine yakın
    sprite.position.set(defaultPos.x * ds, defaultPos.y * ds, defaultPos.z * ds);
    label.position.set(defaultPos.x * ds, defaultPos.y * ds + 0.06, defaultPos.z * ds);

    earth.add(sprite);
    earth.add(label);

    this.players[id].avatars.push({ sprite: sprite, label: label, fixedPos: null });


    // Attempt to spawn one pixel - first try empty land
    let spawnIdx = null;
    for (let attempt = 0; attempt < 200; attempt++) {
      const x = Math.floor(Math.random() * this.width);
      // FAZ-4.3: Seed Protection
      const y = Math.floor(Math.random() * (426 - 43 + 1)) + 43;
      const idx = y * this.width + x;

      // Must be land, unowned
      if (this.isLand(idx) && this.grid[idx] === 0) {
        spawnIdx = idx;
        break;
      }
    }

    // If no empty spot found, take random land from anyone
    if (spawnIdx === null) {
      console.log(`No empty spot for ${username}, taking random land...`);
      for (let attempt = 0; attempt < 500; attempt++) {
        const x = Math.floor(Math.random() * this.width);
        const y = Math.floor(Math.random() * (426 - 43 + 1)) + 43;
        const idx = y * this.width + x;

        if (this.isLand(idx)) {
          // Take this land from whoever owns it
          const oldOwner = this.grid[idx];
          if (oldOwner !== 0 && this.players[oldOwner]) {
            this.players[oldOwner].landCount--;
            // Remove from old owner's center calculation
            const v = this.latLonToVector3(y, x);
            this.players[oldOwner].centerSum.x -= v.x;
            this.players[oldOwner].centerSum.y -= v.y;
            this.players[oldOwner].centerSum.z -= v.z;
            this.players[oldOwner].centerSum.count--;
          }
          spawnIdx = idx;
          break;
        }
      }
    }

    if (spawnIdx !== null) {
      const y = Math.floor(spawnIdx / this.width);
      const x = spawnIdx % this.width;

      this.grid[spawnIdx] = id;
      if (!this.frontier) this.frontier = {};
      this.frontier[id] = [spawnIdx];
      this.updatePixelVisual(spawnIdx); // Use new visual update
      this.players[id].landCount = 1;

      const v = this.latLonToVector3(y, x);
      this.players[id].centerSum.x += v.x;
      this.players[id].centerSum.y += v.y;
      this.players[id].centerSum.z += v.z;
      this.players[id].centerSum.count++;

      this.updateAvatarPosition(id);
      this.texture.needsUpdate = true;
      this.updateLeaderboard();
      return this.players[id];
    }

    console.warn("Could not find any land for new player", username);
    // Clean up if we couldn't spawn
    earth.remove(sprite);
    earth.remove(label);
    delete this.players[id];
    return null;
  },

  createAvatarSprite: function (url) {
    const defaultUrl = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png';
    const finalUrl = url || defaultUrl;

    const material = new THREE.SpriteMaterial({ map: new THREE.TextureLoader().load(finalUrl) });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.08, 0.08, 0.08);
    sprite.name = 'PlayerAvatar';

    const loader = new THREE.TextureLoader();
    loader.load(finalUrl, (tex) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      // Canvas merkez ve yariçap ayarları
      const centerX = 128;
      const centerY = 128;
      const radius = 106; // Resmi kırpmak için pay

      // 1. Resmi yuvarlak kırparak çizme
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(tex.image, 0, 0, 256, 256);
      ctx.restore();

      // 2. Ateşli Kızıl Daire Çemberi Çizimi
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);

      // Ateş parlaması gölgesi
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#ff2a00'; // Koyu ateş/kızıl gölge

      // Dış ateşli turuncu/kızıl hat
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#ff3300';
      ctx.stroke();

      // İç parlak sarımtırak merkez hattı (ateşin içi)
      ctx.shadowBlur = 0;
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#ffcc00';
      ctx.stroke();

      const roundTex = new THREE.CanvasTexture(canvas);
      roundTex.colorSpace = THREE.SRGBColorSpace;
      sprite.material.map = roundTex;
      sprite.material.needsUpdate = true;
    });

    return sprite;
  },

  // Eski updateAvatarPosition silindi.
  createLabelSprite: function (text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // 1. Measure Text first
    ctx.font = 'bold 42px Arial';
    const metrics = ctx.measureText(text);
    const textWidth = Math.ceil(metrics.width);

    // 2. Dynamic Width (Min 256, Max based on text + padding)
    const padding = 40;
    const width = Math.max(256, textWidth + padding);
    const height = 64; // Keep height fixed for consistency

    canvas.width = width;
    canvas.height = height;

    // 3. Redraw with new dimensions
    ctx.font = 'bold 42px Arial'; // Reset font after resize

    // Background (Darker/Cleaner/Fully Curved Pill Shape)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.beginPath();
    // Use roundRect if supported, otherwise rect
    if (ctx.roundRect) {
      ctx.roundRect(0, 0, width, height, height / 2); // Tam yuvarlak kavisli (pill shape)
    } else {
      ctx.rect(0, 0, width, height);
    }
    ctx.fill();

    // Text (Larger/Bolder)
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;
    ctx.fillText(text, width / 2, height / 2 + 2); // Center X, Center Y (+2 for visual balance)

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter; // Better scaling

    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
    const sprite = new THREE.Sprite(mat);

    // Store aspect ratio for scaler
    sprite.userData = { aspect: width / height };

    return sprite;
  },

  findRandomOwnedPixel: function (id) {
    // Try 50 times to find a pixel owned by ID
    for (let i = 0; i < 50; i++) {
      const idx = Math.floor(Math.random() * (this.width * this.height));
      if (this.grid[idx] === id) {
        const y = Math.floor(idx / this.width);
        const x = idx % this.width;
        const v = this.latLonToVector3(y, x);
        // Project to surface
        return new THREE.Vector3(v.x * 1.05, v.y * 1.05, v.z * 1.05);
      }
    }
    return null;
  },

  setLabelScale: function (val) {
    this.labelScale = parseFloat(val);
    // Determine invalidation
    Object.keys(this.players).forEach(id => this.updateAvatarPosition(id));
  },

  latLonToVector3: function (y, x) {
    // Inverse of map projection
    const lat = 90 - (y / this.height) * 180;
    const lon = (x / this.width) * 360 - 180;

    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const r = 1.0;

    return {
      x: -(r * Math.sin(phi) * Math.cos(theta)),
      z: (r * Math.sin(phi) * Math.sin(theta)),
      y: (r * Math.cos(phi))
    };
  },

  spawnSeeds: function (count) {
    console.log(`Spawning ${count} seeds... Players:`, Object.keys(this.players).length);
    let spawned = 0;
    let attempts = 0;
    while (spawned < count && attempts < 1000) {
      attempts++;
      const id = spawned + 1; // 1 to 10
      if (!this.players[id]) {
        console.warn(`Player ${id} missing in init!`);
        continue;
      }

      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      const idx = y * this.width + x;

      if (this.isLand(idx) && this.grid[idx] === 0) {
        this.grid[idx] = id;
        this.frontier[id] = [idx];
        this.frontier[id] = [idx];
        this.updatePixelVisual(idx); // Use new visual update
        this.players[id].landCount = 1;
        spawned++;
      }
    }
    console.log(`Spawned ${spawned} seeds after ${attempts} attempts.`);
    this.texture.needsUpdate = true;
  },

  // Helper for direct pixel color update
  updatePixelColor: function (idx, color) {
    const pIdx = idx * 4;
    this.imageData.data[pIdx] = color.r;
    this.imageData.data[pIdx + 1] = color.g;
    this.imageData.data[pIdx + 2] = color.b;
    this.imageData.data[pIdx + 3] = 180;
  },

  loadLandMask: function () {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.width;
        tempCanvas.height = this.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0, this.width, this.height);
        this.landData = tempCtx.getImageData(0, 0, this.width, this.height).data;
        console.log("Conquest: Land Mask Loaded.");
        resolve();
      };
      img.onerror = () => {
        console.warn("Conquest: Land Mask Failed. Defaulting to empty.");
        this.landData = new Uint8ClampedArray(this.width * this.height * 4); // Empty
        resolve();
      };
      img.src = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg';
    });
  },

  createOverlay: function () {
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.magFilter = THREE.NearestFilter;

    // Radius increased to 1.015 to ensure it visually covers mountains/rough terrain ("Havadan boyama")
    const geometry = new THREE.SphereGeometry(1.015, 64, 64);
    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0.7,
      side: THREE.FrontSide,
      blending: THREE.NormalBlending
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = 'ConquestOverlay';
    earth.add(this.mesh);
  },

  isLand: function (index) {
    if (!this.landData) return false;
    // South Pole Restriction: Reject if y > 470 (Approx -75 deg Lat)
    const y = Math.floor(index / this.width);
    if (y > 470) return false; // Strictly no-go zone

    return this.landData[index * 4] < 50;
  },

  capturePixel: function (idx, newOwner) {
    if (this.gameEnded) return; // Stop processing if game over
    if (idx < 0 || idx >= this.grid.length) return;

    const oldOwner = this.grid[idx];
    if (oldOwner === newOwner) return;

    // Update Old Owner
    if (oldOwner > 0 && this.players[oldOwner]) {
      this.players[oldOwner].landCount--;

      // Update Center (Subtract)
      // Update Center (Subtract)
      if (this.players[oldOwner].centerSum.count > 0) {
        const y = Math.floor(idx / this.width);
        const x = idx % this.width;
        const v = this.latLonToVector3(y, x);
        this.players[oldOwner].centerSum.x -= v.x;
        this.players[oldOwner].centerSum.y -= v.y;
        this.players[oldOwner].centerSum.z -= v.z;
        this.players[oldOwner].centerSum.count--;
        this.updateAvatarPosition(oldOwner);
      }

      // Phase 5.1: Defeat Detection
      if (this.players[oldOwner].landCount <= 0 && !this.players[oldOwner].isDead) {
        console.log(`Player DEFEATED: ${this.players[oldOwner].username}`);
        this.players[oldOwner].isDead = true; // Mark dead immediately before dispatch

        window.dispatchEvent(new CustomEvent('GAME_EVENT', {
          detail: {
            type: 'PLAYER_DEFEATED',
            data: { ...this.players[oldOwner] } // Clone data just in case
          }
        }));

        // Remove from game?
        // User says "Listedende silinecek".
        // If we delete, we might break references if other things loop players.
        // Safe way: Mark as 'dead' and filter in getLeaderboardData.
        // this.players[oldOwner].isDead = true; // Moved up

        // Also remove avatar sprites
        if (this.players[oldOwner].sprite) this.players[oldOwner].sprite.visible = false;
        if (this.players[oldOwner].avatars) {
          this.players[oldOwner].avatars.forEach(av => {
            if (av.sprite) av.sprite.visible = false;
            if (av.label) av.label.visible = false;
          });
        }
      }
    }

    // Update New Owner
    this.grid[idx] = newOwner;

    // Update Frontier
    if (!this.frontier[newOwner]) this.frontier[newOwner] = [];
    this.frontier[newOwner].push(idx);

    // FIX: Arkadan saldırılara karşılık - Eski komşuları eski sahibinin frontier'ına (sınırlarına) ekle
    if (oldOwner > 0 && oldOwner !== newOwner && this.frontier[oldOwner]) {
      const cx = idx % this.width;
      const cy = Math.floor(idx / this.width);
      const offsets = [
        { x: 1, y: 0 }, { x: -1, y: 0 },
        { x: 0, y: 1 }, { x: 0, y: -1 }
      ];
      for (let off of offsets) {
        let nx = cx + off.x;
        let ny = cy + off.y;
        if (nx >= this.width) nx = 0;
        if (nx < 0) nx = this.width - 1;
        if (ny >= 0 && ny < this.height) {
          const nIdx = ny * this.width + nx;
          // Saldıran kişinin ele geçirdiği bu hücrenin komşuları eğer hala eski sahibindeyse o komşular yeni sınır olmuştur.
          if (this.grid[nIdx] === oldOwner) {
            this.frontier[oldOwner].push(nIdx);
          }
        }
      }
    }

    // Update Visuals (and Neighbors for Borders)
    // Update Visuals (and Neighbors for Borders)
    this.updatePixelVisual(idx);
    // Check neighbors to update borders correctly without full redraw
    this.checkNeighborsVisual(idx);

    if (this.players[newOwner]) {
      this.players[newOwner].landCount++;
      const y = Math.floor(idx / this.width);
      const x = idx % this.width;
      const v = this.latLonToVector3(y, x);
      this.players[newOwner].centerSum.x += v.x;
      this.players[newOwner].centerSum.y += v.y;
      this.players[newOwner].centerSum.z += v.z;
      this.players[newOwner].centerSum.count++;
      this.updateAvatarPosition(newOwner);
    }

    // Update Leaderboard
    // Update Leaderboard
    this.updateLeaderboard();

    // Check Win Condition
    if (this.players[newOwner] && this.players[newOwner].landCount >= this.totalLandPixels) {
      this.handleWin(newOwner);
    }
  },

  handleWin: function (winnerId) {
    if (this.gameEnded) return;
    this.gameEnded = true;
    const winner = this.players[winnerId];
    // Trigger fireworks or something? For now alert.
    setTimeout(() => {
      alert(`OYUN BİTTİ! TEBRİKLER ${winner.username}! TÜM DÜNYAYI FETHETTİNİZ!`);
      // Optional: Reset automatically?
      // this.resetMap();
    }, 100);
  },

  // Base64 Helpers for efficient storage
  uint8ToBase64: function (u8Arr) {
    const CHUNK_SIZE = 0x8000;
    let index = 0;
    let length = u8Arr.length;
    let result = '';
    let slice;
    while (index < length) {
      slice = u8Arr.subarray(index, Math.min(index + CHUNK_SIZE, length));
      result += String.fromCharCode.apply(null, slice);
      index += CHUNK_SIZE;
    }
    return btoa(result);
  },

  base64ToUint8: function (base64) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
  },



  getLeaderboardData: function () {
    // console.log("LB Data requested. Players:", Object.keys(this.players).length);
    return Object.values(this.players)
      .filter(p => !p.isDead) // Phase 5.1: Hide dead players
      .sort((a, b) => b.landCount - a.landCount)
      .map((p, index) => ({
        rank: index + 1,
        username: p.username,
        avatar: p.avatar,
        color: p.color,
        landCount: p.landCount
      }));
  },

  addPixel: function (idx, id) { this.capturePixel(idx, id); },
  handleClick: function () { },

  reset: function () {
    console.log("Resetting FAZ-4.3...");
    this.grid.fill(0);
    this.imageData.data.fill(0);
    this.ctx.putImageData(this.imageData, 0, 0);
    if (this.texture) this.texture.needsUpdate = true;

    this.frontier = {};

    // Clear players
    if (this.players) {
      Object.values(this.players).forEach(p => {
        if (p.sprite) earth.remove(p.sprite);
      });
    }
    this.players = {};
    this.init();
  },

  toggleAvatars: function () {
    this.avatarsVisible = !this.avatarsVisible;
    Object.values(this.players).forEach(p => {
      if (p.sprite) p.sprite.visible = this.avatarsVisible;
    });
    console.log("Avatars Toggled:", this.avatarsVisible);
  },


  grow: function (playerId, amount, skipRedraw = false, trackVictims = false) {
    if (!this.frontier[playerId]) this.frontier[playerId] = [];

    // Phase 5.1: Track Victims
    const victimStats = trackVictims ? {} : null; // Map<id, count>

    let front = this.frontier[playerId];
    if (!front || front.length === 0) {
      this.forceGlobalJump(playerId);
      front = this.frontier[playerId];
      if (!front || front.length === 0) return null;
    }

    let processed = 0;
    // SABİT ORAN: 1 Jeton = 20 Piksel (büyük/küçük fark yok)
    const baseRate = 20;
    const limit = baseRate * (amount || 1);

    // O(1) swap-remove: ölü hücreyi frontier'dan anında at
    const swapRemove = (arr, i) => {
      arr[i] = arr[arr.length - 1];
      arr.pop();
    };

    // FIX: attempts sadece GERÇEk genişleme denemelerini sayar (swap-remove sayılmaz)
    let attempts = 0;
    const maxAttempts = limit * 30; // Harita doluyken daha fazla deneme

    while (processed < limit) {
      // Frontier boşaldıysa döngü içinde yeni kıtaya atla
      if (front.length === 0) {
        this.forceGlobalJump(playerId);
        front = this.frontier[playerId];
        if (front.length === 0) break; // Hiç arazi kalmadı
        attempts = 0; // Yeni kıtada sayacı sıfırla
      }

      attempts++;
      if (attempts > maxAttempts) break;

      // Eşit ve dairesel yayılım (Eden Growth) — Her yöne eşit yaygınlaşması için tamamen rastgele seçim yap
      let currFrontIdx = Math.floor(Math.random() * front.length);
      let currIdx = front[currFrontIdx];

      // Eski sahiplik kontrolü: taşınmış/geçersiz hücreyi anında çıkar (attempts SAYILMAZ)
      if (this.grid[currIdx] !== playerId) {
        swapRemove(front, currFrontIdx);
        attempts--; // Swap-remove boşa harcanan attempt değil
        continue;
      }

      const cx = currIdx % this.width;
      const cy = Math.floor(currIdx / this.width);

      const offsets = [
        { x: 1, y: 0 }, { x: -1, y: 0 },
        { x: 0, y: 1 }, { x: 0, y: -1 }
      ];

      offsets.sort(() => Math.random() - 0.5);

      let grown = false;
      for (let off of offsets) {
        let nx = cx + off.x;
        let ny = cy + off.y;

        if (nx >= this.width) nx = 0;
        if (nx < 0) nx = this.width - 1;
        if (ny < 0 || ny >= this.height) continue;

        const nIdx = ny * this.width + nx;

        if (this.isLand(nIdx) && this.grid[nIdx] !== playerId) {

          // Phase 5.1: Victim Tracking
          if (trackVictims) {
            const oldOwner = this.grid[nIdx];
            if (oldOwner > 0 && oldOwner !== playerId) {
              if (!victimStats[oldOwner]) victimStats[oldOwner] = 0;
              victimStats[oldOwner]++;
            }
          }

          this.capturePixel(nIdx, playerId);
          processed++;
          grown = true;
          if (processed >= limit) break;
        }
      }

      if (!grown) {
        // Komşu bulunamadı: önce yakın atlama dene
        if (this.attemptIslandJump(currIdx, playerId)) {
          processed++;
        } else {
          // Hiç genişleyemez — ölü hücre, frontier'dan at (O(1))
          swapRemove(front, currFrontIdx);
          attempts--; // Ölü hücre temizliği attempt sayılmaz
        }
      }
    }

    // FIX: Döngü maxAttempts ile bittiyse eksik pikselleri global atlama ile telafi et
    if (processed < limit) {
      const remaining = limit - processed;
      for (let i = 0; i < remaining; i++) {
        if (this.forceGlobalJumpSingle(playerId)) {
          processed++;
        } else {
          break; // Hiç arazi kalmadı
        }
      }
    }

    if (!skipRedraw) {
      this.updateTexture();
    }

    if (this.saveGameStateDebounced) this.saveGameStateDebounced();

    // Phase 5.1: Return Battle Report
    if (trackVictims && processed > 0) {
      return {
        processed: processed,
        victims: (victimStats && Object.keys(victimStats).length > 0) ? Object.entries(victimStats).map(([id, count]) => ({
          id: parseInt(id),
          count: count,
          username: this.players[id]?.username || 'Bilinmeyen',
          avatar: this.players[id]?.avatar
        })) : []
      };
    }
    return null;
  },


  jumpToNearestLand: function (playerId) {
    const front = this.frontier[playerId];
    if (!front || front.length === 0) return false;

    const samples = [];
    const sampleCount = Math.min(10, front.length);
    for (let i = 0; i < sampleCount; i++) {
      samples.push(front[Math.floor(Math.random() * front.length)]);
    }

    const radii = [10, 20, 40, 80, 150, 300, 500, 800];

    for (let r of radii) {
      for (let startIdx of samples) {
        const cx = startIdx % this.width;
        const cy = Math.floor(startIdx / this.width);
        const steps = 24;
        for (let angle = 0; angle < Math.PI * 2; angle += (Math.PI * 2 / steps)) {
          const dx = Math.cos(angle) * r;
          const dy = Math.sin(angle) * r;
          let nx = Math.round(cx + dx);
          let ny = Math.round(cy + dy);
          if (nx >= this.width) nx = nx % this.width;
          if (nx < 0) nx = this.width + nx;
          if (ny < 0 || ny >= this.height) continue;
          const targetIdx = ny * this.width + nx;
          if (this.isLand(targetIdx) && this.grid[targetIdx] !== playerId) {
            this.capturePixel(targetIdx, playerId);
            console.log(`Smart Jump: Found land at dist ${r} for ${playerId}`);
            return true;
          }
        }
      }
    }
    console.log("Smart Jump failed: No land found within 800px.");
    return false;
  },

  attemptIslandJump: function (centerIdx, playerId, range = 3) {
    const cx = centerIdx % this.width;
    const cy = Math.floor(centerIdx / this.width);
    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        if (dx === 0 && dy === 0) continue;
        let nx = cx + dx;
        let ny = cy + dy;
        if (nx >= this.width) nx = nx % this.width;
        if (nx < 0) nx = this.width + nx;
        if (ny < 0 || ny >= this.height) continue;
        const idx = ny * this.width + nx;
        if (this.isLand(idx) && this.grid[idx] !== playerId) {
          this.capturePixel(idx, playerId);
          return true;
        }
      }
    }
    return false;
  },

  forceGlobalJump: function (playerId) {
    if (this.jumpToNearestLand(playerId)) return;
    for (let attempt = 0; attempt < 1000; attempt++) {
      const idx = Math.floor(Math.random() * (this.width * this.height));
      if (this.isLand(idx) && this.grid[idx] !== playerId) {
        this.capturePixel(idx, playerId);
        console.log(`GlobalJump: Oyuncu ${playerId} yeni kıtaya atladı (idx=${idx})`);
        return;
      }
    }
    console.warn(`GlobalJump: Oyuncu ${playerId} için hiç boş arazi bulunamadı.`);
  },

  // Tek piksel atlama — eksik piksel telafisi için
  // Harita neredeyse doluysa lineer tarama garantili sonuç verir
  forceGlobalJumpSingle: function (playerId) {
    const total = this.width * this.height;

    // 1. Önce 300 rastgele deneme (hızlı yol)
    for (let attempt = 0; attempt < 300; attempt++) {
      const idx = Math.floor(Math.random() * total);
      if (this.isLand(idx) && this.grid[idx] !== playerId) {
        this.capturePixel(idx, playerId);
        return true;
      }
    }

    // 2. Rastgele başarısız → tüm gridi rastgele başlangıç noktasından tara (garantili)
    const start = Math.floor(Math.random() * total);
    for (let i = 0; i < total; i++) {
      const idx = (start + i) % total;
      if (this.isLand(idx) && this.grid[idx] !== playerId) {
        this.capturePixel(idx, playerId);
        return true;
      }
    }

    return false; // Gerçekten hiç arazi kalmadı
  },


  showToast: function (msg) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.innerText = msg;

    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  spawnTestPlayer: function () {
    const testId = 999;
    if (!this.players[testId]) {
      // Create Test Bot if not exists
      const bot = {
        id: testId,
        username: "TestBot 🤖",
        avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=test", // Reliable placeholder
        color: { r: 255, g: 0, b: 255 }, // Magenta
        landCount: 0,
        centerSum: { x: 0, y: 0, z: 0, count: 0 },
        avatars: []
      };

      this.players[testId] = bot;

      // Spawn at a random safe spot
      let spawned = false;
      for (let i = 0; i < 100; i++) {
        const idx = Math.floor(Math.random() * (this.width * this.height));
        if (this.isLand(idx) && this.grid[idx] === 0) {
          this.capturePixel(idx, testId);
          spawned = true;
          this.updateAvatarPosition(testId);
          break;
        }
      }

      if (!spawned) {
        this.showToast("Test Bot için boş alan bulunamadı!");
        return;
      }
      this.showToast("Test Bot Oyuna Girdi!");
    }

    // Grow the bot
    this.grow(testId, 50); // Simulate 50 coins worth
    this.showToast(`Test Bot büyüyor! (${this.players[testId].landCount} birim)`);
  },

  forceNewContinentExpansion: function (playerId) {
    const player = this.players[playerId];
    if (!player) return;

    for (let attempt = 0; attempt < 500; attempt++) {
      const idx = Math.floor(Math.random() * (this.width * this.height));

      // Must be land
      if (!this.isLand(idx)) continue;

      // South Pole Restriction already handled in isLand, but double check y if needed
      // const y = Math.floor(idx / this.width);
      // if (y > 470) continue; 

      // Must not already belong to this player (can be empty OR opponent)
      // Opponent land is VALID for expansion (Conquest mode)
      if (this.grid[idx] === playerId) continue;

      // Capture (this adds to frontier automatically)
      this.capturePixel(idx, playerId);
      console.log(`>> Force Expansion: ${player.username} expanded to new continent at idx ${idx}`);
      return;
    }
    console.warn(`Force Expansion: No valid land found for ${player.username} after 500 attempts.`);
  },

  fillHoles: function (centerIdx, playerId, depth) {
    if (depth > 3) return; // Slightly increased depth

    const cx = centerIdx % this.width;
    const cy = Math.floor(centerIdx / this.width);

    // Rule 4: 8-way neighbor check (N, NE, E, SE, S, SW, W, NW)
    const offsets = [
      { x: 0, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 },
      { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1, y: 0 }, { x: -1, y: -1 }
    ];

    for (let off of offsets) {
      let nx = cx + off.x;
      let ny = cy + off.y;
      if (nx >= this.width) nx = 0;
      if (nx < 0) nx = this.width - 1;
      if (ny < 0 || ny >= this.height) continue;

      const nIdx = ny * this.width + nx;
      if (this.grid[nIdx] === playerId) continue;

      // Count neighbors (8-way)
      let myNeighbors = 0;
      const ncx = nIdx % this.width;
      const ncy = Math.floor(nIdx / this.width);

      for (let subOff of offsets) {
        let sx = ncx + subOff.x;
        let sy = ncy + subOff.y;
        if (sx >= this.width) sx = 0;
        if (sx < 0) sx = this.width - 1;
        if (sy < 0 || sy >= this.height) continue;

        const sIdx = sy * this.width + sx;
        if (this.grid[sIdx] === playerId) myNeighbors++;
      }

      // STRICT RULES application
      if (this.isLand(nIdx)) {
        // If reachable land with >= 2 neighbors, take it (removed componentMap check)
        if (myNeighbors >= 2) {
          this.capturePixel(nIdx, playerId);
          this.fillHoles(nIdx, playerId, depth + 1);
        }
      } else if (myNeighbors >= 4) {
        // Mountain/Artifact patching (forced) if surrounded by 4+ (stronger check for 8-way)
        if (this.componentMap[nIdx] === 0) this.componentMap[nIdx] = this.componentMap[centerIdx];
        this.capturePixel(nIdx, playerId);
        this.fillHoles(nIdx, playerId, depth + 1);
      }
    }
  },

  // RULE 2 & 5: Global Sweep & Validation
  validateAndFixLand: function () {
    console.log("Running Global Land Cleanup (8-way)...");
    let fixedCount = 0;
    const offsets = [
      { x: 0, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 },
      { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1, y: 0 }, { x: -1, y: -1 }
    ];

    for (let i = 0; i < this.grid.length; i++) {
      // Identify unowned land (Rule 1: Invariant)
      if (this.grid[i] === 0 && this.isLand(i)) {

        // Rule 3: Hole Fill (Majority Vote)
        const neighborCounts = {};
        let maxColor = 0;
        let maxCount = 0;

        const cx = i % this.width;
        const cy = Math.floor(i / this.width);

        for (let off of offsets) {
          let nx = cx + off.x;
          let ny = cy + off.y;
          if (nx >= this.width) nx = 0;
          if (nx < 0) nx = this.width - 1;
          if (ny < 0 || ny >= this.height) continue;

          const nIdx = ny * this.width + nx;
          const owner = this.grid[nIdx];
          if (owner > 0) {
            neighborCounts[owner] = (neighborCounts[owner] || 0) + 1;
            if (neighborCounts[owner] > maxCount) {
              maxCount = neighborCounts[owner];
              maxColor = owner;
            }
          }
        }

        if (maxCount > 0) {
          // Assign to majority
          this.grid[i] = maxColor;
          // Don't add to frontier, just fill.
          fixedCount++;
        } else {
          // No fallback to nearest seed needed usually if majority fails?
          // Keep empty if surrounded by empty.
        }
      }
    }

    if (fixedCount > 0) {
      console.log(`Global Cleanup: Fixed ${fixedCount} uncolored land pixels.`);
      this.redrawAll(); // Force full redraw to fix borders
      if (this.texture) this.texture.needsUpdate = true;
      this.updateLeaderboard();
    } else {
      console.log("Global Cleanup: No holes found. Map is clean.");
    }
  },

  updateLeaderboard: function (force = false) {
    const now = Date.now();
    if (!force && now - (this.lastLBUpdate || 0) < 250) {
      if (!this.lbPending) {
        this.lbPending = true;
        setTimeout(() => {
          this.lbPending = false;
          this.updateLeaderboard(true);
        }, 250);
      }
      return;
    }
    this.lastLBUpdate = now;

    const tbody = document.querySelector('#leaderboard-table tbody');
    if (!tbody) return;

    // Calculate Scores from players object
    const scores = [];
    Object.values(this.players).forEach(p => {
      scores.push({
        id: p.id,
        username: p.username,
        score: p.landCount,
        color: p.color
      });
    });

    // Sort
    scores.sort((a, b) => b.score - a.score);

    // Limit to top 10? Or all visible?
    // Let's show all for now or top 20
    // Limit to top 20
    const top = scores.slice(0, 20);

    // Render
    tbody.innerHTML = '';
    top.forEach((p, index) => {
      const tr = document.createElement('tr');
      const colorHex = `rgb(${p.color.r},${p.color.g},${p.color.b})`;

      tr.innerHTML = `
            <td>${index + 1}</td>
            <td><span class="color-dot" style="background:${colorHex}"></span>${p.username}</td>
            <td>${p.score.toLocaleString()}</td>
          `;
      tbody.appendChild(tr);
    });
  },

  // --- Border Logic & Visual Helpers ---

  // Check if a pixel is a border pixel (Strict 4-neighbor)
  isBorderPixel: function (idx) {
    const owner = this.grid[idx];
    if (owner === 0) return false; // Empty land has no border

    const cx = idx % this.width;
    const cy = Math.floor(idx / this.width);

    const offsets = [
      { x: 1, y: 0 }, { x: -1, y: 0 },
      { x: 0, y: 1 }, { x: 0, y: -1 }
    ];

    for (let off of offsets) {
      let nx = cx + off.x;
      let ny = cy + off.y;

      // Strict Bounds Check (No wrapping artifacts)
      if (nx >= this.width) nx = 0; // Seamless wrap X
      if (nx < 0) nx = this.width - 1;

      if (ny < 0 || ny >= this.height) continue; // Clamp Y

      const nIdx = ny * this.width + nx;

      // If any 4-neighbor is different owner (including empty), it's a border
      if (this.grid[nIdx] !== owner) {
        return true;
      }
    }
    return false;
  },

  updatePixelVisual: function (idx) {
    const owner = this.grid[idx];
    let color;

    if (owner === 0) {
      // Empty Land Visualization
      if (this.isLand(idx)) {
        color = { r: 30, g: 30, b: 30, a: 50 };
      } else {
        color = { r: 0, g: 0, b: 0, a: 0 };
      }
    } else {
      // Check if border - STRICT BLACK BORDER
      if (this.isBorderPixel(idx)) {
        color = { r: 0, g: 0, b: 0, a: 220 }; // Clean Black Border
      } else {
        // Inner Player Color
        const p = this.players[owner];
        if (p) {
          color = { r: p.color.r, g: p.color.g, b: p.color.b, a: 180 };
        } else {
          color = { r: 255, g: 255, b: 255, a: 180 }; // Fallback
        }
      }
    }

    // Direct Write
    const pIdx = idx * 4;
    this.imageData.data[pIdx] = color.r;
    this.imageData.data[pIdx + 1] = color.g;
    this.imageData.data[pIdx + 2] = color.b;
    this.imageData.data[pIdx + 3] = (color.a !== undefined) ? color.a : 0;
  },

  distanceToCentroid: function (idx, playerId) {
    const p = this.players[playerId];
    if (!p || p.centerSum.count === 0) return 9999;

    const y = Math.floor(idx / this.width);
    const x = idx % this.width;
    const v = this.latLonToVector3(y, x);

    const cx = p.centerSum.x / p.centerSum.count;
    const cy = p.centerSum.y / p.centerSum.count;
    const cz = p.centerSum.z / p.centerSum.count;

    return (
      (v.x - cx) * (v.x - cx) +
      (v.y - cy) * (v.y - cy) +
      (v.z - cz) * (v.z - cz)
    );
  },

  removeDisconnectedIslands: function (playerId) {
    const player = this.players[playerId];
    if (!player || player.landCount < 50) return;

    const owned = [];
    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] === playerId) owned.push(i);
    }

    const visited = new Set();
    const components = [];

    const offsets = [
      { x: 1, y: 0 }, { x: -1, y: 0 },
      { x: 0, y: 1 }, { x: 0, y: -1 }
    ];

    for (let start of owned) {
      if (visited.has(start)) continue;

      const stack = [start];
      const comp = [];
      visited.add(start);

      while (stack.length > 0) {
        const curr = stack.pop();
        comp.push(curr);

        const cx = curr % this.width;
        const cy = Math.floor(curr / this.width);

        for (let off of offsets) {
          let nx = cx + off.x;
          let ny = cy + off.y;

          if (nx >= this.width) nx = 0;
          if (nx < 0) nx = this.width - 1;
          if (ny < 0 || ny >= this.height) continue;

          const nIdx = ny * this.width + nx;

          if (this.grid[nIdx] === playerId && !visited.has(nIdx)) {
            visited.add(nIdx);
            stack.push(nIdx);
          }
        }
      }
      components.push(comp);
    }

    if (components.length <= 1) return;

    // Find largest
    components.sort((a, b) => b.length - a.length);

    // Keep largest, remove others
    // const main = new Set(components[0]); // Not needed if we just iterate others

    for (let i = 1; i < components.length; i++) {
      for (let idx of components[i]) {
        this.grid[idx] = 0; // Reset to empty
      }
    }

    // We modified grid, so centroids might be slightly off, but recalculateCentroids
    // is called periodically or can be called here if strict precision needed.
    // Given perf constraints, maybe skip explicit recalc here as grow does it next tick if needed?
    // User requested "this.recalculateCentroids();" in plan, so adding it.
    this.recalculateCentroids();
  },

  fillMicroGaps: function (playerId) {
    const offsets = [
      { x: 1, y: 0 }, { x: -1, y: 0 },
      { x: 0, y: 1 }, { x: 0, y: -1 }
    ];

    const toCapture = [];

    for (let i = 0; i < this.grid.length; i++) {

      if (!this.isLand(i)) continue;
      if (this.grid[i] !== 0) continue;

      let sameOwnerCount = 0;

      const cx = i % this.width;
      const cy = Math.floor(i / this.width);

      for (let off of offsets) {
        let nx = cx + off.x;
        let ny = cy + off.y;

        if (nx >= this.width) nx = 0;
        if (nx < 0) nx = this.width - 1;
        if (ny < 0 || ny >= this.height) continue;

        const nIdx = ny * this.width + nx;

        if (this.grid[nIdx] === playerId) {
          sameOwnerCount++;
        }
      }

      if (sameOwnerCount >= 3) {
        toCapture.push(i);
      }
    }

    // Toplu capture (loop sırasında grid değiştirmiyoruz)
    toCapture.forEach(idx => {
      this.capturePixel(idx, playerId);
    });
  },

  checkNeighborsVisual: function (idx) {
    const cx = idx % this.width;
    const cy = Math.floor(idx / this.width);

    const offsets = [
      { x: 1, y: 0 }, { x: -1, y: 0 },
      { x: 0, y: 1 }, { x: 0, y: -1 }
    ];

    for (let off of offsets) {
      let nx = cx + off.x;
      let ny = cy + off.y;
      if (nx >= this.width) nx = 0;
      if (nx < 0) nx = this.width - 1;
      if (ny < 0 || ny >= this.height) continue;

      const nIdx = ny * this.width + nx;
      // Update neighbor visual (it might have become border or stopped being border)
      // Check if land to avoid excessive sea updates
      if (this.grid[nIdx] !== 0 || this.isLand(nIdx)) {
        this.updatePixelVisual(nIdx);
      }
    }
  },

  redrawAll: function () {
    console.log("Redrawing all pixels with borders...");
    for (let i = 0; i < this.width * this.height; i++) {
      this.updatePixelVisual(i);
    }
    this.updateTexture();
  },

  updateTexture: function () {
    this.ctx.putImageData(this.imageData, 0, 0);
    if (this.texture) this.texture.needsUpdate = true;
  },

  recalculateCentroids: function () {
    // Reset stats
    Object.values(this.players).forEach(p => {
      p.landCount = 0;
      p.centerSum = { x: 0, y: 0, z: 0, count: 0 };
    });

    for (let i = 0; i < this.width * this.height; i++) {
      const owner = this.grid[i];
      if (owner > 0 && this.players[owner]) {
        this.players[owner].landCount++;
        const y = Math.floor(i / this.width);
        const x = i % this.width;
        const v = this.latLonToVector3(y, x);
        this.players[owner].centerSum.x += v.x;
        this.players[owner].centerSum.y += v.y;
        this.players[owner].centerSum.z += v.z;
        this.players[owner].centerSum.count++;
      }
    }

    // Update Avatars
    Object.keys(this.players).forEach(id => this.updateAvatarPosition(id));
  },

  updateAvatarPosition: function (playerId) {
    const p = this.players[playerId];
    if (!p || p.avatars.length === 0) return;

    let center = new THREE.Vector3(0, 0, 0);
    if (p.centerSum.count > 0) {
      center.set(
        p.centerSum.x / p.centerSum.count,
        p.centerSum.y / p.centerSum.count,
        p.centerSum.z / p.centerSum.count
      ).normalize();
    } else {
      // Fallback if no land (e.g., new player or lost all land)
      // Position at a default spot or hide
      p.avatars.forEach(av => {
        av.sprite.visible = false;
        if (av.label) av.label.visible = false;
      });
      return;
    }

    p.avatars.forEach(av => {
      av.sprite.visible = true;
      if (av.label) av.label.visible = this.showLabels !== false;
    });

    // 1. Determine Scale
    let scale = 1.0;
    if (p.landCount > 500) scale = 1.5;   // Stage 2
    if (p.landCount > 1500) scale = 2.0;  // Stage 3

    // Apply scale to sprites and labels
    p.avatars.forEach(av => {
      av.sprite.scale.set(scale * 0.075, scale * 0.075, 1);
      if (av.label) {
        const lblS = Math.min((this.labelScale || 1.0) * scale, 3.0);
        const aspect = av.label.userData.aspect || 4.0;
        av.label.scale.set(lblS * 0.025 * aspect, lblS * 0.025, 1);
      }
    });

    // Multi-avatar cluster
    const numAvatars = p.avatars.length;
    if (numAvatars <= 1 || p.isAlliance) { // Alliances keep them clustered together
      const spacing = 0.055 * scale; // Avatarlar arası mesafe (İyice daraltıldı, iç içe bütünlük)
      const sphereRadius = 1.05;

      // Yerel eksenleri hesapla (sağlam ve düzgün yerleşim için)
      const globUp = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(center, globUp).normalize();
      if (right.lengthSq() < 0.001) right.set(1, 0, 0); // Kutuplarda kurtarma
      const surfaceUp = new THREE.Vector3().crossVectors(right, center).normalize(); // Yüzeyde kuzeyi gösteren eksen

      for (let i = 0; i < numAvatars; i++) {
        const av = p.avatars[i];
        const shiftedCenter = new THREE.Vector3().copy(center);

        if (numAvatars === 3) {
          // Kusursuz Eşkenar Üçgen dizilimi
          if (i === 0) {
            shiftedCenter.addScaledVector(surfaceUp, spacing * 0.577); // Üst merkez
          } else if (i === 1) {
            shiftedCenter.addScaledVector(right, -spacing * 0.5); // Sol alt
            shiftedCenter.addScaledVector(surfaceUp, -spacing * 0.288);
          } else if (i === 2) {
            shiftedCenter.addScaledVector(right, spacing * 0.5); // Sağ alt
            shiftedCenter.addScaledVector(surfaceUp, -spacing * 0.288);
          }
        } else if (numAvatars === 2) {
          // 2 kişi ise yan yana
          const moveAmount = (i === 0 ? -0.5 : 0.5) * spacing;
          shiftedCenter.addScaledVector(right, moveAmount);
        } else {
          // 4 veya daha fazlaysa varsayılan yatay dizilim
          const offsetStart = -(numAvatars - 1) * spacing * 0.5;
          shiftedCenter.addScaledVector(right, offsetStart + (i * spacing));
        }

        shiftedCenter.normalize();
        av.sprite.position.copy(shiftedCenter).multiplyScalar(sphereRadius);

        // --- TEK İSİM DÜZENİ (İTTİFAK İSE SADECE GRUP ÜSTÜNDE 1 TANE GÖZÜKÜR) ---
        if (p.isAlliance) {
          if (i === 0) {
            // Sadece hiyerarşideki 1. resmin etiketini genel grup merkezinin (center) üzerine kavisli yerleştir.
            const centerLabelPos = new THREE.Vector3().copy(center).normalize().multiplyScalar(sphereRadius);
            // Üçgeninse daha da tepeye (0.04 scale normal offset + üçgen zirvesi + biraz ekstra)
            const extraHeight = (numAvatars === 3) ? (spacing * 0.65) : (spacing * 0.2);
            centerLabelPos.addScaledVector(globUp, (0.045 * scale) + extraHeight);

            if (av.label) {
              av.label.position.copy(centerLabelPos);
              av.label.visible = this.showLabels !== false;
            }
          } else {
            // Grupteki 2. ve 3. resimlerin kendi şahsi isim kutusunu gizle.
            if (av.label) av.label.visible = false;
          }
        } else {
          // Normal oyuncu, etiket her zamanki gibi kendi pozisyonunun üstündedir
          const labelPos = new THREE.Vector3().copy(shiftedCenter).multiplyScalar(sphereRadius);
          labelPos.addScaledVector(globUp, 0.045 * scale);
          if (av.label) {
            av.label.position.copy(labelPos);
            av.label.visible = this.showLabels !== false;
          }
        }
      }
    } else {
      // Normal Player multiple avatars spread to different clusters
      const clusters = p.clusters || [p.centerSum]; // fallback
      for (let i = 0; i < numAvatars; i++) {
        const cluster = clusters[i] || clusters[0]; // pick available
        const clusterCenter = new THREE.Vector3(cluster.x, cluster.y, cluster.z);
        if (clusterCenter.lengthSq() > 0) clusterCenter.normalize();
        else clusterCenter.copy(center);

        p.avatars[i].sprite.position.copy(clusterCenter).multiplyScalar(1.05);
        if (p.avatars[i].label) {
          p.avatars[i].label.position.set(
            clusterCenter.x * 1.05,
            (clusterCenter.y * 1.05) + (0.045 * scale),
            clusterCenter.z * 1.05
          );
        }
      }
    }
  },

  rebuildStatsAndFrontier: function () {
    console.log("Rebuilding stats and frontier from grid...");
    this.frontier = {};

    // Use the new standard function for stats
    this.recalculateCentroids();

    const offsets = [
      { x: 1, y: 0 }, { x: -1, y: 0 },
      { x: 0, y: 1 }, { x: 0, y: -1 }
    ];

    for (let i = 0; i < this.width * this.height; i++) {
      const owner = this.grid[i];
      if (owner !== 0) {
        // Frontier Logic
        let isFrontier = false;
        const cx = i % this.width;
        const cy = Math.floor(i / this.width);

        for (let off of offsets) {
          let nx = cx + off.x;
          let ny = cy + off.y;
          if (nx >= this.width) nx = 0;
          if (nx < 0) nx = this.width - 1;
          if (ny < 0 || ny >= this.height) continue;

          const nIdx = ny * this.width + nx;
          if (this.grid[nIdx] !== owner) {
            isFrontier = true;
            break;
          }
        }

        if (isFrontier) {
          if (!this.frontier[owner]) this.frontier[owner] = [];
          this.frontier[owner].push(i);
        }
      }
    }
    console.log("Rebuild complete.");
  },

  // RLE Compression Helpers
  compressGridRLE: function (grid) {
    let rle = [];
    let prev = grid[0];
    let count = 1;
    for (let i = 1; i < grid.length; i++) {
      if (grid[i] === prev) {
        count++;
      } else {
        rle.push(prev, count);
        prev = grid[i];
        count = 1;
      }
    }
    rle.push(prev, count);
    return rle;
  },

  decompressGridRLE: function (rle) {
    const size = this.width * this.height;
    const grid = new Uint8Array(size);
    let idx = 0;
    for (let i = 0; i < rle.length; i += 2) {
      const val = rle[i];
      const count = rle[i + 1];
      grid.fill(val, idx, idx + count);
      idx += count;
    }
    return grid;
  },

  saveGameState: function () {
    try {
      // Use RLE compression
      const rleGrid = this.compressGridRLE(this.grid);

      const state = {
        gridRLE: rleGrid, // New RLE format
        players: {},
        nextPlayerId: this.nextPlayerId
      };

      // Save players (Minimal Data)
      Object.keys(this.players).forEach(id => {
        const p = this.players[id];
        state.players[id] = {
          id: p.id,
          username: p.username,
          avatar: p.avatar,
          baseHue: p.baseHue,
          color: p.color,
          isAlliance: p.isAlliance || false, // Save alliance status
          allianceRefId: p.allianceRefId || null, // Save alliance reference
        };
      });

      const json = JSON.stringify(state);
      // Fallback check before saving
      if (json.length > 4500000) { // ~4.5MB safety limit
        console.warn("Save file too large, skipping save to prevent crash.");
        return;
      }
      localStorage.setItem('piardiarena_gamestate', json);
    } catch (e) {
      console.error('Failed to save game state (Quota):', e);
    }
  },

  loadGameState: function () {
    const saved = localStorage.getItem('piardiarena_gamestate');
    if (!saved) return false;

    try {
      const state = JSON.parse(saved);

      // Restore grid
      if (state.gridRLE) {
        this.grid = this.decompressGridRLE(state.gridRLE);
      } else if (typeof state.grid === 'string') {
        this.grid = this.base64ToUint8(state.grid);
      } else {
        // Fallback for old saves (array)
        this.grid = new Uint8Array(state.grid);
      }

      // Restore players
      this.players = {};
      Object.keys(state.players).forEach(id => {
        const p = state.players[id];
        this.players[id] = {
          id: p.id,
          username: p.username,
          avatar: p.avatar,
          baseHue: p.baseHue,
          color: p.color,
          landCount: 0, // Recalculate
          centerSum: { x: 0, y: 0, z: 0, count: 0 }, // Recalculate
          avatars: [],
          isAlliance: p.isAlliance || false, // Restore alliance status
          allianceRefId: p.allianceRefId || null, // Restore alliance reference
        };

        // Recreate avatar sprites
        // For alliances, we might have multiple avatars (one per member)
        if (p.isAlliance && this.alliances) {
          const allianceObj = this.alliances.find(a => a.id === p.allianceRefId);
          if (allianceObj && allianceObj.memberAvatars) {
            Object.values(allianceObj.memberAvatars).forEach(avatarUrl => {
              const sprite = this.createAvatarSprite(avatarUrl);
              sprite.url = avatarUrl; // Store URL for tracking
              const label = this.createLabelSprite(p.username); // Alliance name for all
              earth.add(sprite);
              earth.add(label);
              this.players[id].avatars.push({ sprite: sprite, label: label, fixedPos: null });
            });
          }
        } else {
          // Normal player, single avatar
          const sprite = this.createAvatarSprite(p.avatar);
          sprite.url = p.avatar; // Store URL for tracking
          const label = this.createLabelSprite(p.username);
          earth.add(sprite);
          earth.add(label);
          this.players[id].avatars.push({ sprite: sprite, label: label, fixedPos: null });
        }

        // Update avatar position
        this.updateAvatarPosition(id);
      });

      // Restore frontier (Rebuild dynamically to save space)
      // Recalculate Stats & Frontier together
      this.rebuildStatsAndFrontier();

      // Restore nextPlayerId
      this.nextPlayerId = state.nextPlayerId || 11;

      // Rebuild texture from grid
      // Rebuild texture from grid (using new redrawAll for borders)
      this.redrawAll();

      this.ctx.putImageData(this.imageData, 0, 0);
      if (this.texture) this.texture.needsUpdate = true;
      this.updateLeaderboard();

      console.log('Game state loaded successfully');
      return true;
    } catch (e) {
      console.error('Failed to load game state:', e);
      return false;
    }
  },

  syncAllianceAvatars: function (playerId, allianceObj) {
    let p = this.players[playerId];
    if (!p || !allianceObj || !allianceObj.memberAvatars) return;

    let activeUrls = Object.values(allianceObj.memberAvatars).filter(url => url);

    // 1. Temizlik: İttifak için geçerli olmayan (veya eski) avatarları haritadan kaldır ve sil.
    let toKeep = [];
    p.avatars.forEach(av => {
      if (!activeUrls.includes(av.url)) {
        if (typeof earth !== 'undefined') {
          if (av.sprite) earth.remove(av.sprite);
          if (av.label) earth.remove(av.label);
        }
      } else {
        toKeep.push(av);
      }
    });

    let cleanupChanged = (p.avatars.length !== toKeep.length);
    p.avatars = toKeep;

    // 2. Eksikleri Ekle
    let addedChanged = false;
    activeUrls.forEach(url => {
      const hasThisAvatar = p.avatars.some(a => a.url === url);
      if (!hasThisAvatar) {
        const sprite = this.createAvatarSprite(url);
        sprite.url = url;
        const label = this.createLabelSprite(p.username); // hepsi için ortak ittifak adı gösterilebilir.
        p.avatars.push({ sprite, label });
        if (typeof earth !== 'undefined') {
          earth.add(sprite);
          earth.add(label);
        }
        addedChanged = true;
      }
    });

    if (cleanupChanged || addedChanged) {
      this.updateAvatarPosition(p.id);
    }
  },

  loadAlliances: function () {
    const data = localStorage.getItem('customAlliances');
    this.alliances = data ? JSON.parse(data) : [];
  },

  getAllianceForUser: function (username) {
    if (!username) return null;
    const lower = username.toLowerCase();
    return this.alliances.find(a => a.members.some(m => m.toLowerCase() === lower));
  },

  addPlayerPoints: function (username, avatarUrl, additionalPoints = 20) {
    if (!username) return;

    let targetUsername = username;
    let isAlliance = false;
    let allianceObj = this.getAllianceForUser(username);

    // İttifaktaysa, hedef kullanıcı ittifak adıdır!
    if (allianceObj) {
      targetUsername = allianceObj.name;
      isAlliance = true;
      // İttifak modalında da avatarın görünmesi için kaydet
      if (!allianceObj.memberAvatars) allianceObj.memberAvatars = {};
      if (!allianceObj.memberAvatars[username.toLowerCase()]) {
        allianceObj.memberAvatars[username.toLowerCase()] = avatarUrl;
        localStorage.setItem('customAlliances', JSON.stringify(this.alliances));
        if (window.renderCustomAlliancesUI) window.renderCustomAlliancesUI();
      }
    }

    let p = Object.values(this.players).find(pl => pl.username === targetUsername);
    if (!p) {
      if (isAlliance) {
        // İttifak için özel yaratım (avatarUrl başlangıç için geçici)
        p = this.spawnPlayer(targetUsername, avatarUrl);
        if (p) {
          p.isAlliance = true;
          p.allianceRefId = allianceObj.id;
          // Rengi ittifaka göre değiştir
          const tempColor = new THREE.Color(`hsl(${allianceObj.baseHue * 360}, 100%, 55%)`);
          p.color = { r: tempColor.r * 255, g: tempColor.g * 255, b: tempColor.b * 255 };
          this.redrawPlayerTiles(p.id);
        }
      } else {
        p = this.spawnPlayer(targetUsername, avatarUrl);
      }
    } else {
      // Normal oyuncu, var olan sprite URL'sini güncelle
      if (!isAlliance) {
        if (p.avatars && p.avatars.length > 0 && p.avatar !== avatarUrl && avatarUrl) {
          p.avatar = avatarUrl;
          const loader = new THREE.TextureLoader();
          loader.load(avatarUrl, (t) => {
            p.avatars[0].sprite.material.map.dispose();
            p.avatars[0].sprite.material.map = t;
            p.avatars[0].sprite.material.needsUpdate = true;
          });
        }
      }
    }

    // İttifak ise: Bütün profillerin eşleştirilmesini (senkronize olmasını) sağla (Kopya sorunlarını önleyecek)
    if (p && isAlliance && allianceObj) {
      this.syncAllianceAvatars(p.id, allianceObj);
    }

    if (p) {
      this.grow(p.id, additionalPoints);
    }
  },

  resetMap: function () {
    // Clear grid
    this.grid.fill(0);

    // Clear texture
    for (let i = 0; i < this.imageData.data.length; i += 4) {
      this.imageData.data[i] = 0;
      this.imageData.data[i + 1] = 0;
      this.imageData.data[i + 2] = 0;
      this.imageData.data[i + 3] = 0;
    }

    // Remove all player avatars
    Object.values(this.players).forEach(p => {
      if (p.avatars) {
        p.avatars.forEach(av => {
          if (av.sprite) earth.remove(av.sprite);
          if (av.label) earth.remove(av.label);
        });
      }
    });

    // Clear players and frontier
    this.players = {};
    this.frontier = {};
    this.nextPlayerId = 1;
    this.loadAlliances(); // Reload alliances from memory instead of clearing them on map reset

    // Remove Test Players Logic
    // this.initDefaultPlayers(); // REMOVED

    // Update display
    this.ctx.putImageData(this.imageData, 0, 0);
    if (this.texture) this.texture.needsUpdate = true;
    this.updateLeaderboard();

    // Clear saved state
    localStorage.removeItem('piardiarena_gamestate');

    // Reset Game Indicators
    this.gameEnded = false;

    // Do NOT spawn seeds. Start clean.
    // this.spawnSeeds(10); 

    console.log('Map reset successfully. Game restarted with CLEAN SLATE.');
  },

  // Legacy functions kept for compatibility
  saveState: function () {
    this.saveGameState();
  },

  loadState: function () {
    return this.loadGameState();
  },

  // Define default colors (added for completeness)
  colors: [
    { r: 255, g: 0, b: 0 },    // Red
    { r: 0, g: 255, b: 0 },    // Green
    { r: 0, g: 0, b: 255 },    // Blue
    { r: 255, g: 255, b: 0 },  // Yellow
    { r: 0, g: 255, b: 255 },  // Cyan
    { r: 255, g: 0, b: 255 },  // Magenta
    { r: 255, g: 165, b: 0 },  // Orange
    { r: 128, g: 0, b: 128 },  // Purple
    { r: 0, g: 128, b: 128 },  // Teal
    { r: 128, g: 0, b: 0 },    // Maroon
  ],

  initDefaultPlayers: function () {
    for (let i = 1; i <= 10; i++) {
      const color = (this.colors && this.colors[i - 1]) ? this.colors[i - 1] : { r: 255, g: 255, b: 255 };
      this.players[i] = {
        id: i,
        username: `Player ${i}`,
        color: color,
        landCount: 0,
        centerSum: { x: 0, y: 0, z: 0, count: 0 },
        avatars: []
      };
    }
  }
};
conquestLayer.init().catch(err => {
  console.error("Conquest Init Error:", err);
  alert("INIT HATASI: " + err.message);
});
window.conquestLayer = conquestLayer;

// --- Phase 2.2: South Pole Prestige Area ---
const southPoleLayer = {
  slots: [],
  slotGroup: new THREE.Group(),
  data: {}, // { "SOUTH_SLOT_001": "image_url", ... }

  init: function () {
    this.createSlots();
    this.slotGroup.visible = true; // Ensure visibility on init
    this.loadData();
    earth.add(this.slotGroup); // Attach to Earth to rotate with it
  },

  createSlots: function () {
    const slotCount = 100;
    const radius = 1.02; // Raised to 1.02 to sit above Conquest (1.015)
    const slotRadius = 0.04; // Visual size doubled (was 0.02)

    // Geometry for the slots
    const geometry = new THREE.CircleGeometry(slotRadius, 32);

    // Default Material
    const defaultMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFD700, // Gold for prestige (better contrast against snow)
      side: THREE.DoubleSide,
      toneMapped: false // Ensure images are bright and unaffected by scene lighting/tone mapping
    });

    // Spiral Distribution around South Pole
    // Lat: -75 to -90
    for (let i = 0; i < slotCount; i++) {
      const id = `SOUTH_SLOT_${String(i + 1).padStart(3, '0')}`;

      // Distribution Logic (Golden Spiral at bottom)
      // Denser packing: Reduce the spread area
      const offset = 1.3 / slotCount; // Was 2/slotCount (Reduced to pack tighter)
      const y = -1 + (i * offset) * 0.15; // Confine to bottom 15%
      const r = Math.sqrt(Math.max(0, 1 - y * y)); // Safety clamp for NaN
      const phi = i * Math.PI * (3 - Math.sqrt(5)); // Golden angle

      const x = Math.cos(phi) * r;
      const z = Math.sin(phi) * r;

      // Position on Sphere
      const vector = new THREE.Vector3(x, y, z).normalize().multiplyScalar(radius);

      const mesh = new THREE.Mesh(geometry, defaultMaterial.clone());
      mesh.position.copy(vector);
      mesh.lookAt(new THREE.Vector3(0, 0, 0)); // Face center
      mesh.userData = { id: id };

      this.slotGroup.add(mesh);
      this.slots.push({ id, mesh });
    }
    console.log(`Created ${slotCount} South Pole Slots (Refined).`);
  },

  setSlotImage: function (id, imageUrl, name) {
    const slot = this.slots.find(s => s.id === id);
    if (!slot) return console.error("Slot not found:", id);

    // Initialize or get existing data object
    if (!this.data[id] || typeof this.data[id] === 'string') {
      const oldImage = typeof this.data[id] === 'string' ? this.data[id] : null;
      this.data[id] = oldImage ? { image: oldImage } : {};
    }

    if (name) {
      this.data[id].name = name;
      slot.mesh.userData.name = name;
    }

    if (imageUrl) {
      new THREE.TextureLoader().load(imageUrl, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace; // Corrected property for newer Three.js
        slot.mesh.material.map = texture;
        slot.mesh.material.color.setHex(0xffffff); // Clear offset color
        slot.mesh.material.needsUpdate = true;
      }, undefined, (err) => {
        console.error("Error loading texture:", err);
      });
      this.data[id].image = imageUrl;
    } else if (imageUrl === null) {
      // Clear image
      slot.mesh.material.map = null;
      slot.mesh.material.color.setHex(0xaaaaaa);
      slot.mesh.material.needsUpdate = true;
      delete this.data[id].image;
    }

    // Clean up empty objects
    if (!this.data[id].image && !this.data[id].name) {
      delete this.data[id];
    }

    this.saveData();
  },

  loadData: function () {
    const saved = localStorage.getItem('southPoleData');
    if (saved) {
      this.data = JSON.parse(saved);
      Object.keys(this.data).forEach(id => {
        const entry = this.data[id];
        // Support old format (string only) by converting to object
        if (typeof entry === 'string') {
          this.setSlotImage(id, entry);
          // setSlotImage will handle the save, but to prevent recursion issues, let's just normalize 'this.data' here
          // Actually, setSlotImage IS where the issue is. It assumes `this.data[id]` is mutable object.
          // If the key exists in `this.data` as a string, we cannot do `this.data[id].foo`.
        } else {
          this.setSlotImage(id, entry.image, entry.name);
        }
      });
    }
  },

  saveData: function () {
    localStorage.setItem('southPoleData', JSON.stringify(this.data));
  },

  toggleVisibility: function (visible) {
    this.slotGroup.visible = visible;
  }
};

southPoleLayer.init();


// Border Toggle Listener (Phase 2.1)
const borderCheckbox = document.getElementById('layer-borders');
if (borderCheckbox) {
  borderCheckbox.addEventListener('change', (e) => {
    worldLayers.toggleBorders(e.target.checked);
  });
}

// South Pole Toggle Listener (Phase 2.2)
const spCheckbox = document.getElementById('layer-south-pole');
if (spCheckbox) {
  spCheckbox.addEventListener('change', (e) => {
    southPoleLayer.toggleVisibility(e.target.checked);
  });
}

// South Pole Image Setter (Phase 2.2)
const spSetBtn = document.getElementById('sp-set-btn');
if (spSetBtn) {
  spSetBtn.addEventListener('click', () => {
    const idInput = document.getElementById('sp-slot-id');
    const nameInput = document.getElementById('sp-name-input'); // Get Name
    const fileInput = document.getElementById('sp-image-input');

    if (!idInput) return;
    const slotId = `SOUTH_SLOT_${String(idInput.value).padStart(3, '0')}`;
    const name = nameInput ? nameInput.value.trim() : null;

    // Case 1: Image File Selected
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = function (e) {
        const imageUrl = e.target.result; // Base64 string
        southPoleLayer.setSlotImage(slotId, imageUrl, name);
        alert(`${slotId} gÃ¼ncellendi.`);
      };
      reader.onerror = function (e) {
        console.error("File reading failed:", e);
        alert("Resim yÃ¼klenirken hata oluÅŸtu.");
      };
      reader.readAsDataURL(file);
    }
    // Case 2: Only Name Updated
    else if (name) {
      southPoleLayer.setSlotImage(slotId, undefined, name);
      alert(`${slotId} ismi gÃ¼ncellendi: ${name}`);
    }
    else {
      alert("LÃ¼tfen bir resim seÃ§in veya isim girin.");
    }
  });
}

// Hide Loader (Phase 2 Completion)
const loader = document.getElementById('loading-overlay');
if (loader) {
  // Simple fade out since heavy Phase 3 loading is gone
  setTimeout(() => {
    loader.classList.add('hidden');
    setTimeout(() => { loader.style.display = 'none'; }, 500);
  }, 1000); // Small delay to let textures init
}

// Phase 3: Reset Conquest Button
const resetBtn = document.getElementById('reset-conquest-btn');
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    /*
        if (conquestLayer) {
          conquestLayer.reset(); // Reset logic
          // Optional: Auto spawn
          // conquestLayer.spawnSeeds(10);
          alert("Fetih haritasÄ± sÄ±fÄ±rlandÄ±. SayfayÄ± yenileyin.");
        }
    */
  });
}

// Cleanup Button
const cleanupBtn = document.getElementById('cleanup-btn');
if (cleanupBtn) {
  cleanupBtn.addEventListener('click', () => {
    /*
        if (conquestLayer) {
          conquestLayer.validateAndFixLand();
          alert("Harita temizliÄŸi tamamlandÄ±.");
        }
    */
  });
}

// Trigger Cleanup Manually (hidden or console mostly, but linking to a button if possible?)
// Let's bind it to double-click on mode switch or something?
// Better: Expose to window for testing
window.forceCleanup = () => conquestLayer.validateAndFixLand();



// Phase 3: Player Buttons (Removed per user request)
// (Logic removed)

// Debug buttons disabled for PROD
/*
if (p1btn) p1btn.onclick = () => growPlayer(1);
if (p4btn) p4btn.onclick = () => growPlayer(4);
if (p5btn) p5btn.onclick = () => growPlayer(5);
if (p6btn) p6btn.onclick = () => growPlayer(6);
if (p7btn) p7btn.onclick = () => growPlayer(7);
if (p8btn) p8btn.onclick = () => growPlayer(8);
if (p9btn) p9btn.onclick = () => growPlayer(9);
if (p10btn) p10btn.onclick = () => growPlayer(10);
*/

// Initialize TikTok Layer (FAZ-4.1)
tiktokLayer.init(conquestLayer);

// --- FAZ-4.3: Toggle Avatars Button ---
const toggleAvatarsBtn = document.createElement('button');
toggleAvatarsBtn.textContent = '👁️ Hide Avatars'; // Default visible
toggleAvatarsBtn.id = 'toggle-avatars-btn';
toggleAvatarsBtn.style.cssText = `
  position: absolute;
  bottom: 20px;
  left: 310px; /* Offset from other buttons if any, or just bottom-left */
  z-index: 1000;
  padding: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: 1px solid #555;
  border-radius: 5px;
  cursor: pointer;
  font-family: sans-serif;
  font-size: 14px;
`;
toggleAvatarsBtn.onclick = () => {
  if (conquestLayer) {
    conquestLayer.toggleAvatars();
    toggleAvatarsBtn.textContent = conquestLayer.avatarsVisible ? '👁️ Hide Avatars' : '👁️ Show Avatars';
  }
};

// Global Helper for UI (FAZ-4.3 Label Scale)
window.setLabelScale = function (val) {
  if (!conquestLayer) return;
  conquestLayer.labelScale = parseFloat(val);
  Object.keys(conquestLayer.players).forEach(id => {
    conquestLayer.updateAvatarPosition(id);
  });
  conquestLayer.texture.needsUpdate = true;
};

// Global Helper for UI (Label Visibility Toggle)
window.toggleLabels = function (visible) {
  if (!conquestLayer) return;
  Object.keys(conquestLayer.players).forEach(id => {
    const player = conquestLayer.players[id];
    if (player.avatars && player.avatars.length > 0) {
      player.avatars.forEach(av => {
        if (av.label) {
          av.label.visible = visible;
        }
      });
    }
  });

  const slider = document.getElementById('label-scale-slider');
  if (slider) {
    slider.disabled = !visible;
    slider.style.opacity = visible ? '1' : '0.5';
  }
};

// Make Leaderboard Draggable
function makeLeaderboardDraggable() {
  const el = document.querySelector('.conquest-panel');
  if (!el) return;

  // Ensure absolute positioning
  el.style.position = 'fixed';

  // Load position and size
  const savedPos = localStorage.getItem('leaderboardPos');
  if (savedPos) {
    try {
      const { top, left, width, height } = JSON.parse(savedPos);
      el.style.top = top;
      el.style.left = left;
      if (width) el.style.width = width;
      if (height) el.style.height = height;
      el.style.bottom = 'auto'; // Reset conflicting props
      el.style.right = 'auto';
    } catch (e) { }
  }

  let isDragging = false;
  let startX, startY, startLeft, startTop;

  el.addEventListener('mousedown', (e) => {
    // Only drag by header or empty space, not table content? 
    // Actually dragging anywhere on panel is fine for user
    if (['BUTTON', 'INPUT', 'LABEL', 'A'].includes(e.target.tagName)) return;

    // Check if user is resizing (bottom-right corner usually)
    const rect = el.getBoundingClientRect();
    const isResizing = (e.clientX > rect.right - 20 && e.clientY > rect.bottom - 20);
    if (isResizing) return; // Let browser handle resize

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    startLeft = rect.left;
    startTop = rect.top;

    el.style.cursor = 'grabbing';
    e.preventDefault(); // Prevent text selection
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    el.style.left = `${startLeft + dx}px`;
    el.style.top = `${startTop + dy}px`;

    // Ensure we don't accidentally set bottom/right
    el.style.bottom = 'auto';
    el.style.right = 'auto';
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      el.style.cursor = 'default';
      saveState();
    }
  });

  // Save on resize too (using ResizeObserver)
  const resizeObserver = new ResizeObserver(() => {
    saveState();
  });
  resizeObserver.observe(el);

  function saveState() {
    localStorage.setItem('leaderboardPos', JSON.stringify({
      top: el.style.top,
      left: el.style.left,
      width: el.style.width,
      height: el.style.height
    }));
  }
}

// Initialize Draggable Leaderboard
// Initialize Draggable Leaderboard
// Initialize Draggable Leaderboard
makeLeaderboardDraggable();

// Global UI Settings hooks
window.setLabelScale = function (val) {
  if (window.conquestLayer) {
    window.conquestLayer.labelScale = parseFloat(val);
    Object.keys(window.conquestLayer.players).forEach(id => {
      window.conquestLayer.updateAvatarPosition(id);
    });
  }
};

window.toggleLabels = function (show) {
  if (window.conquestLayer) {
    window.conquestLayer.showLabels = show;
    Object.keys(window.conquestLayer.players).forEach(id => {
      window.conquestLayer.updateAvatarPosition(id);
    });
  }
};
