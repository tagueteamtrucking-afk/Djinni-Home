// vrm-utils.js (patched) — robust models.json lookup + friendly HUD
import * as THREE from "https://unpkg.com/three@0.152.2/build/three.module.js";
import { GLTFLoader } from "https://unpkg.com/three@0.152.2/examples/jsm/loaders/GLTFLoader.js";
import * as VRM from "https://unpkg.com/@pixiv/three-vrm@3.2.0/lib/three-vrm.module.js";

const loader = new GLTFLoader();

async function loadGLTF(input) {
  if (typeof input === 'string') return loader.loadAsync(input);
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(input);
    loader.load(url, g => res(g), undefined, err => rej(err));
  });
}

export async function loadVRM(pathOrFile) {
  const gltf = await loadGLTF(pathOrFile);
  const vrm = await VRM.VRM.from(gltf);
  vrm.scene.traverse(o => o.frustumCulled = false);
  const mixer = new THREE.AnimationMixer(vrm.scene);
  return { vrm, scene: vrm.scene, mixer };
}

export async function loadWingsMesh(pathOrFile) {
  const gltf = await loadGLTF(pathOrFile);
  let root = new THREE.Group();
  gltf.scene.traverse(c => c.frustumCulled = false);
  root.add(gltf.scene);
  return root;
}

export function findBone(vrm, hint) {
  const tryNames = {
    "UpperChest": ["UpperChest","upperchest","Upper Chest","upperChest","J_Bip_C_UpperChest","Chest2"],
    "Chest":      ["Chest","chest","J_Bip_C_Chest","Spine2"],
    "Spine":      ["Spine","spine","J_Bip_C_Spine","HipsSpine"]
  };
  const wanted = tryNames[hint] || tryNames["Chest"];
  let target = null;
  vrm.scene.traverse(o => { if (!target && o.isBone && wanted.some(n => o.name === n)) target = o; });
  if (!target) vrm.scene.traverse(o => { if (!target && o.isBone && /chest|spine/i.test(o.name)) target = o; });
  return target || vrm.scene;
}

export function applyWingsToVRM(vrm, wings, boneHint) {
  const anchor = findBone(vrm, boneHint);
  const node = new THREE.Group(); node.name = "WingsAnchor";
  anchor.add(node); node.add(wings);
  node.position.set(0,0.1,-0.05); node.rotation.set(0,0,0); node.scale.set(1,1,1);
  return node;
}

export async function loadVRMWithWings(vrmPath, wingsCfg) {
  const { vrm, scene, mixer } = await loadVRM(vrmPath);
  if (wingsCfg && wingsCfg.enabled && wingsCfg.asset) {
    try {
      const wings = await loadWingsMesh(wingsCfg.asset);
      const node = applyWingsToVRM(vrm, wings, wingsCfg.boneHint || "Chest");
      node.position.fromArray(wingsCfg.position || [0,0.1,-0.05]);
      const d2r = d => d*Math.PI/180; const r = (wingsCfg.rotation || [0,0,0]).map(d2r);
      node.rotation.set(r[0], r[1], r[2]);
      node.scale.fromArray(wingsCfg.scale || [1,1,1]);
    } catch (e) { console.warn("Failed to load wings:", e); }
  }
  return { group: scene, mixer };
}

// Robust models.json finder (works from /, /pages, /pages/rooms)
export async function loadModelsConfig() {
  const local = localStorage.getItem("ct.models.json");
  if (local) return JSON.parse(local);

  const tries = ["../../data/models.json", "../data/models.json", "./data/models.json"];
  for (const url of tries) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) return await res.json();
    } catch (_) {}
  }
  showHUD("Couldn’t find <code>data/models.json</code>. Make sure the file exists and VRM paths are correct.");
  throw new Error("models.json not found (tried " + tries.join(", ") + ")");
}

// Friendly HUD so blank screens don’t hide errors
function showHUD(html) {
  let el = document.getElementById("ct-hud");
  if (!el) {
    el = document.createElement("div");
    el.id = "ct-hud";
    Object.assign(el.style, {
      position:"fixed", top:"64px", left:"50%", transform:"translateX(-50%)",
      background:"rgba(30,22,46,.9)", color:"#e8e5f0", border:"1px solid #2a2540",
      padding:"10px 14px", borderRadius:"12px", zIndex:99999, fontFamily:"ui-sans-serif,system-ui,Segoe UI,Inter,Arial",
      maxWidth:"90%"
    });
    document.body.appendChild(el);
  }
  el.innerHTML = html;
}

export function saveCharacterWings(character) {
  const current = JSON.parse(localStorage.getItem("ct.models.json") || '{"characters":[]}');
  const i = current.characters.findIndex(c => c.id === character.id);
  if (i >= 0) current.characters[i] = character; else current.characters.push(character);
  localStorage.setItem("ct.models.json", JSON.stringify(current));
}

export function addLights(scene) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, .6); hemi.position.set(0,1,0); scene.add(hemi);
  const dir  = new THREE.DirectionalLight(0xffffff, 1.0); dir.position.set(3,5,3); scene.add(dir);
  const fill = new THREE.DirectionalLight(0x88aaff, .4); fill.position.set(-3,2,-2); scene.add(fill);
}

export function fitOrbitToScene(controls, scene) {
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3()).length() || 1;
  const center = box.getCenter(new THREE.Vector3());
  controls.target.copy(center);
  controls.maxDistance = Math.max(3, size*2);
  controls.update();
}
