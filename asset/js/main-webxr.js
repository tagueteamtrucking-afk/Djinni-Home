// asset/js/main-webxr.js
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import GUI from 'lil-gui';

const APP = {
  params: new URLSearchParams(location.search),
  state: {
    adjusting: true,
    vrm: null,
    wings: null,
    wingsRoot: new THREE.Group(),
    mixers: [],
    clock: new THREE.Clock(),
  }
};

const statusEl = document.getElementById('status');
const canvas = document.getElementById('app');

function setStatus(t){ statusEl.textContent = t; console.log('[Status]', t); }

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');

// Scene & Camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d14);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 2);

// Lights
const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.8);
hemi.position.set(0, 1, 0);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(3, 5, 2);
scene.add(dir);

// Floor
const floorGeo = new THREE.CircleGeometry(8, 64);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1f2b, roughness: 1.0, metalness: 0.0 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotateX(-Math.PI/2);
floor.receiveShadow = true;
scene.add(floor);

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

let adjustMode = true;
function toggleAdjust() {
  adjustMode = !adjustMode;
  setStatus(adjustMode ? 'Adjust: ON' : 'Adjust: LOCKED');
}

// Loading
const loadingManager = new THREE.LoadingManager();
loadingManager.onStart = () => setStatus('Loading assets…');
loadingManager.onLoad = () => setStatus('Ready');
loadingManager.onError = (url) => setStatus('Error: ' + url);

// Load VRM
const gltfLoader = new GLTFLoader(loadingManager);
gltfLoader.crossOrigin = 'anonymous';
gltfLoader.register((parser) => new VRMLoaderPlugin(parser));

const defaultVRM = APP.params.get('vrm') || 'asset/models/abbey.vrm';
const defaultWings = APP.params.get('wings') || 'asset/wings/Wing1415.fbx';

gltfLoader.load(defaultVRM, (gltf) => {
  const vrm = gltf.userData.vrm;
  APP.state.vrm = vrm;

  vrm.scene.traverse((o)=>{ o.frustumCulled = false; });
  vrm.scene.position.set(0, 0, 0);
  scene.add(vrm.scene);

  attachWingsToVRM(vrm, defaultWings);
}, (e)=>{
  if (e.total) setStatus(`VRM ${Math.round((e.loaded/e.total)*100)}%`);
}, (err)=>{
  console.error(err);
  setStatus('Failed to load VRM');
});

// Wings loader
const fbxLoader = new FBXLoader(loadingManager);
fbxLoader.crossOrigin = 'anonymous';

async function attachWingsToVRM(vrm, wingsURL){
  setStatus('Loading wings…');
  fbxLoader.load(wingsURL, (fbx)=>{
    const wings = fbx;
    // Normalize wings width to ~1.2m
    const bbox = new THREE.Box3().setFromObject(wings);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const targetWidth = 1.2;
    const currentWidth = Math.max(size.x, 1e-3);
    const s = targetWidth / currentWidth;
    wings.scale.setScalar(s);

    // Root for adjustments
    APP.state.wingsRoot = new THREE.Group();
    APP.state.wingsRoot.name = 'WingsRoot';
    APP.state.wingsRoot.add(wings);

    // Find chest/spine
    const chest = vrm.humanoid && vrm.humanoid.getBoneNode ? vrm.humanoid.getBoneNode('chest') : null;
    const spine = vrm.humanoid && vrm.humanoid.getBoneNode ? vrm.humanoid.getBoneNode('spine') : null;
    const anchor = chest || spine || vrm.scene;

    APP.state.wingsRoot.position.set(0, 0.15, -0.05);
    APP.state.wingsRoot.rotation.set(0, Math.PI, 0);
    scene.updateMatrixWorld(true);
    anchor.add(APP.state.wingsRoot);

    APP.state.wings = wings;
    setStatus('Wings attached');
  }, undefined, (err)=>{
    console.error(err);
    setStatus('Failed to load wings FBX');
  });
}

// VR button
document.body.appendChild(VRButton.createButton(renderer, {
  requiredFeatures: ['local-floor'],
}));
renderer.xr.addEventListener('sessionstart', ()=> document.body.classList.add('vr'));
renderer.xr.addEventListener('sessionend',  ()=> document.body.classList.remove('vr'));

