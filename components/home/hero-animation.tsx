import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as dat from 'dat.gui';

gsap.registerPlugin(ScrollTrigger);

interface HeroAnimationProps {
  onSceneStageChange?: (stageName: string) => void;
}

export const HeroAnimation: React.FC<HeroAnimationProps> = ({ onSceneStageChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0520, 0.003);
    scene.background = new THREE.Color(0x0a0520);

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    camera.position.set(0, 15, 60);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // --- GUI ---
    const gui = new dat.GUI({ width: 300 });
    const settings = {
      systemSpeed: 1.0,
      sunGlow: 2.0,
      cameraZ: 120,
    };
    
    gui.add(settings, 'systemSpeed', 0.0, 5.0).name('Time Scale');
    gui.add(settings, 'sunGlow', 0.0, 4.0).name('Sun Intensity');

    // --- VIBRANT CINEMATIC LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xffffee, 8, 1000, 1.2);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    // Vibrant deep space rim lights
    const purpleLight = new THREE.DirectionalLight(0xb026ff, 2.5);
    purpleLight.position.set(-50, 30, -20);
    scene.add(purpleLight);

    const cyanLight = new THREE.DirectionalLight(0x00f0ff, 2.0);
    cyanLight.position.set(50, -30, 40);
    scene.add(cyanLight);

    // --- PROCEDURAL SOLAR SYSTEM ---
    const solarSystemGroup = new THREE.Group();
    scene.add(solarSystemGroup);

    // SUN
    const sunGeo = new THREE.SphereGeometry(6, 64, 64);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffaa33 });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    solarSystemGroup.add(sunMesh);

    // Sun Glow Shader
    const sunGlowGeo = new THREE.SphereGeometry(7.5, 64, 64);
    const sunGlowMat = new THREE.ShaderMaterial({
      uniforms: {
        c: { value: 0.2 },
        p: { value: 3.5 },
        glowColor: { value: new THREE.Color(0xff6600) },
        viewVector: { value: camera.position },
        glowIntensity: { value: 1.5 }
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormel = normalize(normalMatrix * viewVector);
          intensity = pow(0.65 - dot(vNormal, vNormel), 3.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float glowIntensity;
        varying float intensity;
        void main() {
          vec3 glow = glowColor * intensity * glowIntensity;
          gl_FragColor = vec4(glow, intensity);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    const sunGlowMesh = new THREE.Mesh(sunGlowGeo, sunGlowMat);
    sunMesh.add(sunGlowMesh);

    // PLANETS
    const planets: { mesh: THREE.Group, distance: number, speed: number, offset: number }[] = [];
    const planetData = [
      { radius: 0.4, color: 0x888888, distance: 10, speed: 0.02 }, // Mercury
      { radius: 0.9, color: 0xe3bb76, distance: 15, speed: 0.015 }, // Venus
      { radius: 1.0, color: 0x2266cc, distance: 22, speed: 0.01, earth: true }, // Earth
      { radius: 0.5, color: 0xc1440e, distance: 28, speed: 0.008 }, // Mars
      { radius: 3.0, color: 0xe0ae6f, distance: 45, speed: 0.004, rings: true }, // Jupiter
      { radius: 2.5, color: 0xf7e2b2, distance: 60, speed: 0.003, rings: true, ringColor: 0xcbbaa1 }, // Saturn
      { radius: 1.2, color: 0x4b70dd, distance: 75, speed: 0.002, rings: true, ringColor: 0xffffff }, // Uranus
      { radius: 1.1, color: 0x274687, distance: 85, speed: 0.001 }, // Neptune
    ];

    let earthRef: THREE.Group | null = null;

    planetData.forEach((data) => {
      const orbitGroup = new THREE.Group();
      solarSystemGroup.add(orbitGroup);

      // Orbit Line
      const orbitGeo = new THREE.BufferGeometry();
      const orbitPoints = [];
      const segments = 128;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        orbitPoints.push(new THREE.Vector3(Math.cos(theta) * data.distance, 0, Math.sin(theta) * data.distance));
      }
      orbitGeo.setFromPoints(orbitPoints);
      const orbitMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.05 });
      const orbitLine = new THREE.Line(orbitGeo, orbitMat);
      orbitLine.rotation.x = Math.PI / 2;
      solarSystemGroup.add(orbitLine);

      // Planet Mesh
      const pGroup = new THREE.Group();
      pGroup.position.set(data.distance, 0, 0);
      
      const pGeo = new THREE.SphereGeometry(data.radius, 64, 64);
      const pMat = new THREE.MeshStandardMaterial({ 
        color: data.color, 
        roughness: data.earth ? 0.3 : 0.7,
        metalness: data.earth ? 0.2 : 0.0
      });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pGroup.add(pMesh);

      // Rings
      if (data.rings) {
        const ringGeo = new THREE.RingGeometry(data.radius * 1.4, data.radius * 2.2, 64);
        const ringMat = new THREE.MeshStandardMaterial({
          color: data.ringColor || data.color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
          roughness: 0.8
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2.2;
        pGroup.add(ringMesh);
      }

      // Earth specifics
      if (data.earth) {
        earthRef = pGroup;
        const atmosphere = new THREE.Mesh(
          new THREE.SphereGeometry(data.radius * 1.05, 32, 32),
          new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, roughness: 1.0 })
        );
        pGroup.add(atmosphere);

        const moonGroup = new THREE.Group();
        const moon = new THREE.Mesh(
          new THREE.SphereGeometry(data.radius * 0.25, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 })
        );
        moon.position.set(data.radius * 2.5, 0, 0);
        moonGroup.add(moon);
        pGroup.add(moonGroup);
        
        // Expose moon group to animate
        (pGroup as any).moonGroup = moonGroup;
      }

      orbitGroup.add(pGroup);
      planets.push({ mesh: orbitGroup, distance: data.distance, speed: data.speed, offset: Math.random() * Math.PI * 2 });
    });

    // --- ASTEROID BELT (INSTANCED MESH FOR PERFORMANCE) ---
    const asteroidCount = 2000;
    const asteroidGeo = new THREE.DodecahedronGeometry(0.2, 0);
    const asteroidMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.7, metalness: 0.3 });
    const asteroidMesh = new THREE.InstancedMesh(asteroidGeo, asteroidMat, asteroidCount);
    
    const dummy = new THREE.Object3D();
    const beltInner = 32;
    const beltOuter = 40;

    for (let i = 0; i < asteroidCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = beltInner + Math.random() * (beltOuter - beltInner);
      const height = (Math.random() - 0.5) * 3;
      
      dummy.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
      
      const scale = 0.2 + Math.random() * 0.8;
      dummy.scale.set(scale, scale, scale);
      
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      
      dummy.updateMatrix();
      asteroidMesh.setMatrixAt(i, dummy.matrix);
    }
    solarSystemGroup.add(asteroidMesh);

    // --- STARFIELD ---
    const starCount = 5000;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const radius = 200 + Math.random() * 800;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = radius * Math.cos(phi);

      const colorMix = Math.random();
      const r = colorMix > 0.8 ? 1.0 : (colorMix > 0.5 ? 0.8 : 0.9);
      const g = colorMix > 0.8 ? 0.8 : (colorMix > 0.5 ? 0.9 : 0.9);
      const b = colorMix > 0.8 ? 0.5 : (colorMix > 0.5 ? 1.0 : 1.0);

      starColors[i * 3] = r;
      starColors[i * 3 + 1] = g;
      starColors[i * 3 + 2] = b;

      starSizes[i] = Math.random() * 2.0;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

    const starMat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // --- ARTISTIC ROCKET ---
    const rocketGroup = new THREE.Group();
    rocketGroup.position.set(0, -10, 10);
    rocketGroup.rotation.z = -Math.PI / 4;
    rocketGroup.rotation.x = Math.PI / 8;
    scene.add(rocketGroup);

    const rocketBodyGeo = new THREE.CylinderGeometry(0.4, 0.6, 3, 32);
    const rocketMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.6, roughness: 0.3 });
    const rocketBody = new THREE.Mesh(rocketBodyGeo, rocketMat);
    rocketGroup.add(rocketBody);

    const noseGeo = new THREE.ConeGeometry(0.4, 1.2, 32);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.2 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.y = 2.1;
    rocketGroup.add(nose);

    const finGeo = new THREE.BoxGeometry(0.1, 1, 1);
    const finMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, metalness: 0.5, roughness: 0.4 });
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(finGeo, finMat);
      fin.position.y = -1;
      fin.position.x = Math.cos((i * Math.PI) / 2) * 0.7;
      fin.position.z = Math.sin((i * Math.PI) / 2) * 0.7;
      fin.rotation.y = -(i * Math.PI) / 2;
      fin.rotation.x = Math.PI / 8;
      rocketGroup.add(fin);
    }

    const windowGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.1, 32);
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x44aaff, metalness: 0.9, roughness: 0.1, emissive: 0x113366 });
    const rocketWindow = new THREE.Mesh(windowGeo, windowMat);
    rocketWindow.rotation.x = Math.PI / 2;
    rocketWindow.position.set(0, 0.5, 0.45);
    rocketGroup.add(rocketWindow);
    
    // Rocket Exhaust
    const exhaustGeo = new THREE.ConeGeometry(0.3, 2, 16);
    const exhaustMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
    const exhaust = new THREE.Mesh(exhaustGeo, exhaustMat);
    exhaust.position.y = -2.5;
    exhaust.rotation.x = Math.PI;
    rocketGroup.add(exhaust);

    // --- ARTISTIC ASTRONAUT ---
    const astronautGroup = new THREE.Group();
    astronautGroup.position.set(-8, 5, 20);
    scene.add(astronautGroup);

    const suitMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.1 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 1.0, roughness: 0.0, emissive: 0x0a1a2a });
    const detailMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });

    // Head
    const headGeo = new THREE.SphereGeometry(0.6, 32, 32);
    const head = new THREE.Mesh(headGeo, suitMat);
    astronautGroup.add(head);

    // Visor
    const visorGeo = new THREE.SphereGeometry(0.5, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.4);
    const visor = new THREE.Mesh(visorGeo, glassMat);
    visor.rotation.x = Math.PI / 2.5;
    visor.position.z = 0.15;
    visor.position.y = 0.05;
    head.add(visor);

    // Torso
    const torsoGeo = new THREE.CapsuleGeometry(0.45, 0.8, 16, 16);
    const torso = new THREE.Mesh(torsoGeo, suitMat);
    torso.position.y = -1.2;
    astronautGroup.add(torso);

    // Backpack
    const packGeo = new THREE.BoxGeometry(0.7, 1.0, 0.4);
    const pack = new THREE.Mesh(packGeo, detailMat);
    pack.position.set(0, -1.1, -0.5);
    astronautGroup.add(pack);

    // Arms
    const armGeo = new THREE.CapsuleGeometry(0.18, 0.7, 16, 16);
    const leftArm = new THREE.Mesh(armGeo, suitMat);
    leftArm.position.set(-0.7, -1.0, 0);
    leftArm.rotation.z = Math.PI / 6;
    astronautGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, suitMat);
    rightArm.position.set(0.7, -1.0, 0.2);
    rightArm.rotation.z = -Math.PI / 4;
    rightArm.rotation.x = -Math.PI / 4;
    astronautGroup.add(rightArm);

    // Legs
    const legGeo = new THREE.CapsuleGeometry(0.22, 0.8, 16, 16);
    const leftLeg = new THREE.Mesh(legGeo, suitMat);
    leftLeg.position.set(-0.25, -2.4, 0.1);
    leftLeg.rotation.x = -0.2;
    astronautGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, suitMat);
    rightLeg.position.set(0.25, -2.3, -0.2);
    rightLeg.rotation.x = 0.3;
    astronautGroup.add(rightLeg);


    // --- MOUSE PARALLAX ---
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- ANIMATION TIMELINE ---
    // Start camera far away viewing the whole solar system
    camera.position.set(0, 30, 120);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.5
        }
      });

      // Fly through solar system towards Earth
      tl.to(camera.position, {
        x: 15,
        y: 5,
        z: 35,
        ease: "power2.inOut",
        duration: 1
      }, 0);

      tl.to(rocketGroup.position, {
        x: 10,
        y: 0,
        z: 25,
        duration: 1,
        ease: "power1.inOut"
      }, 0);

      tl.to(camera.position, {
        x: 20,
        y: 2,
        z: 25,
        ease: "power2.inOut",
        duration: 1
      }, 1);

      tl.to(astronautGroup.position, {
        x: 20,
        y: 1,
        z: 22,
        duration: 1
      }, 1);

    });

    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime() * settings.systemSpeed;

      // Mouse Parallax
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      camera.position.x += (mouse.x * 2 - (camera.position.x - camera.position.x)) * 0.02;
      camera.position.y += (-mouse.y * 2 - (camera.position.y - camera.position.y)) * 0.02;
      
      // Keep looking roughly at center initially, but shift as we move
      const targetLook = new THREE.Vector3(
        THREE.MathUtils.lerp(0, 20, Math.min(1, elapsedTime * 0.1)),
        0,
        THREE.MathUtils.lerp(0, 22, Math.min(1, elapsedTime * 0.1))
      );
      camera.lookAt(targetLook);

      // Rotate Solar System
      sunMesh.rotation.y = elapsedTime * 0.05;
      sunGlowMat.uniforms.viewVector.value = camera.position;
      sunGlowMat.uniforms.glowIntensity.value = settings.sunGlow;

      planets.forEach((p) => {
        p.mesh.rotation.y = elapsedTime * p.speed + p.offset;
        if (p.mesh.children[0] && (p.mesh.children[0] as any).moonGroup) {
           (p.mesh.children[0] as any).moonGroup.rotation.y = elapsedTime * 0.5;
        }
      });

      asteroidMesh.rotation.y = elapsedTime * 0.01;
      stars.rotation.y = elapsedTime * 0.005;

      // Animate Rocket
      rocketGroup.position.y += Math.sin(elapsedTime * 2) * 0.02;
      exhaust.scale.set(
        1 + Math.sin(elapsedTime * 30) * 0.1,
        1 + Math.random() * 0.2,
        1 + Math.sin(elapsedTime * 30) * 0.1
      );

      // Animate Astronaut
      astronautGroup.position.y += Math.sin(elapsedTime * 1.5) * 0.05;
      astronautGroup.rotation.y = elapsedTime * 0.1;
      astronautGroup.rotation.z = Math.sin(elapsedTime * 0.8) * 0.1;
      
      leftArm.rotation.x = Math.sin(elapsedTime * 2) * 0.2;
      rightLeg.rotation.x = 0.3 + Math.sin(elapsedTime * 1.5) * 0.1;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      gui.destroy();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      ctx.revert();
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
  }, [onSceneStageChange]);

  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none z-0 bg-black">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};

