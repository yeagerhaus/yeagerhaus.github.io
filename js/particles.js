/* ─────────────────────────────────────────────────────────────────────────────
   particles.js — Three.js WebGL particle background for #hero
   Requires Three.js r128 (global THREE)
───────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  const canvas = document.getElementById('hero-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  /* ── Renderer ─────────────────────────────────────────────────────────── */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  /* ── Scene / Camera ───────────────────────────────────────────────────── */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 6);

  /* ── Mouse tracking (normalised -1 → 1) ──────────────────────────────── */
  const mouse = { x: 0, y: 0, active: false };

  window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);
    mouse.active = true;
  });

  /* ── Particles ────────────────────────────────────────────────────────── */
  const COUNT = 800;
  const positions  = new Float32Array(COUNT * 3);
  const basePos    = new Float32Array(COUNT * 3); // original positions for drift calc
  const velocities = new Float32Array(COUNT * 3);
  const colors     = new Float32Array(COUNT * 3);
  const sizes      = new Float32Array(COUNT);

  /* Purple: #9300ff → (0.576, 0, 1.0)
     White:  #f0f0f0 → (0.94, 0.94, 0.94) */
  const purple = [0.576, 0.0, 1.0];
  const white  = [0.94,  0.94, 0.94];

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;

    const x = (Math.random() - 0.5) * 16;
    const y = (Math.random() - 0.5) * 10;
    const z = (Math.random() - 0.5) * 4;

    positions[i3]     = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;
    basePos[i3]       = x;
    basePos[i3 + 1]   = y;
    basePos[i3 + 2]   = z;

    velocities[i3]     = (Math.random() - 0.5) * 0.002;
    velocities[i3 + 1] = (Math.random() - 0.5) * 0.002;
    velocities[i3 + 2] = 0;

    // 65% purple, 35% white
    const col = Math.random() < 0.65 ? purple : white;
    colors[i3]     = col[0];
    colors[i3 + 1] = col[1];
    colors[i3 + 2] = col[2];

    sizes[i] = Math.random() * 2.5 + 0.8;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor',   new THREE.BufferAttribute(colors,    3));
  geometry.setAttribute('aSize',    new THREE.BufferAttribute(sizes,     1));

  /* ── Shaders ──────────────────────────────────────────────────────────── */
  const vertexShader = /* glsl */ `
    attribute float aSize;
    attribute vec3  aColor;
    varying   vec3  vColor;

    void main() {
      vColor = aColor;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * 2.5;
      gl_Position  = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = /* glsl */ `
    varying vec3 vColor;

    void main() {
      vec2  uv   = gl_PointCoord - 0.5;
      float dist = length(uv);

      // Soft circular core + outer glow
      float core = 1.0 - smoothstep(0.1, 0.35, dist);
      float glow = (1.0 - smoothstep(0.0, 0.5, dist)) * 0.4;
      float alpha = clamp(core + glow, 0.0, 1.0);

      if (alpha < 0.01) discard;
      gl_FragColor = vec4(vColor, alpha * 0.85);
    }
  `;

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  /* ── Mouse-to-world projection (z = 0 plane) ──────────────────────────── */
  const repelPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const raycaster   = new THREE.Raycaster();
  const mouseWorld  = new THREE.Vector3();
  const mouseVec2   = new THREE.Vector2();

  /* ── Animation loop ───────────────────────────────────────────────────── */
  let time = 0;

  function animate() {
    requestAnimationFrame(animate);
    time += 0.008;

    const pos = geometry.attributes.position.array;

    // Project mouse to world space
    if (mouse.active) {
      mouseVec2.set(mouse.x, mouse.y);
      raycaster.setFromCamera(mouseVec2, camera);
      raycaster.ray.intersectPlane(repelPlane, mouseWorld);
    }

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;

      // Sinusoidal drift around base position
      pos[i3]     += velocities[i3]     + Math.sin(time + i * 0.17) * 0.0006;
      pos[i3 + 1] += velocities[i3 + 1] + Math.cos(time + i * 0.13) * 0.0006;

      // Boundary wrap
      if (pos[i3]     >  8) pos[i3]     = -8;
      if (pos[i3]     < -8) pos[i3]     =  8;
      if (pos[i3 + 1] >  5) pos[i3 + 1] = -5;
      if (pos[i3 + 1] < -5) pos[i3 + 1] =  5;

      // Mouse repel
      if (mouse.active) {
        const dx   = pos[i3]     - mouseWorld.x;
        const dy   = pos[i3 + 1] - mouseWorld.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const REPEL_RADIUS = 1.8;

        if (dist < REPEL_RADIUS && dist > 0.001) {
          const force = ((REPEL_RADIUS - dist) / REPEL_RADIUS) * 0.05;
          pos[i3]     += (dx / dist) * force;
          pos[i3 + 1] += (dy / dist) * force;
        }
      }
    }

    geometry.attributes.position.needsUpdate = true;

    // Subtle camera parallax with mouse
    camera.position.x += (mouse.x * 0.4 - camera.position.x) * 0.025;
    camera.position.y += (mouse.y * 0.25 - camera.position.y) * 0.025;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
  }

  animate();

  /* ── Resize ───────────────────────────────────────────────────────────── */
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();