// Resize
window.addEventListener('resize', ()=>{
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Desktop tweak GUI
const gui = new GUI();
const wingFolder = gui.addFolder('Wings');
const wingState = { rx: 0, ry: 0, rz: 0, px: 0, py: 0.15, pz: -0.05, scale: 1.0, flap: true };
wingFolder.add(wingState, 'rx', -Math.PI, Math.PI, 0.01);
wingFolder.add(wingState, 'ry', -Math.PI, Math.PI, 0.01);
wingFolder.add(wingState, 'rz', -Math.PI, Math.PI, 0.01);
wingFolder.add(wingState, 'px', -1.0, 1.0, 0.001);
wingFolder.add(wingState, 'py', -1.0, 1.0, 0.001);
wingFolder.add(wingState, 'pz', -1.0, 1.0, 0.001);
wingFolder.add(wingState, 'scale', 0.1, 3.0, 0.01);
wingFolder.add(wingState, 'flap');
wingFolder.close();

// Controller polling for adjust mode + transforms
function pollControllers(dt){
  const session = renderer.xr.getSession();
  if (!session || !APP.state.wingsRoot) return;

  for (const inputSource of session.inputSources) {
    const gp = inputSource.gamepad;
    if (!gp) continue;

    const axes = gp.axes || [];
    const buttons = gp.buttons || [];

    // A/X toggles adjust
    if (buttons[4]?.pressed && !APP.__aPressed) {
      toggleAdjust();
      APP.__aPressed = true;
    } else if (!buttons[4]?.pressed) {
      APP.__aPressed = false;
    }

    if (!adjustMode) continue;

    // Sticks
    const lx = axes[0] || 0;
    const ly = axes[1] || 0;
    const rx = axes[2] ?? lx;
    const ry = axes[3] ?? ly;

    // Move X/Z
    APP.state.wingsRoot.position.x += lx * dt * 0.5;
    APP.state.wingsRoot.position.z += ly * dt * 0.5;

    // Rotate Y
    APP.state.wingsRoot.rotation.y += rx * dt * 2.0;

    // Right Trigger -> vertical move with right stick Y
    const rightTrigger = buttons[0]?.pressed;
    if (rightTrigger) {
      APP.state.wingsRoot.position.y += (-ry) * dt * 0.6;
    }

    // Grip -> scale with right stick Y
    const leftGrip = buttons[1]?.pressed;
    const rightGrip = buttons[3]?.pressed || buttons[1]?.pressed;
    if (leftGrip || rightGrip) {
      const s = THREE.MathUtils.clamp(APP.state.wingsRoot.scale.x + (-ry) * dt * 1.0, 0.05, 3.0);
      APP.state.wingsRoot.scale.setScalar(s);
    }
  }
}

// Animation loop
function animate(){
  const dt = Math.min(APP.state.clock.getDelta(), 0.05);

  // Desktop GUI state -> wings
  if (APP.state.wingsRoot) {
    APP.state.wingsRoot.rotation.x = wingState.rx;
    if (!renderer.xr.isPresenting) {
      APP.state.wingsRoot.rotation.y = wingState.ry;
    }
    APP.state.wingsRoot.rotation.z = wingState.rz;
    APP.state.wingsRoot.position.set(wingState.px, wingState.py, wingState.pz);
    APP.state.wingsRoot.scale.setScalar(wingState.scale);
  }

  // Simple flap
  if (APP.state.wings && wingState.flap) {
    const t = performance.now() * 0.001;
    const flap = Math.sin(t * 3.0) * 0.3;
    APP.state.wings.rotation.z = flap;
  }

  pollControllers(dt);
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

// Persist settings
window.addEventListener('beforeunload', ()=>{
  if (!APP.state.wingsRoot) return;
  const data = {
    position: APP.state.wingsRoot.position.toArray(),
    rotationY: APP.state.wingsRoot.rotation.y,
    scale: APP.state.wingsRoot.scale.x
  };
  localStorage.setItem('djinni_wings', JSON.stringify(data));
});

// Restore
const saved = localStorage.getItem('djinni_wings');
if (saved) {
  try {
    const d = JSON.parse(saved);
    wingState.px = d.position[0];
    wingState.py = d.position[1];
    wingState.pz = d.position[2];
    wingState.ry = d.rotationY ?? 0;
    wingState.scale = d.scale ?? 1;
    // GUI will reflect on next frame
  } catch(e){}
}

setStatus('Boot v1 — WebXR (three@0.177 + three-vrm@3.4.2)');
