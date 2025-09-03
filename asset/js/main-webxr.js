// asset/js/main-webxr.js (v2 with prechecks)
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import GUI from 'lil-gui';

const statusEl = document.getElementById('status');
const setStatus = (t)=>{ statusEl.textContent = t; console.log('[Status]', t); };

const params = new URLSearchParams(location.search);
const defaultVRM = params.get('vrm') || 'asset/models/abbey.vrm';
const defaultWings = params.get('wings') || 'asset/wings/Wing1415.fbx';

// --- Quick existence precheck to avoid "stuck Booting…" confusion
async function exists(url){
  try {
    const r = await fetch(url + (url.includes('?')?'&':'?') + 'v=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
    return r.ok;
  } catch { return false; }
}
(async ()=>{
  const [vrmOK, wingsOK] = await Promise.all([exists(defaultVRM), exists(defaultWings)]);
  if (!vrmOK && !wingsOK) setStatus('Missing files: ' + defaultVRM + ' and ' + defaultWings);
  else if (!vrmOK) setStatus('Missing VRM at ' + defaultVRM + ' — upload a file or set ?vrm=...');
  else if (!wingsOK) setStatus('Missing wings at ' + defaultWings + ' — upload files or set ?wings=...');
})();

// Renderer/scene/camera
const canvas = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d14);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 2);

// Lights
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.8));
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(3, 5, 2); scene.add(dir);

// Floor
const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 64), new THREE.MeshStandardMaterial({ color: 0x1a1f2b }));
floor.rotateX(-Math.PI/2); floor.receiveShadow = true; scene.add(floor);

// Controllers
const controller0 = renderer.xr.getController(0);
const controller1 = renderer.xr.getController(1);
scene.add(controller0, controller1);
const controllerGrip0 = renderer.xr.getControllerGrip(0);
const controllerGrip1 = renderer.xr.getControllerGrip(1);
const controllerModelFactory = new XRControllerModelFactory();
controllerGrip0.add(controllerModelFactory.createControllerModel(controllerGrip0));
controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
scene.add(controllerGrip0, controllerGrip1);

// State
let adjustMode = true;
const state = {
  wingsRoot: new THREE.Group(),
  wings: null,
  clock: new THREE.Clock(),
};

function toggleAdjust(){
  adjustMode = !adjustMode;
  setStatus(adjustMode ? 'Adjust: ON' : 'Adjust: LOCKED');
}

// Loading
const loadingManager = new THREE.LoadingManager();
loadingManager.onStart = () => setStatus('Loading assets…');
loadingManager.onLoad = () => setStatus('Ready');
loadingManager.onError = (url) => setStatus('Error: ' + url);

// VRM loader
const gltfLoader = new GLTFLoader(loadingManager);
gltfLoader.crossOrigin = 'anonymous';
gltfLoader.register((parser) => new VRMLoaderPlugin(parser));

gltfLoader.load(defaultVRM, (gltf)=>{
  const vrm = gltf.userData.vrm;
  vrm.scene.traverse(o=>o.frustumCulled = false);
  scene.add(vrm.scene);
  attachWingsToVRM(vrm, defaultWings);
}, (e)=>{
  if (e.total) setStatus(`VRM ${Math.round((e.loaded/e.total)*100)}%`);
}, (err)=>{
  console.error(err);
  setStatus('Failed to load VRM: ' + (err?.message || 'check path'));
});

// Wings loader
const fbxLoader = new FBXLoader(loadingManager);
fbxLoader.crossOrigin = 'anonymous';

function attachWingsToVRM(vrm, url){
  setStatus('Loading wings…');
  fbxLoader.load(url, (fbx)=>{
    const wings = fbx;
    const bbox = new THREE.Box3().setFromObject(wings);
    const size = new THREE.Vector3(); bbox.getSize(size);
    const s = 1.2 / Math.max(size.x || 1e-3, 1e-3);
    wings.scale.setScalar(s);

    state.wingsRoot = new THREE.Group();
    state.wingsRoot.name = 'WingsRoot';
    state.wingsRoot.add(wings);

    const chest = vrm.humanoid?.getBoneNode?.('chest');
    const spine = vrm.humanoid?.getBoneNode?.('spine');
    (chest || spine || vrm.scene).add(state.wingsRoot);
    state.wingsRoot.position.set(0, 0.15, -0.05);
    state.wingsRoot.rotation.set(0, Math.PI, 0);

    state.wings = wings;
    setStatus('Wings attached');
  }, undefined, (err)=>{
    console.error(err);
    setStatus('Failed to load wings FBX: ' + (err?.message || 'check path'));
  });
}

