"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface PackagingBox {
  code: string;
  name: string;
  quantity: number;
  minStock: number;
}

export function PackagingViewer3D({
  boxes,
}: {
  boxes: PackagingBox[];
}) {
  const [selectedBoxCode, setSelectedBoxCode] = useState<string>(
    boxes[0]?.code || "C4"
  );
  const mountRef = useRef<HTMLDivElement>(null);

  const selectedBox = boxes.find((b) => b.code === selectedBoxCode) || boxes[0];

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 360;
    let height = container.clientHeight || 220;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(3, 2.5, 4);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xfff8e7, 1.3);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(4, 6, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xd97706, 2, 8);
    pointLight.position.set(-2, 1, 3);
    scene.add(pointLight);

    const group = new THREE.Group();
    scene.add(group);

    // Cardboard box dimensions based on code
    const isC10 = selectedBoxCode === "C10";
    const boxW = isC10 ? 2.4 : 1.6;
    const boxH = 1.0;
    const boxD = isC10 ? 1.6 : 1.6;

    // Cardboard Material
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0xca8a04, // Cardboard brown/gold
      roughness: 0.8,
      metalness: 0.05,
    });

    const boxGeo = new THREE.BoxGeometry(boxW, boxH, boxD);
    const boxMesh = new THREE.Mesh(boxGeo, boxMat);
    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;
    group.add(boxMesh);

    // White brand label sticker on top
    const labelGeo = new THREE.PlaneGeometry(boxW * 0.6, boxD * 0.6);
    const labelMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      roughness: 0.4,
    });
    const labelMesh = new THREE.Mesh(labelGeo, labelMat);
    labelMesh.rotation.x = -Math.PI / 2;
    labelMesh.position.y = boxH / 2 + 0.01;
    group.add(labelMesh);

    // Green Buñuelandia brand tape stripe
    const tapeGeo = new THREE.PlaneGeometry(boxW, 0.2);
    const tapeMat = new THREE.MeshStandardMaterial({
      color: 0x0b3d2e,
      roughness: 0.3,
    });
    const tapeMesh = new THREE.Mesh(tapeGeo, tapeMat);
    tapeMesh.rotation.x = -Math.PI / 2;
    tapeMesh.position.y = boxH / 2 + 0.015;
    group.add(tapeMesh);

    // Grid Floor
    const grid = new THREE.GridHelper(5, 6, 0xd97706, 0x78350f);
    grid.position.y = -boxH / 2 - 0.05;
    if (Array.isArray(grid.material)) {
      grid.material.forEach((m) => {
        m.transparent = true;
        m.opacity = 0.2;
      });
    } else {
      grid.material.transparent = true;
      grid.material.opacity = 0.2;
    }
    scene.add(grid);

    // Drag / auto-rotation
    let isDragging = false;
    let prevMouseX = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const delta = e.clientX - prevMouseX;
      group.rotation.y += delta * 0.01;
      prevMouseX = e.clientX;
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    container.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    // Resize
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      width = container.clientWidth || 360;
      height = container.clientHeight || 220;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(container);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isDragging) {
        group.rotation.y += 0.008;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      resizeObserver.disconnect();
      renderer.dispose();
      boxGeo.dispose();
      boxMat.dispose();
      labelGeo.dispose();
      labelMat.dispose();
      tapeGeo.dispose();
      tapeMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [selectedBoxCode]);

  if (!boxes.length) return null;

  const isLow = selectedBox && selectedBox.quantity <= selectedBox.minStock;

  return (
    <div className="mb-6 rounded-xl border border-brand/10 bg-surface p-4 shadow-sm dark:border-brand-200/15 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-brand dark:text-brand-100">
            Visor 3D de Cajas de Empaque
          </h2>
          <p className="text-xs text-slate-500 dark:text-brand-200">
            Selecciona la caja para rotar y verificar disponibilidad
          </p>
        </div>

        <div className="flex items-center gap-2">
          {boxes.map((b) => (
            <button
              key={b.code}
              type="button"
              onClick={() => setSelectedBoxCode(b.code)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                selectedBoxCode === b.code
                  ? "bg-brand text-white shadow-sm dark:bg-brand-light"
                  : "border border-brand/15 bg-surface text-slate-600 hover:bg-slate-50 dark:border-brand-200/20 dark:text-brand-200"
              }`}
            >
              Caja {b.code} ({b.quantity} uds)
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid items-center gap-4 sm:grid-cols-3">
        <div
          ref={mountRef}
          className="relative h-48 w-full cursor-grab active:cursor-grabbing sm:col-span-2"
          style={{ minHeight: "190px" }}
        />

        <div className="flex flex-col justify-center rounded-lg border border-brand/10 bg-cream-muted/50 p-4 dark:border-brand-200/10 sm:col-span-1">
          <p className="text-xs text-slate-500 dark:text-brand-200">
            Caja Seleccionada
          </p>
          <p className="text-base font-bold text-brand dark:text-brand-100">
            {selectedBox?.name || `Caja ${selectedBoxCode}`}
          </p>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-brand-50">
              {selectedBox?.quantity ?? 0}
            </span>
            <span className="text-xs text-slate-500">unidades</span>
          </div>

          <div className="mt-2">
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isLow
                  ? "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
                  : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200"
              }`}
            >
              {isLow ? "Stock Bajo (Reponer)" : "Stock Óptimo"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
