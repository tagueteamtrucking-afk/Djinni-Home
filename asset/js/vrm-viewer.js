import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { hud } from './util.js';

export function createViewer(canvas){
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, innerWidth/innerHeight, 0.1, 100);
  camera.position.set(0, 1.5, 2.2);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 1.35, 0); controls.update();

  scene.add(new THREE.DirectionalLight(0xffffff, 1.2).position.set(1,1.5,1));
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  window.addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
  });

  let clock = new THREE.Clock();
  let currentVRM = null;
  let currentWing = null;
  let wingTarget = null;

  function animate(){
    requestAnimationFrame(animate);
    const d = clock.getDelta();
    if (currentVRM?.update) currentVRM.update(d);
    renderer.render(scene, camera);
  } animate();

  const gltfLoader = new GLTFLoader();
  gltfLoader.register((parser) => new VRMLoaderPlugin(parser));
  const fbxLoader = new FBXLoader();

  function findChestOrSpine(root){
    let target = null;
    root.traverse((o)=>{
      const n=(o.name||'').toLowerCase();
      if (n.includes('upperchest') || n.includes('chest') || n.includes('spine')) if (!target) target = o;
    });
    return target;
  }

  async function loadVRM(url){
    hud('Loading model…');
    return new Promise((res,rej)=>{
      gltfLoader.load(url,(gltf)=>{
        try{
          const vrm = gltf.userData.vrm;
          if(currentVRM){ scene.remove(currentVRM.scene); currentVRM=null; }
          VRMUtils.removeUnnecessaryJoints(vrm.scene);
          vrm.scene.traverse(o=>o.frustumCulled=false);
          scene.add(vrm.scene);
          currentVRM = vrm; hud('Model loaded.'); res(vrm);
        }catch(e){ rej(e); }
      }, undefined, (e)=>rej(e));
    });
  }

  async function loadWing(url){
    hud('Loading wings…');
    return new Promise((res,rej)=>{
      const loader = url.toLowerCase().endsWith('.fbx') ? fbxLoader : gltfLoader;
      loader.load(url,(obj)=>{
        let wing = obj.scene || obj;
        if(currentWing && currentWing.parent) currentWing.parent.remove(currentWing);
        currentWing = wing; hud('Wings loaded.'); res(wing);
      }, undefined, (e)=>rej(e));
    });
  }

  function attachWing(){
    if(!currentVRM || !currentWing) return;
    if (currentWing.parent) currentWing.parent.remove(currentWing);
    wingTarget = findChestOrSpine(currentVRM.scene) || currentVRM.scene;
    wingTarget.add(currentWing);
  }

  function applyTransform({offX=0,offY=0.9,offZ=-0.1,scale=1,rx=0,ry=0,rz=0}={}){
    if(!currentWing) return;
    currentWing.position.set(offX,offY,offZ);
    currentWing.scale.setScalar(scale);
    currentWing.rotation.set(rx,ry,rz);
    currentWing.updateMatrixWorld(true);
  }

  return { scene, camera, renderer, loadVRM, loadWing, attachWing, applyTransform, get vrm(){return currentVRM;}, get wing(){return currentWing;} };
}
