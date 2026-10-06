"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { formatCOP } from "@/lib/format";

export function SalesChart3D({
  salesMonth,
  expensesTotal,
  unpaidTotal,
}: {
  salesMonth: number;
  expensesTotal: number;
  unpaidTotal: number;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredInfo, setHoveredInfo] = useState<string | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 600;
    let height = container.clientHeight || 280;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 4.5, 9);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xfff8e7, 1.4);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.2);
    mainLight.position.set(4, 10, 6);
    mainLight.castShadow = true;
    scene.add(mainLight);

    const accentLight = new THREE.PointLight(0xd97706, 2.5, 12);
    accentLight.position.set(-4, 3, 2);
    scene.add(accentLight);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(10, 10, 0x10b981, 0x064e3b);
    gridHelper.position.y = -0.05;
    if (Array.isArray(gridHelper.material)) {
      gridHelper.material.forEach((m) => {
        m.transparent = true;
        m.opacity = 0.25;
      });
    } else {
      gridHelper.material.transparent = true;
      gridHelper.material.opacity = 0.25;
    }
    scene.add(gridHelper);

    // Generate 7 comparative pillars (representing metrics / daily flow)
    const metrics = [
      { label: "Ventas del Mes", val: salesMonth, color: 0x10b981 }, // Green
      { label: "Gastos del Mes", val: expensesTotal, color: 0xe11d48 }, // Red/Jam
      { label: "Por Cobrar", val: unpaidTotal, color: 0xf59e0b }, // Amber
      {
        label: "Balance Neto",
        val: Math.max(0, salesMonth - expensesTotal),
        color: 0x3b82f6,
      }, // Blue
    ];

    const maxVal = Math.max(
      salesMonth,
      expensesTotal,
      unpaidTotal,
      1
    );

    const group = new THREE.Group();
    scene.add(group);

    const bars: { mesh: THREE.Mesh; targetHeight: number; label: string; amount: number }[] = [];

    const spacing = 1.6;
    const startX = -((metrics.length - 1) * spacing) / 2;

    metrics.forEach((m, idx) => {
      const normalizedHeight = Math.max(0.3, (m.val / maxVal) * 3.5);
      const geom = new THREE.BoxGeometry(0.85, 1, 0.85);

      const mat = new THREE.MeshStandardMaterial({
        color: m.color,
        roughness: 0.2,
        metalness: 0.3,
        transparent: true,
        opacity: 0.9,
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(startX + idx * spacing, 0.5, 0);
      mesh.scale.set(1, 0.05, 1);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Glow edge base ring
      const baseGeo = new THREE.BoxGeometry(1.0, 0.05, 1.0);
      const baseMat = new THREE.MeshBasicMaterial({
        color: m.color,
        transparent: true,
        opacity: 0.4,
      });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.set(startX + idx * spacing, 0, 0);
      group.add(baseMesh);

      group.add(mesh);
      bars.push({
        mesh,
        targetHeight: normalizedHeight,
        label: m.label,
        amount: m.val,
      });
    });

    // Raycaster for hover
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(
        bars.map((b) => b.mesh)
      );

      if (intersects.length > 0) {
        const hit = bars.find((b) => b.mesh === intersects[0].object);
        if (hit) {
          setHoveredInfo(`${hit.label}: ${formatCOP(hit.amount)}`);
          container.style.cursor = "pointer";
          return;
        }
      }
      setHoveredInfo(null);
      container.style.cursor = "default";
    };

    window.addEventListener("pointermove", onPointerMove);

    // Resize
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      width = container.clientWidth || 600;
      height = container.clientHeight || 280;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(container);

    // Animation
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Intro bar growth
      bars.forEach((b) => {
        b.mesh.scale.y += (b.targetHeight - b.mesh.scale.y) * 0.08;
        b.mesh.position.y = b.mesh.scale.y / 2;
      });

      // Subtle scene orbit
      group.rotation.y = Math.sin(elapsed * 0.4) * 0.12;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("pointermove", onPointerMove);
      resizeObserver.disconnect();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [salesMonth, expensesTotal, unpaidTotal]);

  return (
    <div className="relative flex flex-col rounded-xl border border-brand/10 bg-surface p-4 shadow-sm dark:border-brand-200/15 sm:p-5">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-brand dark:text-brand-100">
            Métricas Financieras en 3D
          </h2>
          <p className="text-xs text-slate-500 dark:text-brand-200">
            Comparativo en tiempo real · Pasa el cursor sobre los pilares
          </p>
        </div>
        {hoveredInfo && (
          <div className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white shadow dark:bg-gold dark:text-brand-900">
            {hoveredInfo}
          </div>
        )}
      </div>

      <div
        ref={mountRef}
        className="relative h-60 w-full overflow-hidden"
        style={{ minHeight: "240px" }}
      />
    </div>
  );
}
