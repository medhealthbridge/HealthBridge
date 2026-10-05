"use client";

import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { CODE_BY_KEY, isUpper, kindOf, positionOf, quadrantOf, rootCount, PERMANENT_TEETH, type ToothState } from "@/src/lib/dental-chart";

type Props = {
  states: Map<number, ToothState>;
  selected: number | null;
  onSelect: (tooth: number) => void;
  onHover: (tooth: number | null) => void;
  /** WebGL is missing or failed: the parent falls back to the flat chart. */
  onFail: () => void;
};

// Mesio-distal width, bucco-lingual depth and crown height per tooth position (1 = central incisor … 8 = third molar).
const SIZE: Record<number, [number, number, number]> = {
  1: [0.85, 0.6, 1.05], 2: [0.68, 0.55, 0.98], 3: [0.78, 0.8, 1.15], 4: [0.74, 0.88, 0.95], 5: [0.72, 0.88, 0.92], 6: [1.15, 1.15, 0.85], 7: [1.05, 1.1, 0.8], 8: [0.95, 1.0, 0.75],
};
const ENAMEL = "#f4efe4";
const DENTIN = "#e2d3b0";
const GUM = "#d98a8f";

/** Points along the dental arch, from the midline outward on one side, spaced by each tooth's width. */
function archPositions(upper: boolean) {
  const A = upper ? 5.2 : 4.5;
  const B = upper ? 4.4 : 3.8;
  const widths = [1, 2, 3, 4, 5, 6, 7, 8].map((position) => SIZE[position][0] + 0.06);
  // Arc length along the half-ellipse, by small steps.
  const table: { s: number; phi: number }[] = [{ s: 0, phi: 0 }];
  for (let phi = 0.005; phi <= Math.PI * 0.62; phi += 0.005) {
    const prev = table[table.length - 1];
    const dx = A * (Math.sin(phi) - Math.sin(prev.phi));
    const dz = B * (Math.cos(phi) - Math.cos(prev.phi));
    table.push({ s: prev.s + Math.hypot(dx, dz), phi });
  }
  const at = (s: number) => table.find((row) => row.s >= s)?.phi ?? table[table.length - 1].phi;
  let used = 0;
  return widths.map((width) => {
    const phi = at(used + width / 2);
    used += width;
    const x = A * Math.sin(phi);
    const z = B * Math.cos(phi);
    const normal = Math.atan2(x / (A * A), z / (B * B));
    return { x, z, angle: normal };
  });
}

function surfaceColor(code: string) {
  return CODE_BY_KEY.get(code)?.color ?? "#999999";
}

