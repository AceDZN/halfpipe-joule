// The Tel Aviv promenade at golden hour: sky, sea, beach, tiles, palms,
// lifeguard towers, skyline, lights. Purely visual.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { beachTexture, frondTexture, tileTexture } from './textures';

export const SUN_DIR = new THREE.Vector3(-0.25, 0.32, -1).normalize();

const loader = new GLTFLoader();
const glbCache = new Map<string, Promise<THREE.Group | null>>();

export function loadModel(name: string): Promise<THREE.Group | null> {
  let p = glbCache.get(name);
  if (!p) {
    p = loader
      .loadAsync(`${import.meta.env.BASE_URL}models/${name}.glb`)
      .then((g) => {
        g.scene.userData.animations = g.animations;
        return g.scene;
      })
      .catch(() => null);
    glbCache.set(name, p);
  }
  return p;
}

function skyDome() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { sunDir: { value: SUN_DIR } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec3 vDir; uniform vec3 sunDir;
      void main(){
        float h = clamp(vDir.y, -0.2, 1.0);
        vec3 top = vec3(0.47, 0.42, 0.72);
        vec3 mid = vec3(0.98, 0.62, 0.62);
        vec3 hor = vec3(1.0, 0.78, 0.52);
        vec3 col = mix(hor, mid, smoothstep(0.0, 0.18, h));
        col = mix(col, top, smoothstep(0.18, 0.75, h));
        float s = max(dot(normalize(vDir), sunDir), 0.0);
        col += vec3(1.0, 0.75, 0.45) * pow(s, 18.0) * 0.6;
        col += vec3(1.0, 0.95, 0.8) * smoothstep(0.9985, 0.9993, s);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), mat);
  m.renderOrder = -10;
  return m;
}

