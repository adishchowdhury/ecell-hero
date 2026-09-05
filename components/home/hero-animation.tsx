import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

gsap.registerPlugin(ScrollTrigger);

export interface HeroAnimationProps {
  onSceneLoaded?: () => void;
  onSceneProgress?: (progress: number) => void;
  onSceneStageChange?: (stageName: string) => void;
  targetFocus?: 'system' | 'earth' | 'saturn' | 'rocket' | 'astronaut';
}

// ---------------------------------------------------------------------------
// OPTICAL CINEMATIC POST-PROCESSING SHADER (Balanced Lens Flare & Subtle Aberration)
// ---------------------------------------------------------------------------
const CinematicOpticalShader = {
  uniforms: {
    tDiffuse: { value: null },
    uDistortion: { value: 0.0014 },
    uVignette: { value: 0.26 },
    uSunScreenPos: { value: new THREE.Vector2(0.68, 0.72) },
    uSunVisibility: { value: 1.0 },
    uTime: { value: 0.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uDistortion;
    uniform float uVignette;
    uniform vec2 uSunScreenPos;
    uniform float uSunVisibility;
    uniform float uTime;
    varying vec2 vUv;

    void main() {
      vec2 center = vec2(0.5, 0.5);
      vec2 dir = vUv - center;
      float dist = length(dir);
      
      // Subtle Chromatic Aberration at edges
      vec2 shift = dir * dist * uDistortion;
      float r = texture2D(tDiffuse, vUv + shift * 1.1).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - shift * 1.1).b;
      vec3 color = vec3(r, g, b);

      // Subtle Anamorphic Solar Glint (Restrained, optical aesthetic)
      vec2 sunDir = vUv - uSunScreenPos;
      float flareY = abs(sunDir.y) * 65.0;
      float streakFalloff = 1.0 / (1.0 + flareY * flareY * 1.2);
      float streakLength = 1.0 / (1.0 + abs(sunDir.x) * 5.0);
      float flareStreak = streakFalloff * streakLength * 0.022 * clamp(uSunVisibility, 0.0, 1.0);

      float flareDist = length(sunDir) * 4.2;
      float flareHalo = (1.0 / (1.0 + flareDist * flareDist * 4.0)) * 0.028 * clamp(uSunVisibility, 0.0, 1.0);

      vec3 flareColor = vec3(1.0, 0.88, 0.62) * flareStreak + vec3(0.3, 0.75, 1.0) * flareHalo;
      color += flareColor;

      // Fine Cosmic Stardust Grain
      float wrappedTime = mod(uTime * 0.3, 100.0);
      float grain = (fract(sin(dot(vUv * 90.0 + vec2(wrappedTime), vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.006;
      color += grain;

      // Optical Vignette
      float vignette = smoothstep(0.98, 0.35, dist);
      color *= mix(1.0 - uVignette, 1.0, vignette);

      gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
    }
  `
};

export const HeroAnimation: React.FC<HeroAnimationProps> = ({ 
  onSceneLoaded, 
  onSceneProgress,
  onSceneStageChange,
  targetFocus = 'system'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    let width = window.innerWidth;
    let height = window.innerHeight;

    // --- SCENE & CAMERA RIG ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010208);
    scene.fog = new THREE.FogExp2(0x010208, 0.0008);

    // Camera Rig hierarchy: GSAP drives cameraRig; parallax drives camera offset
    const cameraRig = new THREE.Group();
    cameraRig.position.set(0, 10, 48);
    scene.add(cameraRig);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 4000);
    camera.position.set(0, 0, 0);
    cameraRig.add(camera);

    // --- WEBGL RENDERER (Lightweight, High-Performance) ---
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

    // --- POST-PROCESSING PIPELINE ---
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Controlled bloom: Only extreme specular highlights and engine core bloom; strictly blocks Earth
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(Math.floor(width * 0.5), Math.floor(height * 0.5)),
      0.45, // Restrained, non-blown-out bloom
      0.22, // radius
      0.89  // High threshold preserves crisp planetary limbs
    );
    composer.addPass(bloomPass);

    const filmPass = new ShaderPass(CinematicOpticalShader);
    filmPass.renderToScreen = true;
    composer.addPass(filmPass);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      console.warn('WebGL context lost handled gracefully');
    };
    canvas.addEventListener('webglcontextlost', handleContextLost, false);

    // --- BALANCED CINEMATIC LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0x1a2436, 1.0);
    scene.add(ambientLight);

    const spaceFill = new THREE.DirectionalLight(0x243958, 0.75);
    spaceFill.position.set(-30, 40, 40);
    scene.add(spaceFill);

    // ----------------------------------------------------
    // ASSET PRELOADING MANAGER (THREE.LoadingManager & GLTFLoader)
    // ----------------------------------------------------
    const loadingManager = new THREE.LoadingManager();
    const gltfLoader = new GLTFLoader(loadingManager);

    loadingManager.onProgress = (_url, itemsLoaded, itemsTotal) => {
      const progress = itemsLoaded / itemsTotal;
      onSceneProgress?.(progress);
    };

    let sceneReady = false;
    loadingManager.onLoad = () => {
      // Pre-compile all GLSL shaders & materials into GPU memory ahead of time
      // This completely eliminates frame drops, shader compilation stutter, and model pop-in!
      renderer.compile(scene, camera);
      composer.render();
      sceneReady = true;
      onSceneLoaded?.();
    };

    // Register primary preloading tasks through the LoadingManager
    const preloadItems = [
      'cosmic-starfield',
      'celestial-horizon-earth',
      'sun-and-corona',
      'planetary-ecliptic',
      'orbital-satellites',
      'astronaut-eva',
      'explorer-rocket',
      'gpu-shader-pipeline'
    ];
    preloadItems.forEach((id) => loadingManager.itemStart(id));

    // Optional GLTF loader configuration
    gltfLoader.manager = loadingManager;

    // ----------------------------------------------------
    // 01. MULTI-LAYERED COSMIC STARFIELD & MILKY WAY DUST LANES
    // ----------------------------------------------------
    // Layer 1: Distant Background Stars (Tiny, vast field)
    const distantCount = 2600;
    const distantPositions = new Float32Array(distantCount * 3);
    const distantColors = new Float32Array(distantCount * 3);
    const distantSizes = new Float32Array(distantCount);

    for (let i = 0; i < distantCount; i++) {
      const radius = 340 + Math.random() * 700;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      distantPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      distantPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      distantPositions[i * 3 + 2] = radius * Math.cos(phi);

      const brightness = 0.6 + Math.random() * 0.4;
      distantColors[i * 3] = brightness;
      distantColors[i * 3 + 1] = brightness * 0.98;
      distantColors[i * 3 + 2] = brightness * 1.05;
      distantSizes[i] = Math.random() * 0.8 + 0.5;
    }

    const distantGeo = new THREE.BufferGeometry();
    distantGeo.setAttribute('position', new THREE.BufferAttribute(distantPositions, 3));
    distantGeo.setAttribute('color', new THREE.BufferAttribute(distantColors, 3));
    distantGeo.setAttribute('size', new THREE.BufferAttribute(distantSizes, 1));

    const distantMat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.05, d) * 0.85;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const distantStarField = new THREE.Points(distantGeo, distantMat);
    scene.add(distantStarField);

    // Layer 2: Medium Spectral Stars (Sirius, Vega, Sol, Betelgeuse)
    const spectralCount = 1200;
    const spectralPositions = new Float32Array(spectralCount * 3);
    const spectralColors = new Float32Array(spectralCount * 3);
    const spectralSizes = new Float32Array(spectralCount);

    const spectralPalette = [
      new THREE.Color(0xa6c2ff), // Sirius Blue-White
      new THREE.Color(0xf4f8ff), // Vega Diamond
      new THREE.Color(0xfff1d6), // Solar Yellow
      new THREE.Color(0xffcca0), // Aldebaran Amber
      new THREE.Color(0xff9878)  // Betelgeuse Warm Red
    ];

    for (let i = 0; i < spectralCount; i++) {
      const radius = 220 + Math.random() * 450;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      spectralPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      spectralPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      spectralPositions[i * 3 + 2] = radius * Math.cos(phi);

      const col = spectralPalette[Math.floor(Math.random() * spectralPalette.length)];
      spectralColors[i * 3] = col.r;
      spectralColors[i * 3 + 1] = col.g;
      spectralColors[i * 3 + 2] = col.b;
      spectralSizes[i] = Math.random() * 1.5 + 1.1;
    }

    const spectralGeo = new THREE.BufferGeometry();
    spectralGeo.setAttribute('position', new THREE.BufferAttribute(spectralPositions, 3));
    spectralGeo.setAttribute('color', new THREE.BufferAttribute(spectralColors, 3));
    spectralGeo.setAttribute('size', new THREE.BufferAttribute(spectralSizes, 1));

    const spectralMat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (240.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const spectralStarField = new THREE.Points(spectralGeo, spectralMat);
    scene.add(spectralStarField);

    // Layer 3: Foreground Stardust Particles (Slow, subtle drifting specks for depth)
    const fgParticleCount = 280;
    const fgPositions = new Float32Array(fgParticleCount * 3);
    const fgColors = new Float32Array(fgParticleCount * 3);
    const fgSizes = new Float32Array(fgParticleCount);

    for (let i = 0; i < fgParticleCount; i++) {
      fgPositions[i * 3] = (Math.random() - 0.5) * 80.0;
      fgPositions[i * 3 + 1] = (Math.random() - 0.5) * 45.0;
      fgPositions[i * 3 + 2] = 5.0 + Math.random() * 45.0;

      fgColors[i * 3] = 0.5 + Math.random() * 0.5;
      fgColors[i * 3 + 1] = 0.7 + Math.random() * 0.3;
      fgColors[i * 3 + 2] = 1.0;
      fgSizes[i] = Math.random() * 2.2 + 1.2;
    }

    const fgGeo = new THREE.BufferGeometry();
    fgGeo.setAttribute('position', new THREE.BufferAttribute(fgPositions, 3));
    fgGeo.setAttribute('color', new THREE.BufferAttribute(fgColors, 3));
    fgGeo.setAttribute('size', new THREE.BufferAttribute(fgSizes, 1));

    const fgMat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (180.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.05, d) * 0.22;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const foregroundParticles = new THREE.Points(fgGeo, fgMat);
    scene.add(foregroundParticles);

    // Volumetric Milky Way Galactic Core & Nebula Dust Lanes
    const nebulaGroup = new THREE.Group();
    scene.add(nebulaGroup);

    const mwCount = 1800;
    const mwPositions = new Float32Array(mwCount * 3);
    const mwColors = new Float32Array(mwCount * 3);
    const mwSizes = new Float32Array(mwCount);

    const mwPalette = [
      new THREE.Color(0x1e1b4b), // Deep Cosmic Indigo
      new THREE.Color(0x4c1d95), // Galactic Violet
      new THREE.Color(0x701a75), // Interstellar Magenta
      new THREE.Color(0x0e7490), // Stellar Cyan Dust
      new THREE.Color(0x1e3a8a)  // Deep Space Sapphire
    ];

    for (let i = 0; i < mwCount; i++) {
      const radius = 250 + Math.random() * 320;
      const angle = (i / mwCount) * Math.PI * 2;
      // Arched galactic disc plane inclined across the cosmos
      const discSpread = (Math.random() - 0.5) * 42.0;
      const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 35.0;
      const y = Math.sin(angle * 1.8) * 48.0 + discSpread;
      const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 35.0;

      mwPositions[i * 3] = x;
      mwPositions[i * 3 + 1] = y;
      mwPositions[i * 3 + 2] = z;

      const c = mwPalette[Math.floor(Math.random() * mwPalette.length)];
      mwColors[i * 3] = c.r;
      mwColors[i * 3 + 1] = c.g;
      mwColors[i * 3 + 2] = c.b;
      mwSizes[i] = 22.0 + Math.random() * 45.0;
    }

    const mwGeo = new THREE.BufferGeometry();
    mwGeo.setAttribute('position', new THREE.BufferAttribute(mwPositions, 3));
    mwGeo.setAttribute('color', new THREE.BufferAttribute(mwColors, 3));
    mwGeo.setAttribute('size', new THREE.BufferAttribute(mwSizes, 1));

    const mwMat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (260.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = exp(-d * d * 8.0) * 0.18;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const milkyWayPoints = new THREE.Points(mwGeo, mwMat);
    nebulaGroup.add(milkyWayPoints);

    loadingManager.itemEnd('cosmic-starfield');

    // ----------------------------------------------------
    // 02. GRAND PLANETARY HORIZON (REFINED SCALE: -33% APPARENT SIZE)
    // ----------------------------------------------------
    // Earth sits elegantly behind the lower portion of the viewport,
    // clear of the central typography, framing the composition with its upper curvature.
    const horizonGroup = new THREE.Group();
    horizonGroup.position.set(0, -25.5, -3.0);
    scene.add(horizonGroup);

    // Reduced by ~33% from 32.0 to 21.5 for authentic orbital perspective
    const horizonRadius = 21.5;

    // Realistic Earth Surface Shader (3D Simplex Procedural Continents, Oceans, Specular Glint & Realistic Angle-Dependent City Lights)
    const earthSurfaceMat = new THREE.ShaderMaterial({
      uniforms: {
        uSunDirection: { value: new THREE.Vector3(0.388, 0.767, -0.511).normalize() },
        uAtmosphereDayColor: { value: new THREE.Color(0x2b8eff) },
        uAtmosphereNightColor: { value: new THREE.Color(0x3b125e) },
        uAtmosphereTwilightColor: { value: new THREE.Color(0xff6020) },
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        varying vec3 vLocalPos;

        void main() {
          vUv = uv;
          vLocalPos = position;
          vNormal = normalize(normalMatrix * normal);
          vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDirection;
        uniform vec3 uAtmosphereDayColor;
        uniform vec3 uAtmosphereNightColor;
        uniform vec3 uAtmosphereTwilightColor;
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        varying vec3 vLocalPos;

        // GLSL Fast 3D Simplex Noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i  = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute(permute(permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x = x_ * ns.x + ns.yyyy;
          vec4 y = y_ * ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0) * 2.0 + 1.0;
          vec4 s1 = floor(b1) * 2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
          p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }

        // Multi-octave Fractional Brownian Motion (fBm)
        float fbm(vec3 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) {
            v += a * snoise(p);
            p *= 2.08;
            a *= 0.48;
          }
          return v;
        }

        void main() {
          // 3D Spherical domain coordinates (eliminates UV seam and polar distortion)
          vec3 spherePos = normalize(vLocalPos);

          // Domain-warped continental plate synthesis
          vec3 warp = vec3(
            fbm(spherePos * 2.4 + vec3(0.0, 1.2, 3.4)),
            fbm(spherePos * 2.4 + vec3(4.3, 0.5, 1.8)),
            fbm(spherePos * 2.4 + vec3(2.1, 5.7, 0.4))
          );
          float continentElev = fbm(spherePos * 2.0 + warp * 0.85);

          // Deep authentic oceanic palette
          vec3 abyssalNavy = vec3(0.012, 0.045, 0.14);
          vec3 oceanSapphire = vec3(0.024, 0.13, 0.36);
          vec3 coastalTurquoise = vec3(0.045, 0.45, 0.58);

          // Continental biomes
          vec3 rainforestGreen = vec3(0.07, 0.27, 0.10);
          vec3 woodlandGreen   = vec3(0.14, 0.35, 0.16);
          vec3 savannaAmber    = vec3(0.48, 0.46, 0.22);
          vec3 desertSand      = vec3(0.72, 0.54, 0.30);
          vec3 mountainSlate   = vec3(0.38, 0.36, 0.34);
          vec3 polarIceWhite   = vec3(0.95, 0.98, 1.0);

          float latitude = abs(spherePos.y); // 0.0 at equator, 1.0 at poles
          vec3 surfaceColor;
          float isLand = 0.0;
          float isIce = 0.0;

          if (latitude > 0.80 + 0.04 * snoise(spherePos * 8.0)) {
            // Polar Ice Sheets
            surfaceColor = polarIceWhite;
            isLand = 1.0;
            isIce = 1.0;
          } else if (continentElev > 0.04) {
            // Real Continental Landmasses
            isLand = 1.0;
            float landElev = smoothstep(0.04, 0.65, continentElev);

            if (latitude < 0.26) {
              // Equatorial rainforests & lush river basins
              surfaceColor = mix(rainforestGreen, woodlandGreen, landElev);
            } else if (latitude < 0.52) {
              // Arid subtropical desert belts & golden savannas
              float desertFactor = smoothstep(0.24, 0.42, latitude) * (1.0 - smoothstep(0.44, 0.60, latitude));
              vec3 temperateZone = mix(woodlandGreen, savannaAmber, landElev);
              surfaceColor = mix(temperateZone, desertSand, desertFactor);
            } else {
              // Temperate woodlands & highland cordilleras
              surfaceColor = mix(woodlandGreen, mountainSlate, landElev);
            }

            // Snowcapped Mountain Peaks
            if (landElev > 0.68) {
              surfaceColor = mix(surfaceColor, mountainSlate, 0.55);
            }
            if (landElev > 0.85) {
              surfaceColor = mix(surfaceColor, vec3(0.92, 0.95, 0.98), 0.75);
            }
          } else {
            // Oceans with Vibrant Coastal Azure Shelves
            float coastShelf = smoothstep(-0.06, 0.04, continentElev);
            surfaceColor = mix(oceanSapphire, coastalTurquoise, coastShelf);
            surfaceColor = mix(abyssalNavy, surfaceColor, smoothstep(-0.35, -0.06, continentElev));
          }

          // --- 2. PHYSICALLY GROUNDED SUNLIGHT & OCEAN SPECULAR GLINT ---
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float sunDot = dot(vWorldNormal, uSunDirection);

          // Specular Blinn-Phong Glint on Oceans facing Sun
          vec3 halfVec = normalize(uSunDirection + viewDir);
          float specAngle = max(0.0, dot(vWorldNormal, halfVec));
          float oceanGlint = pow(specAngle, 48.0) * (1.0 - isLand) * max(0.0, sunDot) * 1.35;
          vec3 specularHighlight = vec3(1.0, 0.98, 0.94) * oceanGlint;

          // Rayleigh Surface Scattering on Sunlit Edge (Grazing Limb)
          float surfaceFresnel = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 3.0);
          vec3 litEdgeScatter = uAtmosphereDayColor * surfaceFresnel * max(0.0, sunDot) * 1.35;
          vec3 nightEdgeScatter = uAtmosphereNightColor * surfaceFresnel * (1.0 - max(0.0, sunDot)) * 0.45;

          // Lit Day-side Color
          vec3 dayColor = surfaceColor * (max(0.0, sunDot) * 0.88 + 0.12) + specularHighlight;
          dayColor += litEdgeScatter;

          // --- 3. REALISTIC ANGLE-DEPENDENT NIGHT-SIDE CITY LIGHTS ---
          // Smoothly illuminates as the sun dips below the horizon
          float nightMix = smoothstep(0.06, -0.18, sunDot);

          // Procedural hierarchical city clusters strictly on habitable land
          float regionalDensity = smoothstep(0.05, 0.40, snoise(spherePos * 7.0));
          float cityHubs = pow(max(0.0, snoise(spherePos * 26.0)), 2.8) * 3.8;
          float cityFilaments = smoothstep(0.68, 0.96, snoise(spherePos * 58.0)) * 1.6;
          float cityLightsPattern = (cityHubs + cityFilaments) * regionalDensity;

          // Incandescent golden-amber metropolitan illumination
          vec3 warmCityGlow = vec3(1.0, 0.78, 0.36);
          vec3 cityLights = warmCityGlow * cityLightsPattern * isLand * (1.0 - isIce) * 2.1;

          // Final Composite with Ambient Space Atmosphere
          vec3 nightSide = mix(uAtmosphereNightColor * 0.4, cityLights, min(1.0, cityLightsPattern * 1.2));
          nightSide += nightEdgeScatter;
          vec3 finalColor = mix(dayColor, nightSide, nightMix);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });
    const earthHorizonGeo = new THREE.SphereGeometry(horizonRadius, 64, 64);
    const earthHorizonMesh = new THREE.Mesh(earthHorizonGeo, earthSurfaceMat);
    horizonGroup.add(earthHorizonMesh);

    // Natural Atmospheric Clouds (Matte white water vapor with soft micro-shadows)
    const earthCloudsMat = new THREE.ShaderMaterial({
      uniforms: {
        uSunDirection: { value: new THREE.Vector3(0.68, 0.45, -0.58).normalize() },
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        varying vec3 vLocalPos;
        void main() {
          vUv = uv;
          vLocalPos = position;
          vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDirection;
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        varying vec3 vLocalPos;

        // GLSL Simplex Noise for Organic Cloud Bands
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i  = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute(permute(permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x = x_ * ns.x + ns.yyyy;
          vec4 y = y_ * ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0) * 2.0 + 1.0;
          vec4 s1 = floor(b1) * 2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
          p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }

        void main() {
          vec3 cp = normalize(vLocalPos) * 3.4;
          float c1 = snoise(cp);
          float c2 = snoise(cp * 2.4 + vec3(1.2, 0.4, 2.1)) * 0.5;
          float cloudDensity = c1 + c2;

          if (cloudDensity > 0.08) {
            float alpha = smoothstep(0.08, 0.65, cloudDensity) * 0.76;
            float NdotL = dot(vWorldNormal, uSunDirection);
            float dayFactor = smoothstep(-0.06, 0.20, NdotL);
            vec3 dayCloud = vec3(0.96, 0.98, 1.0) * (max(0.0, NdotL) * 0.85 + 0.15);
            vec3 nightCloud = vec3(0.02, 0.025, 0.05);
            vec3 cloudColor = mix(nightCloud, dayCloud, dayFactor);

            gl_FragColor = vec4(cloudColor, alpha);
          } else {
            discard;
          }
        }
      `,
      transparent: true,
      depthWrite: false
    });
    const cloudsGeo = new THREE.SphereGeometry(horizonRadius + 0.18, 54, 54);
    const cloudsMesh = new THREE.Mesh(cloudsGeo, earthCloudsMat);
    horizonGroup.add(cloudsMesh);

    // Realistic Outer Atmosphere Rim Shader (Fresnel factor increasing at edges; Strong Blue Tint fading to Deep Violet on Night Side)
    const atmosphereMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: {
        uSunDirection: { value: new THREE.Vector3(0.388, 0.767, -0.511).normalize() },
        uAtmosphereDayColor: { value: new THREE.Color(0x2b8eff) },
        uAtmosphereTwilightColor: { value: new THREE.Color(0xff6020) },
        uAtmosphereNightColor: { value: new THREE.Color(0x5a188e) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDirection;
        uniform vec3 uAtmosphereDayColor;
        uniform vec3 uAtmosphereTwilightColor;
        uniform vec3 uAtmosphereNightColor;
        varying vec3 vNormal;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;

        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          // For BackSide geometry, normal points inwards, so outwardNormal = -vNormal
          vec3 outwardNormal = -vNormal;

          // --- FRESNEL FACTOR INCREASING AT THE EDGES ---
          // At the grazing limb edges, dot(viewDir, outwardNormal) approaches 0,
          // causing the fresnel term to peak at 1.0 along the outer atmospheric rim
          float NdotV = max(0.0, dot(viewDir, outwardNormal));
          float fresnel = 1.0 - NdotV;
          float edgeIntensity = pow(fresnel, 3.4);

          // Sunlight scattering angle
          float sunDot = dot(outwardNormal, uSunDirection);
          float dayScatter = smoothstep(-0.25, 0.35, sunDot);
          float nightScatter = 1.0 - dayScatter;

          // Sunset twilight scattering along terminator
          float twilightScatter = smoothstep(-0.28, 0.05, sunDot) * smoothstep(0.35, -0.05, sunDot);

          // Strong blue tint that fades into a deeper violet toward the night side
          vec3 strongBlue = vec3(0.14, 0.58, 1.0); // Stronger, vivid celestial blue
          vec3 deepViolet = vec3(0.36, 0.08, 0.62); // Deeper nocturnal cosmic violet
          vec3 twilightAmber = vec3(1.0, 0.44, 0.12);

          vec3 scatterColor = mix(deepViolet, strongBlue, dayScatter);
          scatterColor = mix(scatterColor, twilightAmber, twilightScatter * 0.95);

          // Forward Mie scattering toward the sun direction (solar halo)
          vec3 toCamera = normalize(cameraPosition - vWorldPos);
          float sunForward = max(0.0, dot(-toCamera, uSunDirection));
          float forwardMie = pow(sunForward, 12.0) * 0.38;
          scatterColor += strongBlue * forwardMie;

          // Alpha modulated by edge-increasing fresnel factor:
          // Brilliant on the day side, ethereal violet rim on the night side
          float alpha = edgeIntensity * (dayScatter * 0.95 + nightScatter * 0.42);
          if (alpha < 0.002) discard;

          gl_FragColor = vec4(scatterColor, alpha);
        }
      `
    });
    const atmosphereGeo = new THREE.SphereGeometry(horizonRadius + 0.65, 64, 64);
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMaterial);
    horizonGroup.add(atmosphereMesh);
    loadingManager.itemEnd('celestial-horizon-earth');

    // ----------------------------------------------------
    // 03. THE RADIANT CELESTIAL STAR (CONTROLLED PHOTOSPHERE & SOFT CORONA)
    // ----------------------------------------------------
    const sunGroup = new THREE.Group();
    // Positioned gracefully off-axis in the upper-right quadrant, well clear of the headline
    sunGroup.position.set(22, 18, -32);
    scene.add(sunGroup);

    const sunPointLight = new THREE.PointLight(0xfff3db, 2.2, 500, 1.0);
    sunGroup.add(sunPointLight);

    const sunDirLight = new THREE.DirectionalLight(0xfff0d0, 1.8);
    sunDirLight.position.set(22, 18, -32);
    sunDirLight.target = horizonGroup;
    scene.add(sunDirLight);

    // Stellar Core (Radius reduced from 4.8 to 2.9, authentic solar limb darkening)
    const sunGeo = new THREE.SphereGeometry(2.9, 36, 36);
    const sunMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vNormal;

        void main() {
          vec2 uv = vUv * 5.0;
          float t = uTime * 0.35;
          float n1 = sin(uv.x * 3.5 + t) * cos(uv.y * 3.5 - t);
          float n2 = sin(uv.x * 7.0 - t * 1.2) * cos(uv.y * 7.0 + t * 1.2) * 0.5;
          float pattern = (n1 + n2) * 0.5 + 0.5;

          // Photosphere limb darkening: core is bright golden-white, limb softens to warm amber
          float NdotV = max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
          float limbDarkening = pow(NdotV, 0.55);

          vec3 coreCol = vec3(1.0, 0.96, 0.88);
          vec3 amberEdge = vec3(1.0, 0.58, 0.14);
          vec3 col = mix(amberEdge, coreCol, limbDarkening * 0.75 + pattern * 0.25);

          // Restrained emission: Brilliant star core, NOT a blown-out white CSS glow
          gl_FragColor = vec4(col * 1.28, 1.0);
        }
      `
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunGroup.add(sunMesh);

    // Soft Golden Inner Corona (Layer 1)
    const innerCoronaGeo = new THREE.SphereGeometry(4.4, 32, 32);
    const innerCoronaMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          intensity = pow(0.68 - dot(vNormal, vec3(0, 0, 1.0)), 2.4);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying float intensity;
        void main() {
          vec3 glow = vec3(1.0, 0.72, 0.30) * intensity * 1.2;
          gl_FragColor = vec4(glow, intensity * 0.75);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });
    sunGroup.add(new THREE.Mesh(innerCoronaGeo, innerCoronaMat));

    // Ethereal Outer Halo (Layer 2)
    const outerHaloGeo = new THREE.SphereGeometry(7.0, 32, 32);
    const outerHaloMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          intensity = pow(0.55 - dot(vNormal, vec3(0, 0, 1.0)), 2.8);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying float intensity;
        void main() {
          vec3 glow = vec3(1.0, 0.55, 0.18) * intensity * 0.5;
          gl_FragColor = vec4(glow, intensity * 0.35);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });
    sunGroup.add(new THREE.Mesh(outerHaloGeo, outerHaloMat));
    loadingManager.itemEnd('sun-and-corona');

    // ----------------------------------------------------
    // 04. CELESTIAL PLANETARY ECLIPTIC (SOLAR SYSTEM ABOVE HORIZON)
    // ----------------------------------------------------
    const celestialPlane = new THREE.Group();
    celestialPlane.position.set(0, 4, -10);
    celestialPlane.rotation.x = THREE.MathUtils.degToRad(18);
    celestialPlane.rotation.z = THREE.MathUtils.degToRad(-8);
    scene.add(celestialPlane);

    interface CelestialPlanet {
      name: string;
      orbitGroup: THREE.Group;
      bodyGroup: THREE.Group;
      speed: number;
      offset: number;
      rotationSpeed: number;
      update?: (t: number) => void;
    }
    const planets: CelestialPlanet[] = [];

    // Refined, Thin & Low-Opacity Orbital Trajectory Arcs (Communicate scale without clutter)
    const createOrbitArc = (radius: number, colorHex: number = 0x224466, opacity: number = 0.11) => {
      const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI, false, 0);
      const pts = curve.getPoints(128);
      const geo = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p.x, 0, p.y)));
      const mat = new THREE.LineBasicMaterial({ 
        color: colorHex, 
        transparent: true, 
        opacity: opacity,
        blending: THREE.AdditiveBlending
      });
      celestialPlane.add(new THREE.Line(geo, mat));
    };

    // 1. MERCURY
    createOrbitArc(12, 0x4a6a88, 0.08);
    const mercOrbit = new THREE.Group();
    const mercBody = new THREE.Group();
    mercBody.position.set(12, 0, 0);
    mercBody.add(new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 20, 20),
      new THREE.MeshStandardMaterial({ color: 0x9e9ea4, roughness: 0.85 })
    ));
    mercOrbit.add(mercBody);
    celestialPlane.add(mercOrbit);
    planets.push({ name: 'mercury', orbitGroup: mercOrbit, bodyGroup: mercBody, speed: 0.035, offset: 1.2, rotationSpeed: 0.01 });

    // 2. VENUS
    createOrbitArc(18, 0x665533, 0.09);
    const venusOrbit = new THREE.Group();
    const venusBody = new THREE.Group();
    venusBody.position.set(18, 0, 0);
    venusBody.add(new THREE.Mesh(
      new THREE.SphereGeometry(0.95, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xe6bb72, roughness: 0.65, metalness: 0.15 })
    ));
    venusOrbit.add(venusBody);
    celestialPlane.add(venusOrbit);
    planets.push({ name: 'venus', orbitGroup: venusOrbit, bodyGroup: venusBody, speed: 0.024, offset: 2.8, rotationSpeed: 0.007 });

    // 3. MARS (With Polar Ice Cap)
    createOrbitArc(26, 0x663322, 0.08);
    const marsOrbit = new THREE.Group();
    const marsBody = new THREE.Group();
    marsBody.position.set(26, 0, 0);
    const marsMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 28, 28),
      new THREE.MeshStandardMaterial({ color: 0xbd4618, roughness: 0.75, metalness: 0.15 })
    );
    marsBody.add(marsMesh);

    // North Polar Ice Cap
    const marsIce = new THREE.Mesh(
      new THREE.ConeGeometry(0.48, 0.22, 20),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
    );
    marsIce.position.set(0, 1.08, 0);
    marsBody.add(marsIce);

    marsOrbit.add(marsBody);
    celestialPlane.add(marsOrbit);
    planets.push({ name: 'mars', orbitGroup: marsOrbit, bodyGroup: marsBody, speed: 0.014, offset: 3.8, rotationSpeed: 0.01 });

    // 4. ASTEROID BELT (800 instanced rocks for ultra-smooth performance)
    const asteroidCount = 800;
    const asteroidGeo = new THREE.DodecahedronGeometry(0.3, 0);
    const asteroidMat = new THREE.MeshStandardMaterial({ color: 0x72757c, roughness: 0.9 });
    const asteroidMesh = new THREE.InstancedMesh(asteroidGeo, asteroidMat, asteroidCount);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < asteroidCount; i++) {
      const radius = 32 + Math.random() * 6.5;
      const angle = (i / asteroidCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.12;
      dummy.position.set(Math.cos(angle) * radius, (Math.random() - 0.5) * 2.2, Math.sin(angle) * radius);
      const s = 0.28 + Math.random() * 0.6;
      dummy.scale.set(s, s * (0.8 + Math.random() * 0.4), s);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      dummy.updateMatrix();
      asteroidMesh.setMatrixAt(i, dummy.matrix);
    }
    asteroidMesh.instanceMatrix.needsUpdate = true;
    celestialPlane.add(asteroidMesh);

    // 5. JUPITER (With Storm Belts & Great Red Spot)
    createOrbitArc(42, 0x664422, 0.07);
    const jupiterOrbit = new THREE.Group();
    const jupiterBody = new THREE.Group();
    jupiterBody.position.set(42, 0, 0);

    const jupiterGeo = new THREE.SphereGeometry(3.6, 36, 36);
    const jupiterMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          float lat = vUv.y * 28.0;
          float bands = sin(lat) * 0.5 + sin(lat * 2.2) * 0.25;
          vec3 lightBelt = vec3(0.92, 0.84, 0.70);
          vec3 darkBelt = vec3(0.65, 0.42, 0.26);
          vec3 color = mix(lightBelt, darkBelt, smoothstep(-0.5, 0.5, bands));

          vec2 stormCoord = vUv - vec2(0.55, 0.38);
          float stormDist = length(stormCoord * vec2(2.5, 4.0));
          if (stormDist < 0.12) {
            color = mix(vec3(0.85, 0.28, 0.14), color, smoothstep(0.02, 0.12, stormDist));
          }

          float diff = max(0.2, dot(vNormal, normalize(vec3(0.8, 0.3, 0.5))));
          gl_FragColor = vec4(color * (diff + 0.35), 1.0);
        }
      `
    });
    jupiterBody.add(new THREE.Mesh(jupiterGeo, jupiterMat));
    jupiterOrbit.add(jupiterBody);
    celestialPlane.add(jupiterOrbit);
    planets.push({ name: 'jupiter', orbitGroup: jupiterOrbit, bodyGroup: jupiterBody, speed: 0.008, offset: 4.6, rotationSpeed: 0.016 });

    // 6. SATURN (With Glorious Concentric Rings & Cassini Division)
    createOrbitArc(54, 0x665522, 0.06);
    const saturnOrbit = new THREE.Group();
    const saturnBody = new THREE.Group();
    saturnBody.position.set(54, 0, 0);
    saturnBody.rotation.z = THREE.MathUtils.degToRad(26.7);

    const saturnMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.8, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0xf0dda0, roughness: 0.55, metalness: 0.15 })
    );
    saturnBody.add(saturnMesh);

    // Saturn Ring System with Cassini Gap
    const saturnRingGeo = new THREE.RingGeometry(3.6, 7.8, 64);
    const saturnRingMat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        void main() {
          float dist = length(vUv - vec2(0.5));
          float r = (dist - 0.24) / (0.5 - 0.24);
          if (r < 0.0 || r > 1.0) discard;

          // Cassini division gap
          if (r > 0.53 && r < 0.59) discard;

          float bands = sin(r * 40.0) * 0.25 + 0.75;
          vec3 ringCol = mix(vec3(0.92, 0.84, 0.68), vec3(0.58, 0.46, 0.32), r);
          gl_FragColor = vec4(ringCol, bands * 0.86);
        }
      `
    });
    const saturnRing = new THREE.Mesh(saturnRingGeo, saturnRingMat);
    saturnRing.rotation.x = Math.PI / 2;
    saturnBody.add(saturnRing);

    saturnOrbit.add(saturnBody);
    celestialPlane.add(saturnOrbit);
    planets.push({ name: 'saturn', orbitGroup: saturnOrbit, bodyGroup: saturnBody, speed: 0.005, offset: 1.8, rotationSpeed: 0.012 });
    loadingManager.itemEnd('planetary-ecliptic');

    // ----------------------------------------------------
    // 05. ORBITAL SATELLITES SKIMMING THE HORIZON
    // ----------------------------------------------------
    const satelliteOrbitRig = new THREE.Group();
    satelliteOrbitRig.position.copy(horizonGroup.position);
    scene.add(satelliteOrbitRig);

    // ISS (International Space Station)
    const issOrbit = new THREE.Group();
    issOrbit.rotation.x = THREE.MathUtils.degToRad(51.6);
    issOrbit.rotation.z = THREE.MathUtils.degToRad(25);
    satelliteOrbitRig.add(issOrbit);

    const issStation = new THREE.Group();
    issStation.position.set(horizonRadius + 2.8, 0, 0);
    issStation.scale.set(0.35, 0.35, 0.35);
    issOrbit.add(issStation);

    const issMat = new THREE.MeshStandardMaterial({ color: 0xedf1f7, metalness: 0.9, roughness: 0.2 });
    const issCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.2, 16), issMat);
    issCylinder.rotation.z = Math.PI / 2;
    issStation.add(issCylinder);

    const issTruss = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 4.8), issMat);
    issTruss.position.set(0, 0.35, 0);
    issStation.add(issTruss);

    // 4 Pairs of Photovoltaic Solar Wings
    const issSolarMat = new THREE.MeshStandardMaterial({
      color: 0xdf9a20,
      emissive: 0x664400,
      emissiveIntensity: 0.6,
      metalness: 0.8,
      roughness: 0.2,
      side: THREE.DoubleSide
    });
    [-1.9, -1.2, 1.2, 1.9].forEach((z) => {
      const wingL = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.55), issSolarMat);
      wingL.position.set(1.1, 0.35, z);
      issStation.add(wingL);

      const wingR = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.55), issSolarMat);
      wingR.position.set(-1.1, 0.35, z);
      issStation.add(wingR);
    });

    const issBeacon = new THREE.PointLight(0x00ffff, 2.2, 8.0);
    issBeacon.position.set(0, 0.8, 0);
    issStation.add(issBeacon);

    // Geostationary Comms Satellite with Parabolic Dish
    const commsOrbit = new THREE.Group();
    commsOrbit.rotation.z = THREE.MathUtils.degToRad(-35);
    satelliteOrbitRig.add(commsOrbit);

    const commsSat = new THREE.Group();
    commsSat.position.set(-(horizonRadius + 3.2), 1.6, 0);
    commsSat.scale.set(0.3, 0.3, 0.3);
    commsOrbit.add(commsSat);

    const goldBusMat = new THREE.MeshStandardMaterial({ color: 0xe6b800, metalness: 0.95, roughness: 0.15 });
    commsSat.add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 1.0), goldBusMat));

    const dishMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, metalness: 0.85, roughness: 0.2 });
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.85, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2.2), dishMat);
    dish.rotation.x = -Math.PI / 2;
    dish.position.set(0, 0, 0.85);
    commsSat.add(dish);

    const commsSolarMat = new THREE.MeshStandardMaterial({
      color: 0x105099,
      emissive: 0x082050,
      metalness: 0.9,
      side: THREE.DoubleSide
    });
    const wing1 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.04, 0.85), commsSolarMat);
    wing1.position.set(-2.0, 0, 0);
    commsSat.add(wing1);
    const wing2 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.04, 0.85), commsSolarMat);
    wing2.position.set(2.0, 0, 0);
    commsSat.add(wing2);
    loadingManager.itemEnd('orbital-satellites');

    // ----------------------------------------------------
    // 06. PEAK CINEMATIC ZERO-G ASTRONAUT (Foreground Framing Element)
    // ----------------------------------------------------
    const astronautGroup = new THREE.Group();
    // Positioned in the lower-left foreground third, framing the composition without competing with typography
    astronautGroup.position.set(-15.0, -4.6, 29.5);
    astronautGroup.scale.set(1.22, 1.22, 1.22);
    astronautGroup.rotation.set(0.18, 0.46, -0.14);
    scene.add(astronautGroup);

    // Dedicated Cinematic Rim & Fill Lighting for Astronaut
    const astroSunRim = new THREE.DirectionalLight(0xffe6c4, 1.4);
    astroSunRim.position.set(22, 18, -32);
    scene.add(astroSunRim);

    const astroSpaceFill = new THREE.DirectionalLight(0x183452, 0.65);
    astroSpaceFill.position.set(-25, -12, 38);
    scene.add(astroSpaceFill);

    // High-End Stylized Materials (Thermal Ortho-Fabric & Gold EVA Visor)
    const suitFabricMat = new THREE.MeshStandardMaterial({
      color: 0xf5f7fb,
      roughness: 0.48,
      metalness: 0.10
    });
    const suitAmberMat = new THREE.MeshStandardMaterial({
      color: 0xec991a,
      roughness: 0.35,
      metalness: 0.25,
      emissive: 0x553000,
      emissiveIntensity: 0.22
    });
    const suitJointMat = new THREE.MeshStandardMaterial({
      color: 0x222632,
      roughness: 0.72,
      metalness: 0.28
    });
    // High-Reflective Solar Gold EVA Visor
    const visorMirrorMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.08,
      metalness: 0.98,
      emissive: 0x886600,
      emissiveIntensity: 0.22
    });
    const metalChromeMat = new THREE.MeshStandardMaterial({
      color: 0xdde3ec,
      roughness: 0.18,
      metalness: 0.92
    });

    // 1. Helmet & Panoramic Reflective Visor
    const helmetGroup = new THREE.Group();
    helmetGroup.position.y = 1.38;
    astronautGroup.add(helmetGroup);

    const helmetDome = new THREE.Mesh(new THREE.SphereGeometry(0.88, 36, 36), suitFabricMat);
    helmetGroup.add(helmetDome);

    // Collar Lock Ring with Amber Accent
    const collarRing = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.09, 16, 36), suitAmberMat);
    collarRing.rotation.x = Math.PI / 2;
    collarRing.position.y = -0.65;
    helmetGroup.add(collarRing);

    // Deep Panoramic Curved Visor (Image 2 Dark Teal Glossy Sheen)
    const visor = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 36, 28, 0, Math.PI, 0, Math.PI / 1.68),
      visorMirrorMat
    );
    visor.rotation.x = Math.PI / 2;
    visor.position.set(0, 0.02, 0.35);
    helmetGroup.add(visor);

    // Visor Glint Specular Glare Arc
    const visorGlint = new THREE.Mesh(
      new THREE.RingGeometry(0.66, 0.70, 32, 1, 0, Math.PI / 2.2),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    );
    visorGlint.position.set(0.12, 0.25, 0.88);
    helmetGroup.add(visorGlint);

    // Side Helmet Modules (Left Comms Antenna & Right EVA Floodlight)
    const commsPod = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.35, 16), suitJointMat);
    commsPod.rotation.z = Math.PI / 2;
    commsPod.position.set(-0.92, 0.1, 0.1);
    helmetGroup.add(commsPod);

    const antennaRod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8), metalChromeMat);
    antennaRod.position.set(-0.95, 0.4, 0.1);
    helmetGroup.add(antennaRod);

    const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
    antennaTip.position.set(-0.95, 0.7, 0.1);
    helmetGroup.add(antennaTip);

    const floodlightPod = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.28, 0.25), suitJointMat);
    floodlightPod.position.set(0.92, 0.15, 0.15);
    helmetGroup.add(floodlightPod);

    const floodlightLens = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 16), new THREE.MeshBasicMaterial({ color: 0x00ffff }));
    floodlightLens.rotation.x = Math.PI / 2;
    floodlightLens.position.set(0.92, 0.15, 0.28);
    helmetGroup.add(floodlightLens);

    // 2. Torso & DCM (Display and Control Module)
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.78, 1.95, 28), suitFabricMat);
    torso.position.y = -0.15;
    astronautGroup.add(torso);

    const chestDCM = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.78, 0.38), suitFabricMat);
    chestDCM.position.set(0, 0.02, 0.62);
    astronautGroup.add(chestDCM);

    const dcmBezel = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.64, 0.06), suitJointMat);
    dcmBezel.position.set(0, 0.02, 0.82);
    astronautGroup.add(dcmBezel);

    const dcmScreen = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.22, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff })
    );
    dcmScreen.position.set(-0.12, 0.14, 0.86);
    astronautGroup.add(dcmScreen);

    const dcmDial = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16), suitJointMat);
    dcmDial.rotation.x = Math.PI / 2;
    dcmDial.position.set(0.22, 0.14, 0.86);
    astronautGroup.add(dcmDial);

    // LEDs & Quick Disconnect Hose Fittings
    const ledCyan = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.02), new THREE.MeshBasicMaterial({ color: 0x00ffff }));
    ledCyan.position.set(-0.25, -0.12, 0.86);
    astronautGroup.add(ledCyan);

    const ledAmber = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.02), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
    ledAmber.position.set(-0.12, -0.12, 0.86);
    astronautGroup.add(ledAmber);

    const ledGreen = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.02), new THREE.MeshBasicMaterial({ color: 0x00ff88 }));
    ledGreen.position.set(0.01, -0.12, 0.86);
    astronautGroup.add(ledGreen);

    // Blue & Red Hose Connectors on Chest DCM
    const portBlue = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 12), new THREE.MeshStandardMaterial({ color: 0x0088ff }));
    portBlue.rotation.x = Math.PI / 2;
    portBlue.position.set(-0.28, -0.22, 0.84);
    astronautGroup.add(portBlue);

    const portRed = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 12), new THREE.MeshStandardMaterial({ color: 0xff3344 }));
    portRed.rotation.x = Math.PI / 2;
    portRed.position.set(0.28, -0.22, 0.84);
    astronautGroup.add(portRed);

    // 3. PLSS Backpack (Life Support System)
    const backpack = new THREE.Mesh(new THREE.BoxGeometry(1.45, 2.2, 0.72), suitFabricMat);
    backpack.position.set(0, 0.12, -0.68);
    astronautGroup.add(backpack);

    const backpackAmberTrim = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.42, 0.74), suitAmberMat);
    backpackAmberTrim.position.set(0, -0.85, -0.68);
    astronautGroup.add(backpackAmberTrim);

    // Side Oxygen Cylinders with Machined Chrome Manifold
    const o2L = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.5, 20), metalChromeMat);
    o2L.position.set(-0.46, 0.15, -1.1);
    astronautGroup.add(o2L);

    const o2R = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.5, 20), metalChromeMat);
    o2R.position.set(0.46, 0.15, -1.1);
    astronautGroup.add(o2R);

    // 4. CURVED LIFE-SUPPORT UMBILICAL HOSES (Signature Feature from Image 2)
    // Connecting backpack manifolds under armpits directly to DCM chest unit
    const hoseLeftCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.65, -0.4, -0.6),
      new THREE.Vector3(-1.05, -0.35, -0.1),
      new THREE.Vector3(-0.95, -0.25, 0.45),
      new THREE.Vector3(-0.35, -0.22, 0.82)
    ]);
    const hoseLeft = new THREE.Mesh(
      new THREE.TubeGeometry(hoseLeftCurve, 32, 0.065, 12, false),
      suitFabricMat
    );
    astronautGroup.add(hoseLeft);

    const hoseLeftDarkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.62, -0.55, -0.6),
      new THREE.Vector3(-0.98, -0.50, -0.1),
      new THREE.Vector3(-0.85, -0.38, 0.42),
      new THREE.Vector3(-0.24, -0.24, 0.82)
    ]);
    const hoseLeftDark = new THREE.Mesh(
      new THREE.TubeGeometry(hoseLeftDarkCurve, 28, 0.05, 10, false),
      suitJointMat
    );
    astronautGroup.add(hoseLeftDark);

    const hoseRightCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.65, -0.4, -0.6),
      new THREE.Vector3(1.05, -0.35, -0.1),
      new THREE.Vector3(0.95, -0.25, 0.45),
      new THREE.Vector3(0.35, -0.22, 0.82)
    ]);
    const hoseRight = new THREE.Mesh(
      new THREE.TubeGeometry(hoseRightCurve, 32, 0.065, 12, false),
      suitFabricMat
    );
    astronautGroup.add(hoseRight);

    const hoseRightDarkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.62, -0.55, -0.6),
      new THREE.Vector3(0.98, -0.50, -0.1),
      new THREE.Vector3(0.85, -0.38, 0.42),
      new THREE.Vector3(0.24, -0.24, 0.82)
    ]);
    const hoseRightDark = new THREE.Mesh(
      new THREE.TubeGeometry(hoseRightDarkCurve, 28, 0.05, 10, false),
      suitJointMat
    );
    astronautGroup.add(hoseRightDark);

    // 5. Articulated Arms with Image 2 Signature Amber Bicep Rings
    const leftArm = new THREE.Group();
    leftArm.position.set(-1.12, 0.58, 0);
    astronautGroup.add(leftArm);

    // Left Upper Arm
    const lUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.25, 0.95, 20), suitFabricMat);
    lUpper.position.y = -0.48;
    leftArm.add(lUpper);

    // Padded Golden-Amber Ring (Image 2 signature)
    const lAmberRing = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.32, 20), suitAmberMat);
    lAmberRing.position.y = -0.35;
    leftArm.add(lAmberRing);

    // Left Forearm bent gracefully upward
    const lFore = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.23, 0.92, 20), suitFabricMat);
    lFore.position.set(0, -1.2, 0.32);
    lFore.rotation.x = Math.PI / 3.8;
    leftArm.add(lFore);

    // Left Hand with articulated zero-g open wave
    const lGlove = new THREE.Group();
    lGlove.position.set(0, -1.62, 0.68);
    leftArm.add(lGlove);

    const lPalm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.12), suitJointMat);
    lGlove.add(lPalm);

    // 5 Articulated Fingers
    for (let f = 0; f < 4; f++) {
      const finger = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.22, 0.055), suitJointMat);
      finger.position.set(-0.09 + f * 0.06, -0.22, 0.02);
      finger.rotation.x = 0.2 + f * 0.08;
      lGlove.add(finger);
    }
    const lThumb = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.06), suitJointMat);
    lThumb.position.set(-0.16, -0.1, 0.04);
    lThumb.rotation.z = Math.PI / 4;
    lGlove.add(lThumb);

    // Right Arm with Amber Bicep Ring & Forward Reach
    const rightArm = new THREE.Group();
    rightArm.position.set(1.12, 0.58, 0);
    astronautGroup.add(rightArm);

    const rUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.25, 0.95, 20), suitFabricMat);
    rUpper.position.y = -0.48;
    rightArm.add(rUpper);

    const rAmberRing = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.32, 20), suitAmberMat);
    rAmberRing.position.y = -0.35;
    rightArm.add(rAmberRing);

    const rFore = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.23, 0.92, 20), suitFabricMat);
    rFore.position.set(0, -1.12, 0.36);
    rFore.rotation.x = Math.PI / 3.0;
    rightArm.add(rFore);

    const rGlove = new THREE.Group();
    rGlove.position.set(0, -1.48, 0.72);
    rightArm.add(rGlove);

    const rPalm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 0.12), suitJointMat);
    rGlove.add(rPalm);

    for (let f = 0; f < 4; f++) {
      const finger = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.22, 0.055), suitJointMat);
      finger.position.set(-0.09 + f * 0.06, -0.22, 0.02);
      finger.rotation.x = 0.35 + f * 0.06;
      rGlove.add(finger);
    }
    const rThumb = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.06), suitJointMat);
    rThumb.position.set(0.16, -0.1, 0.04);
    rThumb.rotation.z = -Math.PI / 4;
    rGlove.add(rThumb);

    // 6. Articulated Legs with Amber Thigh Bands & Heavy EVA Boots
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.48, -1.15, 0);
    astronautGroup.add(leftLeg);

    const lThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 1.45, 20), suitFabricMat);
    lThigh.position.y = -0.72;
    leftLeg.add(lThigh);

    // Padded Golden-Amber Thigh Ring (Image 2 signature)
    const lAmberThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.38, 20), suitAmberMat);
    lAmberThigh.position.y = -0.52;
    leftLeg.add(lAmberThigh);

    const lKneepad = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 0.14), suitJointMat);
    lKneepad.position.set(0, -1.35, 0.22);
    leftLeg.add(lKneepad);

    const lBoot = new THREE.Group();
    lBoot.position.set(0, -1.55, 0.2);
    leftLeg.add(lBoot);

    const lBootUpper = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.38, 0.78), suitFabricMat);
    lBoot.add(lBootUpper);

    const lBootSole = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 0.84), suitJointMat);
    lBootSole.position.y = -0.22;
    lBoot.add(lBootSole);

    // Right Leg (Natural Zero-G Knee Flex)
    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.48, -1.15, 0);
    rightLeg.rotation.x = 0.32;
    astronautGroup.add(rightLeg);

    const rThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 1.45, 20), suitFabricMat);
    rThigh.position.y = -0.72;
    rightLeg.add(rThigh);

    const rAmberThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.38, 20), suitAmberMat);
    rAmberThigh.position.y = -0.52;
    rightLeg.add(rAmberThigh);

    const rKneepad = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 0.14), suitJointMat);
    rKneepad.position.set(0, -1.35, 0.22);
    rightLeg.add(rKneepad);

    const rBoot = new THREE.Group();
    rBoot.position.set(0, -1.55, 0.2);
    rightLeg.add(rBoot);

    const rBootUpper = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.38, 0.78), suitFabricMat);
    rBoot.add(rBootUpper);

    const rBootSole = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 0.84), suitJointMat);
    rBootSole.position.y = -0.22;
    rBoot.add(rBootSole);

    // 7. Dynamic Coiled Safety Tether Fading into the Cosmic Void
    const tetherCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.4, -1.1),
      new THREE.Vector3(-1.2, -1.0, -2.4),
      new THREE.Vector3(-2.8, -1.8, -4.5),
      new THREE.Vector3(-5.5, -3.5, -7.5),
      new THREE.Vector3(-9.5, -3.0, -11.0)
    ]);
    const tetherGeo = new THREE.TubeGeometry(tetherCurve, 40, 0.055, 8, false);
    const tetherMat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x0088aa,
      emissiveIntensity: 0.85,
      roughness: 0.25
    });
    astronautGroup.add(new THREE.Mesh(tetherGeo, tetherMat));
    loadingManager.itemEnd('astronaut-eva');

    // ----------------------------------------------------
    // 07. PEAK DETAILED INTERPLANETARY ROCKET (Right Horizon Trajectory)
    // ----------------------------------------------------
    const rocketGroup = new THREE.Group();
    // Poised on climbing orbital ascent trajectory in midground right, deeper than foreground astronaut
    rocketGroup.position.set(16.5, -2.0, 16.5);
    rocketGroup.scale.set(1.12, 1.12, 1.12);
    rocketGroup.rotation.set(0.32, -0.85, -0.62);
    scene.add(rocketGroup);

    const rocketHullMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.88, roughness: 0.18 });
    const rocketTileMat = new THREE.MeshStandardMaterial({ color: 0x141820, metalness: 0.92, roughness: 0.32 });
    const rocketCopperMat = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.95, roughness: 0.22 });

    // Aerodynamic Conical Ogive Nose Cone with Ceramic TPS Heat Shield
    const noseCone = new THREE.Mesh(new THREE.ConeGeometry(0.62, 2.3, 36), rocketTileMat);
    noseCone.position.y = 3.2;
    rocketGroup.add(noseCone);

    // Command Capsule & Cockpit Observation Cupola with Illuminated Avionics HUD
    const capsule = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.88, 1.7, 36), rocketHullMat);
    capsule.position.y = 1.35;
    rocketGroup.add(capsule);

    const cockpitCupola = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.24, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 1.2 })
    );
    cockpitCupola.position.set(0, 1.45, 0.78);
    rocketGroup.add(cockpitCupola);

    // Main Propellant Fuselage
    const mainStage = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 4.6, 36), rocketHullMat);
    mainStage.position.y = -1.65;
    rocketGroup.add(mainStage);

    // Interstage Carbon-Ring Grid
    const interstage = new THREE.Mesh(new THREE.CylinderGeometry(0.89, 0.89, 0.48, 36), rocketTileMat);
    interstage.position.y = 0.48;
    rocketGroup.add(interstage);

    // 4 Titanium Deployable Grid Control Fins
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.72, 0.58), rocketTileMat);
      fin.position.set(Math.cos(angle) * 0.98, 0.22, Math.sin(angle) * 0.98);
      fin.rotation.y = -angle;
      rocketGroup.add(fin);
    }

    // Quad Delta Stabilizers with Crimson Racing Stripe
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xd92235, metalness: 0.78, roughness: 0.24 });
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.9, 1.3), wingMat);
      wing.position.set(Math.cos(angle) * 1.18, -3.1, Math.sin(angle) * 1.18);
      wing.rotation.y = -angle;
      wing.rotation.x = Math.PI / 8;
      rocketGroup.add(wing);
    }

    // Aerospike / Multi-Engine Cluster Bell with Copper Nozzle Throat
    const engineBell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.78, 0.95, 28),
      rocketCopperMat
    );
    engineBell.position.y = -4.3;
    rocketGroup.add(engineBell);

    // Hyper-Velocity Cyan Plasma Core (Controlled, high-tech vacuum exhaust)
    const exhaustCore = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 2.4, 20),
      new THREE.MeshBasicMaterial({ color: 0x55ffff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
    );
    exhaustCore.position.y = -5.4;
    exhaustCore.rotation.x = Math.PI;
    rocketGroup.add(exhaustCore);

    // Violet Ion Expansion Plume
    const exhaustOuter = new THREE.Mesh(
      new THREE.ConeGeometry(0.65, 3.8, 20),
      new THREE.MeshBasicMaterial({ color: 0x7722ee, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending })
    );
    exhaustOuter.position.y = -6.1;
    exhaustOuter.rotation.x = Math.PI;
    rocketGroup.add(exhaustOuter);

    // Real-Time Mach Shock Diamonds
    const shockDiamonds: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const diamond = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.12 - i * 0.02),
        new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending })
      );
      diamond.position.y = -4.9 - i * 0.75;
      rocketGroup.add(diamond);
      shockDiamonds.push(diamond);
    }

    const rocketLight = new THREE.PointLight(0x00ffff, 1.8, 10.0);
    rocketLight.position.set(0, -4.5, 0);
    rocketGroup.add(rocketLight);
    loadingManager.itemEnd('explorer-rocket');

    // Shader pipeline preload item complete
    loadingManager.itemEnd('gpu-shader-pipeline');

    // ----------------------------------------------------
    // 08. INPUT CONTROLS & PARALLAX
    // ----------------------------------------------------
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer.setSize(width, height);
      bloomPass.setSize(Math.floor(width * 0.5), Math.floor(height * 0.5));
    };
    window.addEventListener('resize', handleResize);

    // ----------------------------------------------------
    // 09. FLUID GSAP SCROLL & CAMERA CHOREOGRAPHY
    // ----------------------------------------------------
    const ctx = gsap.context(() => {
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: document.body,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1.2,
          onUpdate: (self) => {
            if (self.progress < 0.35) {
              onSceneStageChange?.('solar');
            } else if (self.progress < 0.7) {
              onSceneStageChange?.('earth-orbit');
            } else {
              onSceneStageChange?.('deep-space');
            }
          }
        }
      });

      // Stage 1 -> 2: Camera sweeps gently along the orbital horizon towards Earth
      scrollTl.to(cameraRig.position, {
        x: 2,
        y: 4,
        z: 34,
        ease: 'power2.inOut',
        duration: 1
      }, 0);

      // Astronaut drifts gracefully past the left foreground
      scrollTl.to(astronautGroup.position, {
        x: -26,
        y: -7,
        z: 44,
        ease: 'power2.inOut',
        duration: 1.2
      }, 0);

      // Rocket accelerates along flight vector into deep space
      scrollTl.to(rocketGroup.position, {
        x: 34,
        y: 20,
        z: -18,
        ease: 'power2.in',
        duration: 1.2
      }, 0);

      // Earth horizon smoothly sweeps through the lower viewport
      scrollTl.to(horizonGroup.position, {
        y: -22.5,
        z: 2.0,
        ease: 'power2.inOut',
        duration: 1
      }, 0);

      // Stage 2 -> 3: Frames the deep space perspective as user reaches further down
      scrollTl.to(cameraRig.position, {
        x: -2,
        y: 1,
        z: 25,
        ease: 'power2.inOut',
        duration: 1
      }, 1);
    });

    // Handle interactive celestial focus selection
    if (targetFocus === 'earth') {
      gsap.to(cameraRig.position, { x: 4, y: 2, z: 30, duration: 1.4, ease: 'power2.inOut' });
    } else if (targetFocus === 'saturn') {
      gsap.to(cameraRig.position, { x: 26, y: 12, z: 40, duration: 1.4, ease: 'power2.inOut' });
    } else if (targetFocus === 'rocket') {
      gsap.to(cameraRig.position, { x: 10, y: 1, z: 28, duration: 1.4, ease: 'power2.inOut' });
    } else if (targetFocus === 'astronaut') {
      gsap.to(cameraRig.position, { x: -9, y: 3, z: 30, duration: 1.4, ease: 'power2.inOut' });
    } else {
      gsap.to(cameraRig.position, { x: 0, y: 10, z: 48, duration: 1.4, ease: 'power2.inOut' });
    }

    // ----------------------------------------------------
    // 10. REAL-TIME 60FPS ANIMATION LOOP USING THREE.Timer
    // ----------------------------------------------------
    let animationFrameId: number;
    // Using modern THREE.Timer (replacing deprecated THREE.Clock)
    const timer = new THREE.Timer();
    const sunProjected = new THREE.Vector3();
    const sunDirVec = new THREE.Vector3();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Advance modern THREE.Timer
      timer.update();
      const elapsedTime = timer.getElapsed();

      // Fluid bounded parallax (No drift, strictly anchored)
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      camera.position.x = mouse.x * 2.0;
      camera.position.y = -mouse.y * 1.5;
      camera.lookAt(0, 2, 0);

      // Calculate exact Sun direction vector for Earth day/night shading & specular glint
      sunDirVec.subVectors(sunGroup.position, horizonGroup.position).normalize();
      if (earthSurfaceMat.uniforms.uSunDirection) {
        earthSurfaceMat.uniforms.uSunDirection.value.copy(sunDirVec);
      }
      if (earthSurfaceMat.uniforms.uTime) {
        earthSurfaceMat.uniforms.uTime.value = elapsedTime;
      }
      if (earthCloudsMat.uniforms.uSunDirection) {
        earthCloudsMat.uniforms.uSunDirection.value.copy(sunDirVec);
      }
      if (earthCloudsMat.uniforms.uTime) {
        earthCloudsMat.uniforms.uTime.value = elapsedTime;
      }
      if (atmosphereMaterial.uniforms.uSunDirection) {
        atmosphereMaterial.uniforms.uSunDirection.value.copy(sunDirVec);
      }

      // Sun Photosphere animation & screen lens flare coordinates
      sunMat.uniforms.uTime.value = elapsedTime;
      sunMesh.rotation.y = elapsedTime * 0.03;

      sunProjected.copy(sunGroup.position).project(camera);
      filmPass.uniforms.uSunScreenPos.value.set(
        (sunProjected.x + 1) / 2,
        (sunProjected.y + 1) / 2
      );
      filmPass.uniforms.uSunVisibility.value = sunProjected.z < 1.0 ? 1.0 : 0.0;
      filmPass.uniforms.uTime.value = elapsedTime;

      // Earth Horizon natural planetary rotation & cloud drift
      earthHorizonMesh.rotation.y = elapsedTime * 0.0035;
      cloudsMesh.rotation.y = elapsedTime * 0.006;

      // Satellites orbital motion around the horizon
      issOrbit.rotation.y = elapsedTime * 0.18;
      commsOrbit.rotation.y = elapsedTime * 0.07;
      issBeacon.intensity = Math.sin(elapsedTime * 14.0) > 0.5 ? 2.5 : 0.0;

      // Planetary Ecliptic Orbits
      planets.forEach((p) => {
        p.orbitGroup.rotation.y = elapsedTime * p.speed + p.offset;
        p.bodyGroup.rotation.y += p.rotationSpeed;
      });

      // Asteroid belt drift
      asteroidMesh.rotation.y = elapsedTime * 0.004;
      nebulaGroup.rotation.y = elapsedTime * 0.001;
      
      // Starfield multi-depth parallax rotation
      distantStarField.rotation.y = elapsedTime * 0.0003;
      spectralStarField.rotation.y = elapsedTime * 0.0006;
      foregroundParticles.rotation.y = elapsedTime * 0.0012;
      foregroundParticles.position.x = Math.sin(elapsedTime * 0.1) * 1.2;

      // Astronaut Zero-G Floating Motion (Weightless & slow multi-harmonic drift)
      astronautGroup.position.y = -4.6 + Math.sin(elapsedTime * 0.42) * 0.22 + Math.cos(elapsedTime * 0.26) * 0.08;
      astronautGroup.position.x = -15.0 + Math.cos(elapsedTime * 0.35) * 0.14;
      astronautGroup.rotation.y = 0.46 + Math.sin(elapsedTime * 0.28) * 0.05;
      astronautGroup.rotation.z = -0.14 + Math.cos(elapsedTime * 0.22) * 0.03;
      leftArm.rotation.x = Math.sin(elapsedTime * 0.48) * 0.06;
      rightArm.rotation.x = -Math.PI / 4.2 + Math.sin(elapsedTime * 0.42) * 0.05;
      rightLeg.rotation.x = 0.22 + Math.sin(elapsedTime * 0.38) * 0.04;

      // Rocket Flight Thruster Surge (Controlled, subtle)
      const thrustPulse = Math.sin(elapsedTime * 24.0) * 0.05;
      exhaustCore.scale.set(1.0 + thrustPulse, 1.0 + Math.random() * 0.06, 1.0 + thrustPulse);
      exhaustOuter.scale.set(1.0 + thrustPulse, 1.0 + Math.random() * 0.08, 1.0 + thrustPulse);
      rocketGroup.position.y = -2.0 + Math.sin(elapsedTime * 0.45) * 0.12;
      rocketGroup.position.x = 16.5 + Math.cos(elapsedTime * 0.38) * 0.08;

      shockDiamonds.forEach((sd, idx) => {
        const s = 1.0 + Math.sin(elapsedTime * 20.0 + idx) * 0.12;
        sd.scale.set(s, s, s);
      });

      // Post-processing rendering
      if (sceneReady) {
        composer.render();
      }
    };

    animate();

    // --- CLEANUP ---
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      cancelAnimationFrame(animationFrameId);
      ctx.revert();
      composer.dispose();
      renderer.dispose();

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Line) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
        }
      });
    };
  }, [onSceneLoaded, onSceneProgress, onSceneStageChange, targetFocus]);

  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
