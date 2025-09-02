// Minimal, dependable VRM room loader (three@0.152.2 + @pixiv/three-vrm@2)
import * as THREE from "https://unpkg.com/three@0.152.2/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.152.2/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://unpkg.com/three@0.152.2/examples/jsm/loaders/GLTFLoader.js";
import { VRM, VRMUtils } from "https://unpkg.com/@pixiv/three-vrm@2.0.5/lib/three-vrm.module.js";

export async function startVRMRoom() {
  const hud = document.getElementById("hud");
  const canvas = document.getElementById("scene");
  const modelPath = document.body.dataset.model; // e.g., ../../asset/models/abbey.vrm

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setSize(innerWidth, innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x121218);

  const camera = new THREE.PerspectiveCamera(35, innerWidth/innerHeight, 0.1, 100);
  camera.position.set(0, 1.5, 3);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(3,5,4); scene.add(key);
  const rim = new THREE.DirectionalLight(0x88aaff, 0.3); rim.position.set(-4,3,-3); scene.add(rim);

  // Aesthetic beginner props (low-poly + reliable)
  const floorGeo = new THREE.PlaneGeometry(10,10);
  const floorMat = new THREE.MeshStandardMaterial({ color:0x1b1f2b, roughness:0.9, metalness:0.05 });
  const floor = new THREE.Mesh(floorGeo, floorMat); floor.rotation.x = -Math.PI/2; floor.position.y = -1; scene.add(floor);

  const pillarGeo = new THREE.CylinderGeometry(0.12,0.12,2.0,24);
  const pillarMat = new THREE.MeshStandardMaterial({ color:0x2b3350, roughness:0.8, metalness:0.1 });
  const p1 = new THREE.Mesh(pillarGeo, pillarMat); p1.position.set(-1.6,0,-1.2); scene.add(p1);
  const p2 = new THREE.Mesh(pillarGeo, pillarMat); p2.position.set( 1.6,0,-1.2); scene.add(p2);

  const plinthGeo = new THREE.BoxGeometry(0.5,0.08,0.5);
  const plinthMat = new THREE.MeshStandardMaterial({ color:0x334466, metalness:0.1, roughness:0.8 });
  const plL = new THREE.Mesh(plinthGeo, plinthMat); plL.position.set(-0.8,-0.96,-0.4); scene.add(plL);
  const plR = new THREE.Mesh(plinthGeo, plinthMat); plR.position.set( 0.8,-0.96,-0.4); scene.add(plR);

  addEventListener("resize", ()=> {
    camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  let vrm = null; const clock = new THREE.Clock();

  async function loadVRM(url){
    hud.textContent = `Loading VRM: ${url}`;
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(url);
    VRMUtils.removeUnnecessaryJoints(gltf.scene);
    const loaded = await VRM.from(gltf);       // ✅ correct API for v2
    if (vrm) scene.remove(vrm.scene);
    vrm = loaded; vrm.scene.rotation.y = Math.PI;
    scene.add(vrm.scene);
    hud.textContent = `Loaded ${url.split('/').pop()}`;
  }

  try { await loadVRM(modelPath); } 
  catch (e) { hud.textContent = `VRM load error: ${e.message}`; console.error(e); }

  (function loop(){
    requestAnimationFrame(loop);
    const dt = clock.getDelta();
    if (vrm) vrm.update(dt);
    controls.update();
    renderer.render(scene, camera);
  })();
}
