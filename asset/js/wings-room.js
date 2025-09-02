import * as THREE from "https://unpkg.com/three@0.152.2/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.152.2/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://unpkg.com/three@0.152.2/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "https://unpkg.com/three@0.152.2/examples/jsm/loaders/FBXLoader.js";
import { VRM, VRMUtils } from "https://unpkg.com/@pixiv/three-vrm@2.0.5/lib/three-vrm.module.js";
import { TransformControls } from "https://unpkg.com/three@0.152.2/examples/jsm/controls/TransformControls.js";

export function startWingsRoom(modelPath, wingPath) {
  const canvas = document.getElementById("scene");
  const hud = document.getElementById("hud");

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setSize(innerWidth, innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111116);

  const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 1.5, 3);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(3, 5, 4);
  scene.add(key);

  let vrm = null;
  let wing = null;
  let wingCtrl = null;
  const clock = new THREE.Clock();

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  async function loadVRM(url) {
    hud.textContent = `Loading VRM: ${url}`;
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(url);
    VRMUtils.removeUnnecessaryJoints(gltf.scene);
    const loaded = await VRM.from(gltf); // ✅ correct API
    if (vrm) scene.remove(vrm.scene);
    vrm = loaded;
    vrm.scene.rotation.y = Math.PI;
    scene.add(vrm.scene);
    hud.textContent = `Loaded VRM: ${url.split("/").pop()}`;
  }

  async function loadWing(url) {
    if (!vrm) { alert("Load VRM first"); return; }
    hud.textContent = `Loading Wing: ${url}`;
    const loader = new FBXLoader();
    const obj = await loader.loadAsync(url);
    obj.scale.setScalar(0.01);
    obj.position.set(0, 0.2, -0.05);

    const spine = vrm.humanoid.getBoneNode("spine") || vrm.scene;
    spine.add(obj);
    wing = obj;

    // Transform controls
    if (wingCtrl) scene.remove(wingCtrl);
    wingCtrl = new TransformControls(camera, renderer.domElement);
    wingCtrl.addEventListener("dragging-changed", e => controls.enabled = !e.value);
    wingCtrl.attach(wing);
    scene.add(wingCtrl);

    hud.textContent = `Wing loaded: ${url.split("/").pop()} (1=Move 2=Rotate 3=Scale)`;
    window.addEventListener("keydown", e => {
      if (e.key === "1") wingCtrl.setMode("translate");
      if (e.key === "2") wingCtrl.setMode("rotate");
      if (e.key === "3") wingCtrl.setMode("scale");
    });
  }

  document.getElementById("loadVrmBtn").onclick = () => loadVRM(modelPath);
  document.getElementById("loadWingBtn").onclick = () => loadWing(wingPath);

  // auto-load defaults
  loadVRM(modelPath).catch(() => hud.textContent = "VRM load error");

  (function loop() {
    requestAnimationFrame(loop);
    const dt = clock.getDelta();
    if (vrm) vrm.update(dt);
    controls.update();
    renderer.render(scene, camera);
  })();
}
