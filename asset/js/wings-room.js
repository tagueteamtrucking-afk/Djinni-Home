import * as THREE from "https://unpkg.com/three@0.152.2/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.152.2/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://unpkg.com/three@0.152.2/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "https://unpkg.com/three@0.152.2/examples/jsm/loaders/FBXLoader.js";
import { VRM, VRMUtils } from "https://unpkg.com/@pixiv/three-vrm@2.0.5/lib/three-vrm.module.js";
import { TransformControls } from "https://unpkg.com/three@0.152.2/examples/jsm/controls/TransformControls.js";

export function startWingsRoom({ modelsManifest, wingsManifest }) {
  const modelSelect = document.getElementById("modelSelect");
  const wingSelect  = document.getElementById("wingSelect");
  const hud   = document.getElementById("hud");
  const loadVrmBtn  = document.getElementById("loadVrmBtn");
  const loadWingBtn = document.getElementById("loadWingBtn");
  const saveBtn = document.getElementById("saveBtn");
  const loadBtn = document.getElementById("loadBtn");

  // --- scene ---
  const canvas = document.getElementById("scene");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setSize(innerWidth, innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111116);

  const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 1.5, 3);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(3, 5, 4);
  scene.add(key);

  const grid = new THREE.GridHelper(10, 20, 0x666666, 0x333333);
  grid.position.y = -1;
  scene.add(grid);

  const clock = new THREE.Clock();
  let vrm = null;
  let wing = null;
  let gizmo = null;

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // --- manifests ---
  const normalizeModels = (raw) => {
    // Accept array of strings or objects
    if (Array.isArray(raw) && raw.length && typeof raw[0] === "string") {
      return raw.map((p, i) => ({ id: `m${i}`, name: p.split("/").pop(), path: p }));
    }
    // Try common shapes: {models:[...]}, or just [...]
    const list = Array.isArray(raw.models) ? raw.models : raw;
    return list.map((m, i) => ({
      id:  m.id  || m.name || m.title || `m${i}`,
      name:m.name|| m.title|| m.id   || m.path?.split("/").pop() || `Model ${i+1}`,
      path:m.path|| m.url  || m.src  || m.file || m.model || m.vrm
    })).filter(x => !!x.path);
  };

  const normalizeWings = (raw) => {
    const list = Array.isArray(raw.wings) ? raw.wings : raw;
    return list.map((w, i) => ({
      id: w.id || w.name || `w${i}`,
      name: w.name || w.id || w.path?.split("/").pop() || `Wing ${i+1}`,
      path: w.path || w.url || w.src || w.file,
      textures: w.textures || []
    })).filter(x => !!x.path);
  };

  let models = [];
  let wings = [];

  async function loadManifests() {
    const [mRes, wRes] = await Promise.all([
      fetch(modelsManifest).then(r => r.json()).catch(()=>[]),
      fetch(wingsManifest).then(r => r.json()).catch(()=>[])
    ]);
    models = normalizeModels(mRes);
    wings  = normalizeWings(wRes);

    // Populate selects
    modelSelect.innerHTML = models.map(m => `<option value="${m.id}">${m.name}</option>`).join("");
    wingSelect.innerHTML  = wings.map(w => `<option value="${w.id}">${w.name}</option>`).join("");

    // Preselect first items
    if (models.length === 0) hud.textContent = "No models in models.json";
    if (wings.length  === 0) hud.textContent = "No wings in wings.json";
  }

  // --- loading ---
  async function loadVRMById(id) {
    const m = models.find(x => x.id === id);
    if (!m) return alert("Model not found in manifest");
    await loadVRM(m.path);
  }

  async function loadWingById(id) {
    const w = wings.find(x => x.id === id);
    if (!w) return alert("Wing not found in manifest");
    await loadWing(w.path, w.textures);
  }

  async function loadVRM(url) {
    hud.textContent = `Loading VRM: ${url}`;
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(url);
    VRMUtils.removeUnnecessaryJoints(gltf.scene);
    const loaded = await VRM.from(gltf); // ✅ correct for v2
    if (vrm) scene.remove(vrm.scene);
    vrm = loaded;
    vrm.scene.rotation.y = Math.PI;
    scene.add(vrm.scene);
    hud.textContent = `VRM loaded: ${url.split("/").pop()}`;
  }

  async function loadWing(url, textures = []) {
    if (!vrm) { alert("Load a VRM first"); return; }
    hud.textContent = `Loading Wing: ${url}`;
    const loader = new FBXLoader();
    const obj = await loader.loadAsync(url);

    // Apply basic material/texture (optional)
    obj.traverse(n => {
      if (n.isMesh) {
        if (!n.material) n.material = new THREE.MeshStandardMaterial({ color: 0xffffff });
        if (textures.length) {
          // Try the first texture as albedo
          new THREE.TextureLoader().load(textures[0], tex => {
            tex.flipY = false;
            n.material.map = tex;
            n.material.needsUpdate = true;
          });
        }
      }
    });

    const spine = vrm.humanoid.getBoneNode("spine") || vrm.humanoid.getBoneNode("chest") || vrm.scene;
    obj.scale.setScalar(0.01);
    obj.position.set(0, 0.2, -0.05);
    obj.rotation.set(0, Math.PI, 0);
    spine.add(obj);

    // Replace previous wing & gizmo if any
    if (wing && wing.parent) wing.parent.remove(wing);
    wing = obj;

    if (gizmo) { gizmo.detach(); scene.remove(gizmo); }
    gizmo = new TransformControls(camera, renderer.domElement);
    gizmo.addEventListener("dragging-changed", e => controls.enabled = !e.value);
    gizmo.attach(wing);
    scene.add(gizmo);

    window.onkeydown = (e) => {
      if (!gizmo) return;
      if (e.key === "1") gizmo.setMode("translate");
      if (e.key === "2") gizmo.setMode("rotate");
      if (e.key === "3") gizmo.setMode("scale");
    };

    hud.textContent = `Wing loaded: ${url.split("/").pop()}  (1=Move 2=Rotate 3=Scale)`;
  }

  // --- save/load placement per model ---
  function currentModelKey() {
    const m = models.find(x => x.id === modelSelect.value);
    return m?.id || "unknown";
  }

  function savePlacement() {
    if (!vrm || !wing) return alert("Load VRM and Wing first");
    const key = `wingPlacement:${currentModelKey()}`;
    const data = {
      position: { x: wing.position.x, y: wing.position.y, z: wing.position.z },
      rotation: { x: wing.rotation.x, y: wing.rotation.y, z: wing.rotation.z },
      scale:    { x: wing.scale.x,    y: wing.scale.y,    z: wing.scale.z }
    };
    localStorage.setItem(key, JSON.stringify(data));
    hud.textContent = `Saved placement → ${key}`;
  }

  function loadPlacement() {
    if (!vrm || !wing) return alert("Load VRM and Wing first");
    const key = `wingPlacement:${currentModelKey()}`;
    const json = localStorage.getItem(key);
    if (!json) return alert("No saved placement for this model");
    const p = JSON.parse(json);
    wing.position.set(p.position.x, p.position.y, p.position.z);
    wing.rotation.set(p.rotation.x, p.rotation.y, p.rotation.z);
    wing.scale.set(p.scale.x, p.scale.y, p.scale.z);
    hud.textContent = `Loaded placement ← ${key}`;
  }

  // --- wire UI ---
  loadVrmBtn.onclick  = () => loadVRMById(modelSelect.value);
  loadWingBtn.onclick = () => loadWingById(wingSelect.value);
  saveBtn.onclick = savePlacement;
  loadBtn.onclick = loadPlacement;

  // --- boot ---
  loadManifests().then(() => {
    // auto-load first model (if present)
    if (models.length) loadVRMById(models[0].id);
  });

  (function loop() {
    requestAnimationFrame(loop);
    const dt = clock.getDelta();
    if (vrm) vrm.update(dt);
    controls.update();
    renderer.render(scene, camera);
  })();
}