export function ToothChart3D({ states, selected, onSelect, onHover, onFail }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ rebuild: (states: Map<number, ToothState>) => void; repaint: () => void } | null>(null);
  const latest = useRef({ states, selected, onSelect, onHover, onFail });
  useEffect(() => {
    latest.current = { states, selected, onSelect, onHover, onFail };
  });

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      let three: typeof THREE;
      let OrbitControls: typeof import("three/addons/controls/OrbitControls.js").OrbitControls;
      try {
        three = await import("three");
        ({ OrbitControls } = await import("three/addons/controls/OrbitControls.js"));
      } catch {
        if (!disposed) latest.current.onFail();
        return;
      }
      if (disposed) return;

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new three.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        latest.current.onFail();
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      element.appendChild(renderer.domElement);
      renderer.domElement.style.display = "block";
      renderer.domElement.style.touchAction = "none";
      renderer.domElement.setAttribute("role", "img");
      renderer.domElement.setAttribute("aria-label", "3D model of the patient's teeth. Drag to turn, scroll or pinch to zoom, tap a tooth to select it. The flat chart tab has the same information as a list.");

      const scene = new three.Scene();
      const camera = new three.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(0, 5.5, 15);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 0, 0);
      controls.enablePan = false;
      controls.minDistance = 7;
      controls.maxDistance = 24;
      controls.minPolarAngle = 0.25;
      controls.maxPolarAngle = Math.PI * 0.62;

      scene.add(new three.HemisphereLight("#ffffff", "#8b7f78", 1.4));
      const key = new three.DirectionalLight("#ffffff", 2.2);
      key.position.set(4, 10, 9);
      scene.add(key);
      const fill = new three.DirectionalLight("#cfe3ff", 0.7);
      fill.position.set(-8, 2, -4);
      scene.add(fill);

      const root = new three.Group();
      scene.add(root);
      const materials = new Map<string, THREE.MeshStandardMaterial>();
      const material = (color: string, options: { metal?: number; rough?: number; opacity?: number } = {}) => {
        const id = `${color}|${options.metal ?? 0}|${options.rough ?? 0.45}|${options.opacity ?? 1}`;
        let found = materials.get(id);
        if (!found) {
          found = new three.MeshStandardMaterial({ color, metalness: options.metal ?? 0, roughness: options.rough ?? 0.45, transparent: (options.opacity ?? 1) < 1, opacity: options.opacity ?? 1 });
          materials.set(id, found);
        }
        return found;
      };

      const teeth = new Map<number, THREE.Group>();
      const tintables = new Map<number, THREE.MeshStandardMaterial[]>();

      // Gum bands along each arch, for context.
      for (const upper of [true, false]) {
        const side = archPositions(upper);
        // The gum sits over the roots, with its edge at the necks of the crowns.
        const y = upper ? 2.05 : -2.05;
        const points = [...side].reverse().map((p) => new three.Vector3(-p.x, y, p.z)).concat(side.map((p) => new three.Vector3(p.x, y, p.z)));
        const gum = new three.Mesh(new three.TubeGeometry(new three.CatmullRomCurve3(points), 96, 0.72, 12, false), material(GUM, { rough: 0.75 }));
        root.add(gum);
      }

      function buildTooth(tooth: number, state: ToothState | undefined) {
        const upper = isUpper(tooth);
        const position = positionOf(tooth);
        const kind = kindOf(tooth);
        const [w, d, h] = SIZE[position];
        const inner = new three.Group();
        const mats: THREE.MeshStandardMaterial[] = [];
        const enamel = state?.crown ? material("#e9b92d", { metal: 0.85, rough: 0.28 }) : state?.veneer ? material("#fffdf7", { rough: 0.15 }) : material(ENAMEL, { rough: 0.3 });
        const base = enamel.clone();
        mats.push(base);
        const add = (mesh: THREE.Mesh) => {
          inner.add(mesh);
          return mesh;
        };

        if (state?.missing && !state.implant) {
          // A faint ghost shows where the tooth was.
          const ghost = new three.Mesh(new three.CylinderGeometry(0.5, 0.42, h * 0.9, 14), material("#94a3b8", { opacity: 0.18 }));
          ghost.scale.set(w, 1, d);
          ghost.position.y = h * 0.45;
          add(ghost);
          return { inner, mats: [] as THREE.MeshStandardMaterial[], w, d, h };
        }

        if (state?.implant) {
          const titanium = material("#8b97a6", { metal: 0.9, rough: 0.3 });
          const post = add(new three.Mesh(new three.CylinderGeometry(0.22, 0.14, 1.5, 12), titanium));
          post.position.y = -0.75;
          for (let i = 0; i < 5; i++) {
            const thread = add(new three.Mesh(new three.TorusGeometry(0.2 - i * 0.012, 0.035, 6, 14), titanium));
            thread.rotation.x = Math.PI / 2;
            thread.position.y = -0.3 - i * 0.26;
          }
          const abutment = add(new three.Mesh(new three.CylinderGeometry(0.3, 0.24, 0.3, 12), titanium));
          abutment.position.y = 0.1;
          const crown = add(new three.Mesh(new three.CylinderGeometry(0.5, 0.42, h * 0.9, 16), base));
          crown.scale.set(w, 1, d);
          crown.position.y = 0.25 + h * 0.45;
          return { inner, mats, w, d, h: h * 0.9 + 0.25 };
        }

        // Crown
        const crown = add(new three.Mesh(new three.CylinderGeometry(kind === "incisor" ? 0.42 : 0.46, 0.5, h, 18, 1), base));
        crown.scale.set(w, 1, d);
        crown.position.y = h / 2;
        if (kind === "canine") {
          const tip = add(new three.Mesh(new three.ConeGeometry(0.46, 0.4, 18), base));
          tip.scale.set(w, 1, d);
          tip.position.y = h + 0.2;
        } else if (kind === "premolar") {
          for (const dz of [-0.22, 0.22]) {
            const cusp = add(new three.Mesh(new three.SphereGeometry(0.2, 12, 10), base));
            cusp.scale.set(w * 0.9, 0.8, d * 0.9);
            cusp.position.set(0, h + 0.03, dz * d);
          }
        } else if (kind === "molar") {
          for (const dx of [-0.24, 0.24]) {
            for (const dz of [-0.24, 0.24]) {
              const cusp = add(new three.Mesh(new three.SphereGeometry(0.2, 12, 10), base));
              cusp.scale.set(w * 0.9, 0.75, d * 0.9);
              cusp.position.set(dx * w, h + 0.02, dz * d);
            }
          }
        }

        // Roots (tinted indigo after a root canal)
        const rootMat = state?.rct ? material("#4f46e5", { rough: 0.5 }) : material(DENTIN, { rough: 0.7 });
        const roots = rootCount(tooth);
        const rootLength = kind === "incisor" ? 1.0 : kind === "canine" ? 1.15 : kind === "premolar" ? 0.95 : 0.85;
        for (let i = 0; i < roots; i++) {
          const spread = roots === 1 ? 0 : (i - (roots - 1) / 2) * (w * 0.55);
          const cone = add(new three.Mesh(new three.ConeGeometry(roots === 1 ? Math.max(w, d) * 0.36 : 0.24, rootLength, 10), rootMat));
          cone.rotation.z = Math.PI;
          cone.position.set(spread, -rootLength / 2 + 0.05, roots === 3 && i === 2 ? -d * 0.25 : 0);
        }
        if (state?.lesion) {
          const lesion = add(new three.Mesh(new three.SphereGeometry(0.28, 12, 10), material("#db2777", { opacity: 0.75 })));
          lesion.position.y = -rootLength + 0.1;
        }

        // Surface layers: caries, filling, sealant, watch
        const mesial = (quadrantOf(tooth) === 1 || quadrantOf(tooth) === 4 ? -1 : 1) * (upper ? -1 : 1);
        const place = (surface: string): [number, number, number, [number, number, number]] => {
          switch (surface) {
            case "M": return [mesial * w * 0.5, h * 0.55, 0, [0.12, 0.55, 0.55]];
            case "D": return [-mesial * w * 0.5, h * 0.55, 0, [0.12, 0.55, 0.55]];
            case "B": return [0, h * 0.55, d * 0.5, [0.55, 0.55, 0.12]];
            case "L": return [0, h * 0.55, -d * 0.5, [0.55, 0.55, 0.12]];
            default: return [0, h + (kind === "molar" ? 0.2 : kind === "premolar" ? 0.14 : 0), 0, [0.5, 0.12, 0.5]];
          }
        };
        const patch = (surfaces: string, color: string, metal = 0) => {
          for (const surface of surfaces) {
            const [x, y, z, scale] = place(surface);
            const mesh = add(new three.Mesh(new three.SphereGeometry(0.5, 12, 10), material(color, { metal, rough: 0.4 })));
            mesh.scale.set(scale[0] * w, scale[1] * h, scale[2] * d);
            mesh.position.set(x, y, z);
          }
        };
        if (state) {
          patch(state.filling, surfaceColor("filling"), 0.5);
          patch(state.sealant, surfaceColor("sealant"));
          patch(state.watch, surfaceColor("watch"));
          patch(state.caries, "#7f1d1d");
          if (state.veneer) patch("B", "#ffffff");
          if (state.fracture) {
            const crack = add(new three.Mesh(new three.BoxGeometry(0.05, h * 0.9, 0.05), material("#ea580c")));
            crack.position.set(0.05 * w, h * 0.55, d * 0.52);
            crack.rotation.z = 0.35;
          }
          if (state.bridge) {
            const band = add(new three.Mesh(new three.TorusGeometry(0.5, 0.07, 8, 24), material("#f59e0b", { metal: 0.8, rough: 0.3 })));
            band.scale.set(w, d, 1);
            band.rotation.x = Math.PI / 2;
            band.position.y = h * 0.2;
          }
          if (state.impacted) {
            inner.traverse((object) => {
              const mesh = object as THREE.Mesh;
              if (mesh.isMesh && mesh.material === base) mesh.material = material("#a78bfa", { opacity: 0.55 });
            });
          }
          if (state.mobile) {
            const ring = add(new three.Mesh(new three.TorusGeometry(0.62, 0.035, 6, 24), material("#d97706")));
            ring.scale.set(w, d, 1);
            ring.rotation.x = Math.PI / 2;
            ring.position.y = h + 0.05;
          }
        }
        return { inner, mats, w, d, h };
      }

      function rebuild(states: Map<number, ToothState>) {
        for (const group of teeth.values()) {
          root.remove(group);
          group.traverse((object) => (object as THREE.Mesh).isMesh && (object as THREE.Mesh).geometry.dispose());
        }
        for (const mats of tintables.values()) for (const mat of mats) mat.dispose();
        teeth.clear();
        tintables.clear();
        for (const upper of [true, false]) {
          const spots = archPositions(upper);
          for (const tooth of PERMANENT_TEETH) {
            if (isUpper(tooth) !== upper) continue;
            const position = positionOf(tooth);
            const spot = spots[position - 1];
            const side = quadrantOf(tooth) === 1 || quadrantOf(tooth) === 4 ? -1 : 1;
            const { inner, mats } = buildTooth(tooth, states.get(tooth));
            const outer = new three.Group();
            if (upper) inner.rotation.z = Math.PI;
            outer.add(inner);
            outer.position.set(side * spot.x, upper ? 1.4 : -1.4, spot.z);
            outer.rotation.y = side < 0 ? -spot.angle : spot.angle;
            outer.userData.tooth = tooth;
            root.add(outer);
            teeth.set(tooth, outer);
            tintables.set(tooth, mats);
          }
        }
      }

      const accent = new three.Color("#2563eb");
      const hoverColor = new three.Color("#38bdf8");
      let hovered: number | null = null;
      function paint() {
        for (const [tooth, mats] of tintables) {
          const isSelected = latest.current.selected === tooth;
          for (const mat of mats) {
            mat.emissive.copy(isSelected ? accent : hovered === tooth ? hoverColor : new three.Color("#000000"));
            mat.emissiveIntensity = isSelected ? 0.55 : hovered === tooth ? 0.3 : 0;
          }
          const group = teeth.get(tooth);
          if (group) group.scale.setScalar(isSelected ? 1.08 : 1);
        }
      }

      let frame = 0;
      const render = () => {
        frame = 0;
        renderer.render(scene, camera);
      };
      const request = () => {
        if (!frame) frame = requestAnimationFrame(render);
      };
      controls.addEventListener("change", request);

      rebuild(latest.current.states);
      paint();

      function size() {
        const width = element!.clientWidth;
        const height = element!.clientHeight;
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        camera.aspect = width / height;
        // Keep the whole arch in frame on narrow screens.
        camera.position.setLength(width < 520 ? 21 : 15);
        camera.updateProjectionMatrix();
        request();
      }
      const observer = new ResizeObserver(size);
      observer.observe(element);
      size();

      const raycaster = new three.Raycaster();
      const pointer = new three.Vector2();
      const pick = (event: PointerEvent): number | null => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects([...teeth.values()], true)[0];
        let node: THREE.Object3D | null = hit?.object ?? null;
        while (node && node.userData.tooth === undefined) node = node.parent;
        return node ? (node.userData.tooth as number) : null;
      };
      let downAt: { x: number; y: number } | null = null;
      const onDown = (event: PointerEvent) => { downAt = { x: event.clientX, y: event.clientY }; };
      const onUp = (event: PointerEvent) => {
        if (!downAt) return;
        const moved = Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y);
        downAt = null;
        if (moved > 6) return;
        const tooth = pick(event);
        if (tooth !== null) latest.current.onSelect(tooth);
      };
      const onMove = (event: PointerEvent) => {
        if (event.pointerType === "touch" || event.buttons) return;
        const tooth = pick(event);
        if (tooth === hovered) return;
        hovered = tooth;
        renderer.domElement.style.cursor = tooth === null ? "grab" : "pointer";
        latest.current.onHover(tooth);
        paint();
        request();
      };
      const onLeave = () => {
        if (hovered === null) return;
        hovered = null;
        latest.current.onHover(null);
        paint();
        request();
      };
      renderer.domElement.addEventListener("pointerdown", onDown);
      renderer.domElement.addEventListener("pointerup", onUp);
      renderer.domElement.addEventListener("pointermove", onMove);
      renderer.domElement.addEventListener("pointerleave", onLeave);

      api.current = {
        rebuild(nextStates) {
          rebuild(nextStates);
          paint();
          request();
        },
        repaint() {
          paint();
          request();
        },
      };
      request();
      // The first frame can land before layout settles.
      requestAnimationFrame(size);

      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        controls.dispose();
        renderer.domElement.removeEventListener("pointerdown", onDown);
        renderer.domElement.removeEventListener("pointerup", onUp);
        renderer.domElement.removeEventListener("pointermove", onMove);
        renderer.domElement.removeEventListener("pointerleave", onLeave);
        scene.traverse((object) => {
          const mesh = object as THREE.Mesh;
          if (mesh.isMesh) mesh.geometry.dispose();
        });
        for (const mat of materials.values()) mat.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        api.current = null;
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  // New findings rebuild the model; a new selection only re-tints it.
  useEffect(() => api.current?.rebuild(states), [states]);
  useEffect(() => api.current?.repaint(), [selected]);

  return <div ref={host} className="h-[22rem] w-full touch-none rounded-lg bg-gradient-to-b from-console-canvas to-console-panel sm:h-[28rem]" data-tooth-chart-3d />;
}
