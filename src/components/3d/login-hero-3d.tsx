"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function LoginHero3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 400;
    let height = container.clientHeight || 500;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 7);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // Group for objects
    const group = new THREE.Group();
    scene.add(group);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xfff8e7, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffecd2, 2.5);
    dirLight.position.set(5, 8, 6);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const goldPoint = new THREE.PointLight(0xd97706, 3, 10);
    goldPoint.position.set(-3, -2, 3);
    scene.add(goldPoint);

    const rimLight = new THREE.PointLight(0x10b981, 2, 8);
    rimLight.position.set(2, 4, -3);
    scene.add(rimLight);

    // Golden / Crunchy Buñuelo Material (PBR)
    const bunueloMaterial = new THREE.MeshStandardMaterial({
      color: 0xcd7f32,
      roughness: 0.65,
      metalness: 0.1,
      bumpScale: 0.08,
    });

    // Create a golden pastry / sphere with organic displacement
    const geo = new THREE.SphereGeometry(1.6, 64, 64);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i);
      const v = pos.getY(i);
      const w = pos.getZ(i);
      const noise =
        Math.sin(u * 4) * Math.cos(v * 4) * Math.sin(w * 4) * 0.08 +
        Math.sin(u * 8 + v * 8) * 0.03;
      pos.setXYZ(i, u + u * noise, v + v * noise, w + w * noise);
    }
    geo.computeVertexNormals();

    const heroMesh = new THREE.Mesh(geo, bunueloMaterial);
    heroMesh.castShadow = true;
    heroMesh.receiveShadow = true;
    group.add(heroMesh);

    // Floating subtle golden rings around the sphere
    const ringGeo = new THREE.TorusGeometry(2.3, 0.035, 16, 100);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.7,
      roughness: 0.2,
      transparent: true,
      opacity: 0.8,
    });
    const ringMesh1 = new THREE.Mesh(ringGeo, ringMat);
    ringMesh1.rotation.x = Math.PI / 3;
    ringMesh1.rotation.y = Math.PI / 6;
    group.add(ringMesh1);

    const ringMesh2 = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.02, 16, 100),
      ringMat
    );
    ringMesh2.rotation.x = -Math.PI / 4;
    ringMesh2.rotation.z = Math.PI / 4;
    group.add(ringMesh2);

    // Floating floating gold crumbs / particles
    const particleCount = 40;
    const particleGeo = new THREE.DodecahedronGeometry(0.06, 0);
    const particleMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.4,
      metalness: 0.3,
    });

    const particles: { mesh: THREE.Mesh; speed: number; rotSpeed: number }[] =
      [];
    for (let i = 0; i < particleCount; i++) {
      const pMesh = new THREE.Mesh(particleGeo, particleMat);
      const radius = 2.2 + Math.random() * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;

      pMesh.position.set(
        radius * Math.cos(phi) * Math.sin(theta),
        radius * Math.sin(phi),
        radius * Math.cos(phi) * Math.cos(theta)
      );
      group.add(pMesh);
      particles.push({
        mesh: pMesh,
        speed: 0.005 + Math.random() * 0.01,
        rotSpeed: 0.01 + Math.random() * 0.03,
      });
    }

    // Mouse movement interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetX = x * 0.4;
      targetY = y * 0.3;
    };

    window.addEventListener("pointermove", onPointerMove);

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      width = container.clientWidth || 400;
      height = container.clientHeight || 500;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(container);

    // Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth mouse follow
      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;

      heroMesh.rotation.y = elapsed * 0.35 + mouseX;
      heroMesh.rotation.x = Math.sin(elapsed * 0.2) * 0.15 + mouseY;

      ringMesh1.rotation.z = elapsed * 0.2;
      ringMesh1.rotation.y = elapsed * 0.15;

      ringMesh2.rotation.z = -elapsed * 0.25;
      ringMesh2.rotation.x = elapsed * 0.1;

      particles.forEach((p, idx) => {
        p.mesh.rotation.x += p.rotSpeed;
        p.mesh.rotation.y += p.rotSpeed;
        p.mesh.position.y += Math.sin(elapsed * 2 + idx) * 0.003;
      });

      group.position.y = Math.sin(elapsed * 1.2) * 0.1;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("pointermove", onPointerMove);
      resizeObserver.disconnect();
      renderer.dispose();
      geo.dispose();
      bunueloMaterial.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      style={{ minHeight: "420px" }}
    />
  );
}
