// props-addon.js — single drop-in décor injector (no page replacements needed)
import * as THREE from "https://unpkg.com/three@0.152.2/build/three.module.js";

function addThroneRoom(scene) {
  const floor = new THREE.Mesh(new THREE.CircleGeometry(5,64), new THREE.MeshStandardMaterial({ roughness:.9, metalness:.05, color:0x222026 }));
  floor.rotation.x = -Math.PI/2; scene.add(floor);
  const throne = new THREE.Mesh(new THREE.BoxGeometry(0.7,1,0.5), new THREE.MeshStandardMaterial({ color:0x6b5cff }));
  throne.position.set(0,0.5,-1.2); scene.add(throne);
  for (let i=0;i<6;i++) { const col=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,2,16), new THREE.MeshStandardMaterial({color:0xaaaaaa}));
    const ang=i/6*Math.PI*2; col.position.set(Math.cos(ang)*2.5,1,Math.sin(ang)*2.5); scene.add(col); }
}
function addObservatory(scene) {
  const floor = new THREE.Mesh(new THREE.CircleGeometry(5,64), new THREE.MeshStandardMaterial({ color:0x0a0d1a, metalness:.2, roughness:.8 }));
  floor.rotation.x = -Math.PI/2; scene.add(floor);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2,.05,16,100), new THREE.MeshStandardMaterial({color:0x88aaff}));
  ring.rotation.x = Math.PI/2; scene.add(ring);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(.25,32,32), new THREE.MeshStandardMaterial({emissive:0x3355ff})); orb.position.y=1.2; scene.add(orb);
}
function addDojo(scene) {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6,6), new THREE.MeshStandardMaterial({ color:0x2a1e12, roughness:.9 }));
  floor.rotation.x = -Math.PI/2; scene.add(floor);
  for(let i=-3;i<=3;i+=1){ const plank=new THREE.Mesh(new THREE.BoxGeometry(6,.02,.12), new THREE.MeshStandardMaterial({color:0x5a3a1a})); plank.position.set(0,0.01,i*.2); scene.add(plank); }
}
function addLibrary(scene) {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6,6), new THREE.MeshStandardMaterial({ color:0x16120f, roughness:.95 }));
  floor.rotation.x = -Math.PI/2; scene.add(floor);
  for(let x=-2;x<=2;x+=2){ for(let z=-2;z<=2;z+=2){ const shelf=new THREE.Mesh(new THREE.BoxGeometry(0.4,1.6,1), new THREE.MeshStandardMaterial({color:0x3a2a1a}));
    shelf.position.set(x,0.8,z); scene.add(shelf); }}
}
function addVault(scene) {
  const floor = new THREE.Mesh(new THREE.CircleGeometry(5,64), new THREE.MeshStandardMaterial({ color:0x101418, roughness:.8 }));
  floor.rotation.x = -Math.PI/2; scene.add(floor);
  const door = new THREE.Mesh(new THREE.CylinderGeometry(0.9,0.9,0.15,32), new THREE.MeshStandardMaterial({metalness:.8, roughness:.2, color:0x888888}));
  door.rotation.z = Math.PI/2; door.position.set(0,1,-2); scene.add(door);
}
function addPlaza(scene) {
  const floor = new THREE.Mesh(new THREE.CircleGeometry(8,64), new THREE.MeshStandardMaterial({ color:0x14121c, roughness:.9 }));
  floor.rotation.x = -Math.PI/2; scene.add(floor);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.5,.06,16,100), new THREE.MeshStandardMaterial({ color:0x6b5cff }));
  ring.rotation.x = Math.PI/2; scene.add(ring);
}
function whichCharacter() {
  const t=(document.title||"").toLowerCase();
  const fromTitle=t.split(' — ')[0];
  const file=(location.pathname.split('/').pop()||'').toLowerCase().replace('.html','');
  if (fromTitle && fromTitle!=='plaza' && !/hub/.test(fromTitle)) return fromTitle;
  return file;
}
function decorate(scene) {
  const ch=whichCharacter();
  if (ch==='plaza') return addPlaza(scene);
  const map=new Map([
    ['whitestar', addThroneRoom],
    ['reyczar', addThroneRoom],
    ['stella', addObservatory],
    ['jem', addDojo],
    ['alexandria', addLibrary],
    ['themis', addLibrary],
    ['abbey', addVault],
  ]);
  const fn=map.get(ch); if (fn) fn(scene);
}
(function autohook(){
  const seen=new WeakSet();
  const orig=THREE.WebGLRenderer.prototype.render;
  THREE.WebGLRenderer.prototype.render=function(scene,camera){
    if(!seen.has(scene)){ seen.add(scene); try{ decorate(scene); }catch(e){ console.warn('props-addon decorate failed:',e); } }
    return orig.call(this, scene, camera);
  }
})();