// VR button & HUD class
document.body.appendChild(VRButton.createButton(renderer, { requiredFeatures: ['local-floor'] }));
renderer.xr.addEventListener('sessionstart', ()=> document.body.classList.add('vr'));
renderer.xr.addEventListener('sessionend',  ()=> document.body.classList.remove('vr'));

// GUI
const gui = new GUI();
const wing = { rx:0, ry:0, rz:0, px:0, py:0.15, pz:-0.05, scale:1, flap:true };
gui.add(wing, 'rx', -Math.PI, Math.PI, 0.01); gui.add(wing, 'ry', -Math.PI, Math.PI, 0.01); gui.add(wing, 'rz', -Math.PI, Math.PI, 0.01);
gui.add(wing, 'px', -1,1,0.001); gui.add(wing,'py',-1,1,0.001); gui.add(wing,'pz',-1,1,0.001);
gui.add(wing, 'scale', 0.05, 3, 0.01); gui.add(wing, 'flap'); gui.close();

// Controller polling
function pollControllers(dt){
  const session = renderer.xr.getSession(); if (!session || !state.wingsRoot) return;
  for (const src of session.inputSources){
    const gp = src.gamepad; if (!gp) continue;
    const a = gp.axes || []; const b = gp.buttons || [];
    if (b[4]?.pressed && !state.__ax){ toggleAdjust(); state.__ax = true; } else if (!b[4]?.pressed){ state.__ax = false; }
    if (!adjustMode) continue;
    const lx=a[0]||0, ly=a[1]||0, rx=a[2]??lx, ry=a[3]??ly;
    state.wingsRoot.position.x += lx*dt*0.5;
    state.wingsRoot.position.z += ly*dt*0.5;
    state.wingsRoot.rotation.y += rx*dt*2.0;
    const trig = b[0]?.pressed;
    if (trig) state.wingsRoot.position.y += (-ry)*dt*0.6;
    const grip = b[1]?.pressed || b[3]?.pressed;
    if (grip){
      const s = THREE.MathUtils.clamp(state.wingsRoot.scale.x + (-ry)*dt*1.0, 0.05, 3.0);
      state.wingsRoot.scale.setScalar(s);
    }
  }
}

// Loop
function animate(){
  const dt = Math.min(state.clock.getDelta(), 0.05);
  if (state.wingsRoot){
    state.wingsRoot.rotation.x = wing.rx;
    if (!renderer.xr.isPresenting) state.wingsRoot.rotation.y = wing.ry;
    state.wingsRoot.rotation.z = wing.rz;
    state.wingsRoot.position.set(wing.px, wing.py, wing.pz);
    state.wingsRoot.scale.setScalar(wing.scale);
  }
  if (state.wings && wing.flap){
    const t = performance.now()*0.001;
    state.wings.rotation.z = Math.sin(t*3.0)*0.3;
  }
  pollControllers(dt);
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

// Persist
window.addEventListener('beforeunload', ()=>{
  if (!state.wingsRoot) return;
  localStorage.setItem('djinni_wings', JSON.stringify({
    position: state.wingsRoot.position.toArray(),
    rotationY: state.wingsRoot.rotation.y,
    scale: state.wingsRoot.scale.x
  }));
});

// Restore
try {
  const d = JSON.parse(localStorage.getItem('djinni_wings')||'null');
  if (d){
    wing.px=d.position[0]; wing.py=d.position[1]; wing.pz=d.position[2];
    wing.ry=d.rotationY||0; wing.scale=d.scale||1;
  }
} catch {}

setStatus('Boot v2 — WebXR (three@0.177 + three-vrm@3.4.2)');
