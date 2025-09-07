export const hud = (msg) => { const el = document.getElementById('hud'); if (el) el.textContent = msg; console.log('[HUD]', msg); };
export const qs = (s, r=document) => r.querySelector(s);
export const qsa = (s, r=document) => [...r.querySelectorAll(s)];
export function setOptions(sel, arr){ sel.innerHTML=""; for(const p of arr){ const o=document.createElement('option'); o.value=p; o.textContent=p; sel.appendChild(o);}}
