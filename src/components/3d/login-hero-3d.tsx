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
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.5);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // Initial tilt so the bite on the top-left is visible just like the logo
    mainGroup.rotation.z = 0.1;
    mainGroup.rotation.y = -0.2;

    // --- ILUMINACIÓN CÁLIDA ESTILO PASTELERÍA ---
    const ambientLight = new THREE.AmbientLight(0xfff5eb, 1.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff0db, 2.8);
    dirLight.position.set(4, 7, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // Luz cálida para resaltar el rojo de la mermelada
    const jamLight = new THREE.PointLight(0xe11d48, 3.5, 8);
    jamLight.position.set(-2.5, 1.5, 3);
    scene.add(jamLight);

    // Luz de borde dorada
    const rimLight = new THREE.PointLight(0xf59e0b, 2.5, 9);
    rimLight.position.set(3, -2, 2);
    scene.add(rimLight);

    // --- GEOMETRÍA DEL BUÑUELO MORDIDO ---
    // Centro del mordisco: arriba a la izquierda (-1.0, 1.0, 0.5)
    const biteCenter = new THREE.Vector3(-1.05, 1.05, 0.45);
    const biteRadius = 1.15;
    const buñueloRadius = 1.7;

    // 1. CORTEZA EXTERIOR DORADA
    const crustGeo = new THREE.SphereGeometry(buñueloRadius, 96, 96);
    const crustPos = crustGeo.attributes.position;

    // Material dorado/crocante exterior
    const crustMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Naranja dorado cálido
      roughness: 0.72,
      metalness: 0.05,
      bumpScale: 0.06,
    });

    for (let i = 0; i < crustPos.count; i++) {
      const v = new THREE.Vector3(
        crustPos.getX(i),
        crustPos.getY(i),
        crustPos.getZ(i)
      );

      // Distancia al centro de la mordida
      const distToBite = v.distanceTo(biteCenter);

      if (distToBite < biteRadius) {
        // Hender hacia adentro de la mordida creando el hueco con ondas de dientes
        const depthFactor = Math.cos((distToBite / biteRadius) * (Math.PI / 2));
        const teethNoise =
          Math.sin(v.x * 12 + v.y * 12) * 0.08 + Math.cos(v.z * 10) * 0.05;
        const pushDir = v.clone().sub(biteCenter).normalize();
        v.sub(
          pushDir.multiplyScalar(
            (biteRadius - distToBite) * 0.85 * depthFactor + teethNoise
          )
        );
      } else {
        // Textura orgánica porosa de fritura dorada
        const noise =
          Math.sin(v.x * 6) * Math.cos(v.y * 6) * Math.sin(v.z * 6) * 0.04 +
          Math.sin(v.x * 12) * 0.015;
        v.addScaledVector(v.clone().normalize(), noise);
      }

      crustPos.setXYZ(i, v.x, v.y, v.z);
    }
    crustGeo.computeVertexNormals();

    const crustMesh = new THREE.Mesh(crustGeo, crustMat);
    crustMesh.castShadow = true;
    crustMesh.receiveShadow = true;
    mainGroup.add(crustMesh);

    // 2. MIGA BLANCA/QUESO INTERIOR (Borde blanco de la mordedura)
    const crumbGeo = new THREE.SphereGeometry(buñueloRadius * 0.96, 64, 64);
    const crumbPos = crumbGeo.attributes.position;
    const crumbMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb, // Blanco cremoso / miga de queso
      roughness: 0.9,
      metalness: 0.0,
    });

    for (let i = 0; i < crumbPos.count; i++) {
      const v = new THREE.Vector3(
        crumbPos.getX(i),
        crumbPos.getY(i),
        crumbPos.getZ(i)
      );
      const distToBite = v.distanceTo(biteCenter);
      if (distToBite < biteRadius * 1.05) {
        // Exponer la miga justo en la zona mordida
        const ripple = Math.sin(v.x * 16 + v.y * 16) * 0.06;
        v.addScaledVector(v.clone().normalize(), ripple);
      }
      crumbPos.setXYZ(i, v.x, v.y, v.z);
    }
    crumbGeo.computeVertexNormals();

    const crumbMesh = new THREE.Mesh(crumbGeo, crumbMat);
    crumbMesh.position.copy(biteCenter).multiplyScalar(0.08);
    mainGroup.add(crumbMesh);

    // 3. MERMELADA ROJA BRILLANTE Y JUGOSA (Relleno de arequipe/mora)
    const jamGeo = new THREE.SphereGeometry(0.85, 48, 48);
    const jamMat = new THREE.MeshPhysicalMaterial({
      color: 0xd90429, // Rojo mermelada intenso
      emissive: 0x590010,
      emissiveIntensity: 0.2,
      roughness: 0.15,
      metalness: 0.1,
      transmission: 0.6, // Efecto translúcido gelatinoso
      ior: 1.45,
      reflectivity: 0.9,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });

    // Deformar la mermelada para que tenga volumen abultado y burbujeante
    const jamPos = jamGeo.attributes.position;
    for (let i = 0; i < jamPos.count; i++) {
      const u = jamPos.getX(i);
      const v = jamPos.getY(i);
      const w = jamPos.getZ(i);
      const bump = Math.sin(u * 5) * Math.cos(w * 5) * 0.12;
      jamPos.setXYZ(i, u + bump, v + bump, w + bump);
    }
    jamGeo.computeVertexNormals();

    const jamMesh = new THREE.Mesh(jamGeo, jamMat);
    jamMesh.position.set(-0.85, 0.75, 0.45);
    mainGroup.add(jamMesh);

    // 4. GOTERA DE MERMELADA ESCURRIENDO (Como se ve en el logo)
    // Curva de la gota que desciende por el borde inferior de la mordedura
    const dripCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.3, 0.15, 0.7),
      new THREE.Vector3(-1.35, -0.25, 0.75),
      new THREE.Vector3(-1.32, -0.75, 0.75),
      new THREE.Vector3(-1.3, -1.05, 0.72),
    ]);
    const dripGeo = new THREE.TubeGeometry(dripCurve, 32, 0.09, 12, false);
    const dripMesh = new THREE.Mesh(dripGeo, jamMat);
    mainGroup.add(dripMesh);

    // Gota final bulbosa en la punta
    const dripDropGeo = new THREE.SphereGeometry(0.14, 24, 24);
    const dripDropMesh = new THREE.Mesh(dripDropGeo, jamMat);
    dripDropMesh.position.set(-1.3, -1.05, 0.72);
    dripDropMesh.scale.set(0.9, 1.4, 0.9);
    mainGroup.add(dripDropMesh);

    // Segunda gota pequeña en el labio superior
    const smallDropGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const smallDropMesh = new THREE.Mesh(smallDropGeo, jamMat);
    smallDropMesh.position.set(-1.42, 0.35, 0.65);
    mainGroup.add(smallDropMesh);

    // Suaves partículas de azúcar / migajas doradas flotantes
    const crumbParticleCount = 20;
    const crumbParticleGeo = new THREE.DodecahedronGeometry(0.045, 0);
    const crumbParticleMat = new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      roughness: 0.6,
    });

    const particles: { mesh: THREE.Mesh; rotSpeed: number; yOffset: number }[] =
      [];
    for (let i = 0; i < crumbParticleCount; i++) {
      const pMesh = new THREE.Mesh(crumbParticleGeo, crumbParticleMat);
      const angle = (i / crumbParticleCount) * Math.PI * 2;
      const radius = 2.4 + Math.random() * 0.8;
      pMesh.position.set(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 2.8,
        Math.sin(angle) * radius
      );
      mainGroup.add(pMesh);
      particles.push({
        mesh: pMesh,
        rotSpeed: 0.01 + Math.random() * 0.02,
        yOffset: pMesh.position.y,
      });
    }

    // Interacción con ratón / touch
    let targetRotX = 0;
    let targetRotY = 0;
    let currentRotX = 0;
    let currentRotY = 0;

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotY = x * 0.6;
      targetRotX = -y * 0.4;
    };

    window.addEventListener("pointermove", onPointerMove);

    // ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      width = container.clientWidth || 400;
      height = container.clientHeight || 500;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(container);

    // Loop de Animación
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Suave oscilación e interpolación con el cursor
      currentRotX += (targetRotX - currentRotX) * 0.05;
      currentRotY += (targetRotY - currentRotY) * 0.05;

      mainGroup.rotation.y = -0.2 + currentRotY + Math.sin(elapsed * 0.8) * 0.08;
      mainGroup.rotation.x = currentRotX + Math.cos(elapsed * 0.6) * 0.06;

      // Leve flotación vertical
      mainGroup.position.y = Math.sin(elapsed * 1.5) * 0.12;

      // Pulso suave y jugoso en la gota de mermelada
      dripDropMesh.scale.y = 1.35 + Math.sin(elapsed * 2.5) * 0.12;

      // Movimiento suave de las partículas de miga
      particles.forEach((p, idx) => {
        p.mesh.rotation.x += p.rotSpeed;
        p.mesh.rotation.y += p.rotSpeed;
        p.mesh.position.y = p.yOffset + Math.sin(elapsed * 2 + idx) * 0.08;
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("pointermove", onPointerMove);
      resizeObserver.disconnect();
      renderer.dispose();
      crustGeo.dispose();
      crustMat.dispose();
      crumbGeo.dispose();
      crumbMat.dispose();
      jamGeo.dispose();
      jamMat.dispose();
      dripGeo.dispose();
      dripDropGeo.dispose();
      smallDropGeo.dispose();
      crumbParticleGeo.dispose();
      crumbParticleMat.dispose();
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
