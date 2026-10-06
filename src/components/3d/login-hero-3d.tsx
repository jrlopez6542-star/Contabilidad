"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function LoginHero3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 420;
    let height = container.clientHeight || 500;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.2);

    // Renderer con soporte HDR/Alpha
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    container.appendChild(renderer.domElement);

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // Luces de estudio cinematográficas
    const ambientLight = new THREE.AmbientLight(0xfff8f0, 1.3);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffedd5, 2.8);
    keyLight.position.set(5, 6, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xf59e0b, 2.2);
    rimLight.position.set(-6, -3, 3);
    scene.add(rimLight);

    const jamSpecular = new THREE.PointLight(0xff1e46, 3.0, 9);
    jamSpecular.position.set(-2, 1.8, 3.5);
    scene.add(jamSpecular);

    // Cargar la textura hiperrealista en alta resolución
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load("/bunuelo-hero.png", (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;

      // Geometría esférica 3D con curvatura orgánica
      const planeGeo = new THREE.PlaneGeometry(3.6, 3.6, 48, 48);

      // Le damos volumen frontal curvado para que se sienta una esfera física real al rotar
      const pos = planeGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const distFromCenter = Math.sqrt(x * x + y * y);
        // Curvatura convexa esférica
        const z = Math.max(0, 0.75 - (distFromCenter * distFromCenter) * 0.22);
        pos.setZ(i, z);
      }
      planeGeo.computeVertexNormals();

      const mat = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        roughness: 0.35,
        metalness: 0.1,
        alphaTest: 0.05,
      });

      const mesh = new THREE.Mesh(planeGeo, mat);
      mainGroup.add(mesh);

      // Resplandor cálido / sombra ambiental suave flotante debajo
      const shadowGeo = new THREE.PlaneGeometry(3.0, 1.0);
      const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.18,
      });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.position.set(0, -1.9, -0.5);
      shadowMesh.rotation.x = -Math.PI / 2.3;
      mainGroup.add(shadowMesh);
    });

    // Partículas de migas doradas flotantes en 3D alrededor
    const crumbCount = 24;
    const crumbGeo = new THREE.DodecahedronGeometry(0.045, 0);
    const crumbMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.5,
      metalness: 0.2,
    });

    const crumbs: { mesh: THREE.Mesh; rotSpeed: number; yBase: number; orbitSpeed: number; radius: number; angle: number }[] = [];
    for (let i = 0; i < crumbCount; i++) {
      const cMesh = new THREE.Mesh(crumbGeo, crumbMat);
      const angle = (i / crumbCount) * Math.PI * 2;
      const radius = 2.0 + Math.random() * 0.9;
      const yBase = (Math.random() - 0.5) * 3.2;

      cMesh.position.set(
        Math.cos(angle) * radius,
        yBase,
        Math.sin(angle) * (radius * 0.5)
      );
      mainGroup.add(cMesh);
      crumbs.push({
        mesh: cMesh,
        rotSpeed: 0.01 + Math.random() * 0.02,
        yBase,
        orbitSpeed: 0.003 + Math.random() * 0.005,
        radius,
        angle,
      });
    }

    // Interacción suave con el cursor del mouse / pantalla táctil
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetX = x * 0.45;
      targetY = y * 0.35;
    };

    window.addEventListener("pointermove", onPointerMove);

    // Adaptabilidad responsive
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      width = container.clientWidth || 420;
      height = container.clientHeight || 500;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(container);

    // Ciclo de animación
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Interpolación elástica suave al mover el cursor
      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;

      // Rotación 3D en perspectiva
      mainGroup.rotation.y = currentX + Math.sin(elapsed * 0.8) * 0.08;
      mainGroup.rotation.x = -currentY + Math.cos(elapsed * 0.6) * 0.06;

      // Flotación levitante
      mainGroup.position.y = Math.sin(elapsed * 1.4) * 0.12;

      // Órbita de las migas
      crumbs.forEach((c, idx) => {
        c.angle += c.orbitSpeed;
        c.mesh.position.x = Math.cos(c.angle) * c.radius;
        c.mesh.position.z = Math.sin(c.angle) * (c.radius * 0.5);
        c.mesh.position.y = c.yBase + Math.sin(elapsed * 2 + idx) * 0.1;
        c.mesh.rotation.x += c.rotSpeed;
        c.mesh.rotation.y += c.rotSpeed;
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("pointermove", onPointerMove);
      resizeObserver.disconnect();
      renderer.dispose();
      crumbGeo.dispose();
      crumbMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      style={{ minHeight: "440px" }}
    />
  );
}