function seaMesh() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, sunDir: { value: SUN_DIR } },
    vertexShader: `varying vec3 vPos; void main(){ vPos = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vPos,1.0); }`,
    fragmentShader: `
      varying vec3 vPos; uniform float time; uniform vec3 sunDir;
      void main(){
        float w = sin(vPos.x*0.35 + time*1.3)*0.5 + sin(vPos.z*0.6 - time*0.9)*0.5 + sin((vPos.x+vPos.z)*1.7 + time*2.0)*0.25;
        vec3 deep = vec3(0.26, 0.33, 0.55);
        vec3 near = vec3(0.35, 0.62, 0.70);
        float d = clamp((-vPos.z - 45.0) / 120.0, 0.0, 1.0);
        vec3 col = mix(near, deep, d);
        // Sun glitter path toward the sun.
        vec3 toSun = normalize(vec3(sunDir.x, 0.0, sunDir.z));
        vec3 rel = normalize(vec3(vPos.x - cameraPosition.x, 0.0, vPos.z - cameraPosition.z));
        float path = pow(max(dot(rel, toSun), 0.0), 60.0);
        col += vec3(1.0, 0.68, 0.35) * path * (0.6 + 0.4*w) * 1.3;
        col += vec3(1.0, 0.8, 0.6) * smoothstep(0.85, 1.0, w) * 0.12;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1600, 700, 1, 1), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(0, -0.6, -48 - 350);
  return m;
}

function palmProcedural(seed: number) {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.9 });
  const h = 6 + (seed % 3);
  const lean = ((seed % 5) - 2) * 0.05;
  let prev = new THREE.Vector3();
  for (let i = 0; i < 8; i++) {
    const t = (i + 1) / 8;
    const p = new THREE.Vector3(Math.sin(t * 1.4) * lean * h, t * h, 0);
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.17 - t * 0.05, 0.2 - t * 0.05, prev.distanceTo(p), 7), trunkMat);
    seg.position.copy(prev).add(p).multiplyScalar(0.5);
    seg.lookAt(p);
    seg.rotateX(Math.PI / 2);
    seg.castShadow = true;
    g.add(seg);
    prev = p;
  }
  const leafMat = new THREE.MeshStandardMaterial({ map: frondTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
  for (let i = 0; i < 9; i++) {
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 3.2), leafMat);
    leaf.geometry.translate(0, -1.6, 0);
    const holder = new THREE.Group();
    holder.position.copy(prev);
    holder.rotation.y = (i / 9) * Math.PI * 2 + seed;
    leaf.rotation.x = -1.0 - (i % 3) * 0.25;
    holder.add(leaf);
    leaf.castShadow = true;
    g.add(holder);
  }
  return g;
}

export interface World {
  scene: THREE.Scene;
  sun: THREE.DirectionalLight;
  sea: THREE.Mesh;
  update(dt: number, focus: THREE.Vector3): void;
}

export function buildWorld(scene: THREE.Scene, palmSpots: THREE.Vector3[], towerSpots: THREE.Vector3[]): World {
  scene.background = new THREE.Color(0xf5b98e);
  scene.fog = new THREE.Fog(0xf3b58e, 70, 420);
  scene.add(skyDome());
  const sea = seaMesh();
  scene.add(sea);

  const hemi = new THREE.HemisphereLight(0xffd8c0, 0x8a6a5a, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc89a, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -30;
  sc.right = 30;
  sc.top = 30;
  sc.bottom = -30;
  sc.near = 1;
  sc.far = 200;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0xa9b8ff, 0.35);
  fill.position.set(30, 20, 60);
  scene.add(fill);

  // Promenade tiles.
  const tiles = tileTexture();
  tiles.repeat.set(120, 60);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(480, 240), new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.9 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 100);
  ground.receiveShadow = true;
  scene.add(ground);
  // Beach.
  const bt = beachTexture();
  bt.repeat.set(160, 12);
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(1600, 40), new THREE.MeshStandardMaterial({ map: bt, roughness: 1 }));
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(0, -0.35, -40);
  beach.receiveShadow = true;
  scene.add(beach);
  // Promenade edge wall + railing.
  const edge = new THREE.Mesh(new THREE.BoxGeometry(480, 0.6, 0.6), new THREE.MeshStandardMaterial({ color: 0xd9cbb6, roughness: 0.9 }));
  edge.position.set(0, -0.05, -20.3);
  edge.receiveShadow = true;
  scene.add(edge);
  const railMat = new THREE.MeshStandardMaterial({ color: 0xe8eef2, metalness: 0.7, roughness: 0.35 });
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 480, 6), railMat);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(0, 1.0, -20.3);
  scene.add(rail);
  const postGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.0, 6);
  const posts = new THREE.InstancedMesh(postGeo, railMat, 160);
  const mtx = new THREE.Matrix4();
  for (let i = 0; i < 160; i++) {
    mtx.makeTranslation(-240 + i * 3, 0.5, -20.3);
    posts.setMatrixAt(i, mtx);
  }
  scene.add(posts);

  // Distant skyline along the coast (north = -x).
  const bmat = new THREE.MeshStandardMaterial({ color: 0xc9a5a8, roughness: 0.8, emissive: 0x3a2030, emissiveIntensity: 0.2 });
  const r = (i: number) => (Math.sin(i * 91.7) * 0.5 + 0.5);
  for (let i = 0; i < 46; i++) {
    const h = 15 + r(i) * 60;
    const w = 8 + r(i + 3) * 10;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), bmat);
    b.position.set(-170 - r(i + 7) * 120, h / 2 - 1, -30 + i * 7 + r(i + 11) * 5);
    scene.add(b);
  }
  for (let i = 0; i < 20; i++) {
    const h = 10 + r(i + 50) * 30;
    const b = new THREE.Mesh(new THREE.BoxGeometry(12, h, 12), bmat);
    b.position.set(-120 + i * 22, h / 2 - 1, 200 + r(i + 60) * 40);
    scene.add(b);
  }

  // Palms: Tripo model when available, procedural fallback.
  const palmGroup = new THREE.Group();
  scene.add(palmGroup);
  loadModel('palm').then((m) => {
    palmSpots.forEach((p, i) => {
      let palm: THREE.Object3D;
      if (m) {
        palm = m.clone();
        const s = 7 + (i % 3) * 1.2;
        palm.scale.setScalar(s);
        palm.rotation.y = i * 1.3;
        palm.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) o.castShadow = true;
        });
      } else palm = palmProcedural(i);
      palm.position.copy(p);
      palmGroup.add(palm);
    });
  });
  loadModel('lifeguard-tower').then((m) => {
    towerSpots.forEach((p, i) => {
      let t: THREE.Object3D;
      if (m) {
        t = m.clone();
        t.scale.setScalar(6);
        t.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) o.castShadow = true;
        });
      } else {
        t = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 2), new THREE.MeshStandardMaterial({ color: 0xc89b64 }));
        t.position.y = 2;
      }
      t.position.add(p);
      t.rotation.y = Math.PI + i * 0.2;
      scene.add(t);
    });
  });

  // Lamp posts and benches along the promenade.
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x3d4652, metalness: 0.5, roughness: 0.5 });
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffd9a0, emissiveIntensity: 1.5 });
  for (let i = 0; i < 16; i++) {
    const x = -110 + i * 15;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 5, 8), lampMat);
    pole.position.set(x, 2.5, -17.5);
    pole.castShadow = true;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), bulbMat);
    bulb.position.set(x, 5.1, -17.5);
    scene.add(pole, bulb);
    if (i % 2 === 0) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2, 0.12, 0.6), new THREE.MeshStandardMaterial({ color: 0x8b5a33, roughness: 0.8 }));
      bench.position.set(x + 6, 0.5, -17.2);
      bench.castShadow = true;
      const legs = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 0.08), lampMat);
      legs.position.set(x + 6, 0.22, -17.2);
      scene.add(bench, legs);
    }
  }
  // Colourful promenade banners.
  const bannerCols = [0x21d4c8, 0xff4fa3, 0xffd23f, 0x3fb6ff];
  for (let i = 0; i < 10; i++) {
    const x = -95 + i * 24;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 6, 6), lampMat);
    pole.position.set(x, 3, -19);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.2), new THREE.MeshStandardMaterial({ color: bannerCols[i % 4], side: THREE.DoubleSide, roughness: 0.7 }));
    flag.position.set(x + 0.48, 4.6, -19);
    scene.add(pole, flag);
  }

  const seaMat = sea.material as THREE.ShaderMaterial;
  let t = 0;
  return {
    scene,
    sun,
    sea,
    update(dt, focus) {
      t += dt;
      seaMat.uniforms.time.value = t;
      sun.position.copy(focus).addScaledVector(SUN_DIR, 80);
      sun.target.position.copy(focus);
    },
  };
}
