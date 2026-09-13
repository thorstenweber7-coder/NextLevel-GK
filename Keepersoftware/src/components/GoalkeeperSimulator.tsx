import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Target, ArrowLeft, Shield, Eye, Settings, Users, Move, Layers, RefreshCw } from 'lucide-react';

interface GoalkeeperSimulatorProps {
  onBack: () => void;
}

export default function GoalkeeperSimulator({ onBack }: GoalkeeperSimulatorProps) {
  const [view, setView] = useState<'intro' | 'setup2d' | 'sim3d'>('intro');

  // Ball position on the 2D field (in meters relative to goal center at (0,0))
  // Goal center is (0, 0). Pitch extends in positive Z (lengthwise up to 50m) and X (width-wise -34m to +34m)
  const [ballPos, setBallPos] = useState<{ x: number; z: number }>({ x: 0, z: 24 });

  // 3D Simulator Settings
  const [wallCount, setWallCount] = useState<number>(4);
  const [wallShift, setWallShift] = useState<number>(0); // Left/Right shift in meters
  const [wallShift2, setWallShift2] = useState<number>(0); // Left/Right shift for second wall in meters
  const [splitWall, setSplitWall] = useState<boolean>(false); // Whether wall is split in two
  const [showHitArea, setShowHitArea] = useState<boolean>(false);

  // Goalkeeper Position (in meters)
  const [gkPos, setGkPos] = useState<{ x: number; z: number }>({ x: 0, z: 0.5 });

  // 2D Setup Canvas rendering
  const canvas2dRef = useRef<HTMLCanvasElement | null>(null);

  // Redraw 2D field when ballPos changes
  useEffect(() => {
    if (view !== 'setup2d' || !canvas2dRef.current) return;
    const canvas = canvas2dRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Draw realistic soccer grass field with cut lines (horizontal stripes)
    const baseGreen = '#14532d'; // Rich forest green grass
    const stripeGreen = '#166534'; // Lighter green for cut stripes
    
    ctx.fillStyle = baseGreen;
    ctx.fillRect(0, 0, width, height);

    // Draw horizontal lawn-mower stripes
    const numStripes = 10;
    const stripeHeight = height / numStripes;
    for (let i = 0; i < numStripes; i++) {
      if (i % 2 === 0) {
        ctx.fillStyle = stripeGreen;
        ctx.fillRect(0, i * stripeHeight, width, stripeHeight);
      }
    }

    // Coordinates mapping
    // Field is 68m wide (-34 to 34) and we render 40m of depth (0 to 40)
    // Scale factor: width scale and height scale
    const meterToPxX = (mX: number) => {
      // Center is width / 2
      const centerX = width / 2;
      return centerX + (mX / 34) * (width / 2) * 0.9;
    };

    const meterToPxZ = (mZ: number) => {
      // Goal line is near top (say y = 40px)
      const topMargin = 40;
      return topMargin + (mZ / 40) * (height - topMargin) * 0.9;
    };

    const pxToMeterX = (pxX: number) => {
      const centerX = width / 2;
      const relativeX = pxX - centerX;
      return (relativeX / ((width / 2) * 0.9)) * 34;
    };

    const pxToMeterZ = (pxZ: number) => {
      const topMargin = 40;
      return ((pxZ - topMargin) / ((height - topMargin) * 0.9)) * 40;
    };

    // 2. DRAW HIGH-CONTRAST CRUNCHY WHITE LINE MARKINGS
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 2.5;

    // Field Outer Boundary (Touchlines & Goal Line)
    ctx.beginPath();
    // Top goal line
    ctx.moveTo(meterToPxX(-34), meterToPxZ(0));
    ctx.lineTo(meterToPxX(34), meterToPxZ(0));
    // Left touchline
    ctx.lineTo(meterToPxX(34), meterToPxZ(40));
    // Bottom boundary line (at 40m depth)
    ctx.lineTo(meterToPxX(-34), meterToPxZ(40));
    // Right touchline
    ctx.closePath();
    ctx.stroke();

    // Goal posts (thick white goal line accent between the actual posts)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(meterToPxX(-3.66), meterToPxZ(0));
    ctx.lineTo(meterToPxX(3.66), meterToPxZ(0));
    ctx.stroke();

    // Reset standard line width for field markings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2;

    // Fünfmeterraum (5.5-meter-box / Torraum): 18.32m wide (-9.16 to 9.16), 5.5m deep
    ctx.strokeRect(
      meterToPxX(-9.16),
      meterToPxZ(0),
      meterToPxX(9.16) - meterToPxX(-9.16),
      meterToPxZ(5.5) - meterToPxZ(0)
    );

    // Strafraum (16.5-meter-box): 40.32m wide (-20.16 to 20.16), 16.5m deep
    ctx.strokeRect(
      meterToPxX(-20.16),
      meterToPxZ(0),
      meterToPxX(20.16) - meterToPxX(-20.16),
      meterToPxZ(16.5) - meterToPxZ(0)
    );

    // Penalty spot (Elfmeterpunkt): 11m from goal line
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(meterToPxX(0), meterToPxZ(11), 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Corner arcs (Eckfahnen-Viertelkreis, 1m radius at top-left and top-right)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.5;
    const cornerArcRad = (1.0 / 40) * (height - 40) * 0.9;
    
    // Top-Left Corner
    ctx.beginPath();
    ctx.arc(meterToPxX(-34), meterToPxZ(0), cornerArcRad, 0, Math.PI / 2);
    ctx.stroke();

    // Top-Right Corner
    ctx.beginPath();
    ctx.arc(meterToPxX(34), meterToPxZ(0), cornerArcRad, Math.PI / 2, Math.PI);
    ctx.stroke();

    // Penalty arc (Teilkreis): radius 9.15m from penalty spot, strictly outside the 16.5m box
    // Using accurate circle-line intersection angles to start and end perfectly on the 16.5m line!
    const arcRadiusPx = (9.15 / 40) * (height - 40) * 0.9;
    const startAngle = Math.PI / 2 - Math.acos(5.5 / 9.15); // angle from 6 o'clock (downwards)
    const endAngle = Math.PI / 2 + Math.acos(5.5 / 9.15);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(meterToPxX(0), meterToPxZ(11), arcRadiusPx, startAngle, endAngle);
    ctx.stroke();

    // 3. DRAW TACTICAL PLACEMENT BOUNDARIES (Dashed Golden Guidance overlays)
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.38)';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1.5;
    
    // Minimum distance (16.5m from goal line)
    ctx.beginPath();
    ctx.arc(meterToPxX(0), meterToPxZ(0), (16.5 / 40) * (height - 40) * 0.9, 0, Math.PI);
    ctx.stroke();

    // Maximum distance (35m from goal line)
    ctx.beginPath();
    ctx.arc(meterToPxX(0), meterToPxZ(0), (35 / 40) * (height - 40) * 0.9, 0, Math.PI);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // 4. DRAW GOALKEEPER ICON (Aesthetic Badge)
    ctx.fillStyle = '#1e3a8a'; // Deep Indigo
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(meterToPxX(0), meterToPxZ(0.5), 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TW', meterToPxX(0), meterToPxZ(0.5));

    // 5. DRAW BALL WITH PULSING RING AND REALISTIC VECTOR SOCCER PATTERN
    const time = Date.now() * 0.003;
    const pulseRad = 10 + Math.sin(time) * 3;
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(meterToPxX(ballPos.x), meterToPxZ(ballPos.z), pulseRad, 0, Math.PI * 2);
    ctx.stroke();

    const ballX = meterToPxX(ballPos.x);
    const ballZ = meterToPxZ(ballPos.z);
    const r = 7.5; // Slightly larger for great readability

    // Base white sphere with a subtle shadow
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(ballX, ballZ, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw realistic soccer ball pentagons & seams
    ctx.fillStyle = '#111111';
    
    // Center pentagon
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const px = ballX + Math.cos(angle) * (r * 0.35);
      const pz = ballZ + Math.sin(angle) * (r * 0.35);
      if (i === 0) ctx.moveTo(px, pz);
      else ctx.lineTo(px, pz);
    }
    ctx.closePath();
    ctx.fill();

    // Radial seam lines from pentagon corners to the outer edge
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(ballX + Math.cos(angle) * (r * 0.35), ballZ + Math.sin(angle) * (r * 0.35));
      ctx.lineTo(ballX + Math.cos(angle) * r, ballZ + Math.sin(angle) * r);
      ctx.stroke();
    }

    // 6. DRAW GRAPHICAL CONNECTING PATHWAY
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(ballX, ballZ);
    ctx.lineTo(meterToPxX(0), meterToPxZ(0));
    ctx.stroke();
    ctx.setLineDash([]);

    // Distance HUD text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Entfernung zum Tor: ${Math.sqrt(ballPos.x * ballPos.x + ballPos.z * ballPos.z).toFixed(1)}m`, 15, height - 15);
  }, [view, ballPos]);

  // Click on 2D Setup Field
  const handleFieldClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvas2dRef.current) return;
    const rect = canvas2dRef.current.getBoundingClientRect();
    const width = canvas2dRef.current.width;
    const height = canvas2dRef.current.height;

    // Scale CSS click coordinates to canvas logical coordinates
    const scaleX = rect.width > 0 ? (width / rect.width) : 1;
    const scaleY = rect.height > 0 ? (height / rect.height) : 1;
    const pxX = (e.clientX - rect.left) * scaleX;
    const pxZ = (e.clientY - rect.top) * scaleY;

    // Inverse mapping
    const pxToMeterX = (pX: number) => {
      const centerX = width / 2;
      return ((pX - centerX) / ((width / 2) * 0.9)) * 34;
    };

    const pxToMeterZ = (pZ: number) => {
      const topMargin = 40;
      return ((pZ - topMargin) / ((height - topMargin) * 0.9)) * 40;
    };

    let targetX = pxToMeterX(pxX);
    let targetZ = pxToMeterZ(pxZ);

    // Limit boundaries to realistic free kick spots
    // Distance from goal must be between 16.5m and 35m
    const dist = Math.sqrt(targetX * targetX + targetZ * targetZ);
    if (dist < 15) {
      // Scale out
      const factor = 15 / dist;
      targetX *= factor;
      targetZ *= factor;
    } else if (dist > 38) {
      const factor = 38 / dist;
      targetX *= factor;
      targetZ *= factor;
    }

    // Clamp X to pitch boundaries
    targetX = Math.max(-28, Math.min(28, targetX));
    targetZ = Math.max(16.5, Math.min(35, targetZ));

    setBallPos({ x: targetX, z: targetZ });
  };

  // ---------------- THREE.JS 3D SIMULATOR ----------------
  const mountRef = useRef<HTMLDivElement | null>(null);
  const simStateRef = useRef({
    ballPos,
    wallCount,
    wallShift,
    wallShift2,
    splitWall,
    showHitArea,
    gkPos,
    keys: { w: false, a: false, s: false, d: false, ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false }
  });

  // Update refs when states change so that three.js animation loop can access them without recreation
  useEffect(() => {
    simStateRef.current.ballPos = ballPos;
    simStateRef.current.wallCount = wallCount;
    simStateRef.current.wallShift = wallShift;
    simStateRef.current.wallShift2 = wallShift2;
    simStateRef.current.splitWall = splitWall;
    simStateRef.current.showHitArea = showHitArea;
    simStateRef.current.gkPos = gkPos;
  }, [ballPos, wallCount, wallShift, wallShift2, splitWall, showHitArea, gkPos]);

  // Handle keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key) || ['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(e.key)) {
        const k = key === 'arrowleft' || key === 'arrowright' || key === 'arrowup' || key === 'arrowdown' ? e.key : key;
        simStateRef.current.keys[k as keyof typeof simStateRef.current.keys] = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key) || ['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(e.key)) {
        const k = key === 'arrowleft' || key === 'arrowright' || key === 'arrowup' || key === 'arrowdown' ? e.key : key;
        simStateRef.current.keys[k as keyof typeof simStateRef.current.keys] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (view !== 'sim3d' || !mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 550;

    // 1. SCENE & CAMERA
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#05070c');
    scene.fog = new THREE.FogExp2('#05070c', 0.015);

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 150);
    // Position Goalkeeper camera at eye-level
    camera.position.set(simStateRef.current.gkPos.x, 1.65, -simStateRef.current.gkPos.z);

    // 2. RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 3. LIGHTS
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.4);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight('#ffffff', 0.95);
    mainLight.position.set(15, 30, 25);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 80;
    const d = 30;
    mainLight.shadow.camera.left = -d;
    mainLight.shadow.camera.right = d;
    mainLight.shadow.camera.top = d;
    mainLight.shadow.camera.bottom = -d;
    scene.add(mainLight);

    // Subtle blue stadium glow light from behind the goal
    const stadiumGlow = new THREE.DirectionalLight('#312e81', 0.5);
    stadiumGlow.position.set(0, 5, -30);
    scene.add(stadiumGlow);

    // 4. THE PITCH (FIELD)
    const fWidth = 80;
    const fLength = 100;
    const fieldGeo = new THREE.PlaneGeometry(fWidth, fLength);
    const fieldMat = new THREE.MeshStandardMaterial({
      color: '#143d1a', // Rich green turf
      roughness: 0.9,
      metalness: 0.1,
    });
    const fieldMesh = new THREE.Mesh(fieldGeo, fieldMat);
    fieldMesh.rotation.x = -Math.PI / 2;
    fieldMesh.position.y = 0;
    fieldMesh.receiveShadow = true;
    scene.add(fieldMesh);

    // Dark-green stripes to simulate mowed grass lines
    const stripeCount = 15;
    for (let i = 0; i < stripeCount; i++) {
      const stripeHeight = fLength / stripeCount;
      const stripeGeo = new THREE.PlaneGeometry(fWidth, stripeHeight);
      const stripeMat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? '#113416' : '#143d1a',
        roughness: 0.9,
        metalness: 0.1,
      });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(0, 0.001, -fLength/2 + i * stripeHeight + stripeHeight/2);
      stripe.receiveShadow = true;
      scene.add(stripe);
    }

    // 5. PITCH LINE MARKINGS
    const lineMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });

    const createLine = (w: number, l: number, posX: number, posZ: number) => {
      const geo = new THREE.PlaneGeometry(w, l);
      const mesh = new THREE.Mesh(geo, lineMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(posX, 0.002, -posZ); // Negative Z is forward field depth
      scene.add(mesh);
    };

    const lw = 0.08; // line width

    // Goal Line (Z = 0)
    createLine(68, lw, 0, 0);

    // Left and Right Touchlines
    createLine(lw, 80, -34, 40);
    createLine(lw, 80, 34, 40);

    // 5-meter-box (Torraum): 18.32m wide (-9.16 to 9.16), 5.5m deep
    createLine(18.32, lw, 0, 5.5); // front line
    createLine(lw, 5.5, -9.16, 2.75); // left line
    createLine(lw, 5.5, 9.16, 2.75); // right line

    // 16-meter-box (Strafraum): 40.32m wide (-20.16 to 20.16), 16.5m deep
    createLine(40.32, lw, 0, 16.5); // front line
    createLine(lw, 16.5, -20.16, 8.25); // left line
    createLine(lw, 16.5, 20.16, 8.25); // right line

    // Penalty spot: 11m from goal line
    const penSpotGeo = new THREE.CircleGeometry(0.12, 16);
    const penSpot = new THREE.Mesh(penSpotGeo, lineMat);
    penSpot.rotation.x = -Math.PI / 2;
    penSpot.position.set(0, 0.003, -11);
    scene.add(penSpot);

    // Penalty arc (approximate with a segmented arc)
    const arcRadius = 9.15;
    const arcPoints: THREE.Vector3[] = [];
    const penaltySpotPos = new THREE.Vector3(0, 0.003, -11);
    for (let i = -45; i <= 45; i += 5) {
      const angle = (i * Math.PI) / 180;
      // Z-axis goes deeper into the pitch (negative z)
      // We want the arc facing forward (larger distance from goal line, so further on negative Z)
      const x = penaltySpotPos.x + Math.sin(angle) * arcRadius;
      const z = penaltySpotPos.z - Math.cos(angle) * arcRadius; // moving forward along negative Z
      arcPoints.push(new THREE.Vector3(x, 0.003, z));
    }
    const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints);
    const arcLine = new THREE.Line(arcGeo, lineMat);
    scene.add(arcLine);

    // 6. REALISTIC GOAL (Width: 7.32m, Height: 2.44m)
    const goalGroup = new THREE.Group();
    goalGroup.position.set(0, 0, 0);
    scene.add(goalGroup);

    const postRadius = 0.06;
    const postMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.2,
      metalness: 0.8,
    });

    // Left post
    const leftPostGeo = new THREE.CylinderGeometry(postRadius, postRadius, 2.44, 16);
    const leftPost = new THREE.Mesh(leftPostGeo, postMat);
    leftPost.position.set(-3.66, 1.22, 0);
    leftPost.castShadow = true;
    leftPost.receiveShadow = true;
    goalGroup.add(leftPost);

    // Right post
    const rightPost = leftPost.clone();
    rightPost.position.set(3.66, 1.22, 0);
    goalGroup.add(rightPost);

    // Crossbar
    const crossbarGeo = new THREE.CylinderGeometry(postRadius, postRadius, 7.32, 16);
    const crossbar = new THREE.Mesh(crossbarGeo, postMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, 2.44, 0);
    crossbar.castShadow = true;
    crossbar.receiveShadow = true;
    goalGroup.add(crossbar);

    // Back Support frame
    const supportMat = new THREE.MeshStandardMaterial({
      color: '#cccccc',
      roughness: 0.3,
      metalness: 0.6,
    });
    // Let's build support poles running to the ground at Z = 1.5m
    const leftSupportGeo = new THREE.CylinderGeometry(0.03, 0.03, 2.8, 12);
    const leftSupport = new THREE.Mesh(leftSupportGeo, supportMat);
    leftSupport.position.set(-3.66, 1.22, 0.75);
    leftSupport.rotation.x = -Math.PI / 6;
    goalGroup.add(leftSupport);

    const rightSupport = leftSupport.clone();
    rightSupport.position.set(3.66, 1.22, 0.75);
    goalGroup.add(rightSupport);

    // Ground support tubes
    const groundSupportGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.5, 12);
    const leftGroundSupport = new THREE.Mesh(groundSupportGeo, supportMat);
    leftGroundSupport.position.set(-3.66, 0.015, 0.75);
    leftGroundSupport.rotation.x = Math.PI / 2;
    goalGroup.add(leftGroundSupport);

    const rightGroundSupport = leftGroundSupport.clone();
    rightGroundSupport.position.set(3.66, 0.015, 0.75);
    goalGroup.add(rightGroundSupport);

    const backGroundSupportGeo = new THREE.CylinderGeometry(0.03, 0.03, 7.32, 12);
    const backGroundSupport = new THREE.Mesh(backGroundSupportGeo, supportMat);
    backGroundSupport.position.set(0, 0.015, 1.5);
    backGroundSupport.rotation.z = Math.PI / 2;
    goalGroup.add(backGroundSupport);

    // Generate a beautiful, realistic net grid texture with Canvas
    const createNetTexture = () => {
      const size = 128;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = 'rgba(0,0,0,0)'; // fully transparent background
        ctx.fillRect(0, 0, size, size);

        // Draw white mesh ropes
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.strokeRect(0, 0, size, size);

        // Subgrid lines (8x8 grid cells per tile)
        const step = size / 8;
        ctx.beginPath();
        for (let i = 1; i < 8; i++) {
          const pos = i * step;
          ctx.moveTo(0, pos);
          ctx.lineTo(size, pos);
          ctx.moveTo(pos, 0);
          ctx.lineTo(pos, size);
        }
        ctx.stroke();

        // 3D structural outline/shadow for depth feeling (leichte Oberflächenstruktur)
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 1; i < 8; i++) {
          const pos = i * step;
          ctx.moveTo(0, pos + 1);
          ctx.lineTo(size, pos + 1);
          ctx.moveTo(pos + 1, 0);
          ctx.lineTo(pos + 1, size);
        }
        ctx.stroke();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      return texture;
    };

    const netTexture = createNetTexture();

    // Create separate planes for the net to ensure proper scale, tiling, and complete transparency on the front
    const netGroup = new THREE.Group();

    // Back net face: width = 7.32, height = 2.44, located at Z = 1.5
    const backNetGeo = new THREE.PlaneGeometry(7.32, 2.44);
    const backNetMat = new THREE.MeshBasicMaterial({
      map: netTexture.clone(),
      transparent: true,
      opacity: 0.18,
      alphaTest: 0.05,
      side: THREE.DoubleSide,
    });
    backNetMat.map!.repeat.set(9, 3);
    const backNet = new THREE.Mesh(backNetGeo, backNetMat);
    backNet.position.set(0, 1.22, 1.5);
    netGroup.add(backNet);

    // Top net face: width = 7.32, depth = 1.5, located at Y = 2.44, Z = 0.75
    const topNetGeo = new THREE.PlaneGeometry(7.32, 1.5);
    const topNetMat = new THREE.MeshBasicMaterial({
      map: netTexture.clone(),
      transparent: true,
      opacity: 0.18,
      alphaTest: 0.05,
      side: THREE.DoubleSide,
    });
    topNetMat.map!.repeat.set(9, 2);
    const topNet = new THREE.Mesh(topNetGeo, topNetMat);
    topNet.position.set(0, 2.44, 0.75);
    topNet.rotation.x = Math.PI / 2;
    netGroup.add(topNet);

    // Left net face: depth = 1.5, height = 2.44, located at X = -3.66, Z = 0.75
    const leftNetGeo = new THREE.PlaneGeometry(1.5, 2.44);
    const leftNetMat = new THREE.MeshBasicMaterial({
      map: netTexture.clone(),
      transparent: true,
      opacity: 0.18,
      alphaTest: 0.05,
      side: THREE.DoubleSide,
    });
    leftNetMat.map!.repeat.set(2, 3);
    const leftNet = new THREE.Mesh(leftNetGeo, leftNetMat);
    leftNet.position.set(-3.66, 1.22, 0.75);
    leftNet.rotation.y = Math.PI / 2;
    netGroup.add(leftNet);

    // Right net face: depth = 1.5, height = 2.44, located at X = 3.66, Z = 0.75
    const rightNetGeo = new THREE.PlaneGeometry(1.5, 2.44);
    const rightNetMat = new THREE.MeshBasicMaterial({
      map: netTexture.clone(),
      transparent: true,
      opacity: 0.18,
      alphaTest: 0.05,
      side: THREE.DoubleSide,
    });
    rightNetMat.map!.repeat.set(2, 3);
    const rightNet = new THREE.Mesh(rightNetGeo, rightNetMat);
    rightNet.position.set(3.66, 1.22, 0.75);
    rightNet.rotation.y = -Math.PI / 2;
    netGroup.add(rightNet);

    goalGroup.add(netGroup);

    // 7. THE BALL (positioned exactly at the 2D spot)
    const ballRadius = 0.14; // Larger high-visibility ball (28cm diameter)
    const ballGeo = new THREE.SphereGeometry(ballRadius, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#1a1a1a', // Subtle self-illumination so it stands out on dark grass
      roughness: 0.15,
      metalness: 0.1,
    });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    
    // Classic premium black panel/seam wireframe overlaid on the ball to make it easily recognizable as a football
    const ballWireGeo = new THREE.IcosahedronGeometry(ballRadius + 0.001, 1);
    const ballWireMat = new THREE.MeshBasicMaterial({
      color: '#050505',
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    const ballWire = new THREE.Mesh(ballWireGeo, ballWireMat);
    ball.add(ballWire);

    // Add a dedicated glowing key light right above the ball to make it highly defined and shiny
    const ballLight = new THREE.PointLight('#ffffff', 0.65, 3.0);
    ballLight.position.set(0, 0.25, 0);
    ball.add(ballLight);

    // Remember: Z is depth. On 2D we used ballPos.z from 0 to 40. In 3D we place it at negative Z.
    ball.position.set(simStateRef.current.ballPos.x, ballRadius, -simStateRef.current.ballPos.z);
    ball.castShadow = true;
    scene.add(ball);

    // 8. PROCEDURAL LOW-POLY WALL PLAYERS
    const wallGroup = new THREE.Group();
    scene.add(wallGroup);

    // Keep track of player body colliders for Raycasting
    let wallColliders: THREE.Object3D[] = [];

    // Keep track of textures/materials/geometries to dispose them to avoid memory leaks
    const wallDisposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];

    const buildWall = () => {
      // Clear current wall group
      while (wallGroup.children.length > 0) {
        wallGroup.remove(wallGroup.children[0]);
      }
      wallColliders = [];

      // Dispose old materials/textures/geometries
      wallDisposables.forEach(item => item.dispose());
      wallDisposables.length = 0;

      const count = simStateRef.current.wallCount;
      if (count === 0) return;

      const ballX = simStateRef.current.ballPos.x;
      const ballZ = -simStateRef.current.ballPos.z;

      // Center of goal
      const goalCenterX = 0;
      const goalCenterZ = 0;

      // Vector from ball to goal center
      const dirX = goalCenterX - ballX;
      const dirZ = goalCenterZ - ballZ;
      const len = Math.sqrt(dirX * dirX + dirZ * dirZ);

      // Wall starts ~9.15m from ball
      // Near post side
      const nearPostX = ballX < 0 ? -3.66 : 3.66;
      // Target point is a blend between goal center and near post to line up the wall realistically
      const targetPointX = nearPostX * 0.45; 
      const wallDirX = targetPointX - ballX;
      const wallDirZ = 0 - ballZ;
      const wallLen = Math.sqrt(wallDirX * wallDirX + wallDirZ * wallDirZ);
      const wuX = wallDirX / wallLen;
      const wuZ = wallDirZ / wallLen;

      // Base wall center position (9.15m along the target line)
      const baseWallX = ballX + wuX * 9.15;
      const baseWallZ = ballZ + wuZ * 9.15;

      // Perpendicular vector for side shifting
      const pX = wuZ;
      const pZ = -wuX;

      const playerSpacing = 0.52; // distance between players

      interface WallPlayerPlacement {
        x: number;
        z: number;
        index: number;
      }
      const placements: WallPlayerPlacement[] = [];

      if (simStateRef.current.splitWall) {
        // Split wall is enabled
        const count1 = Math.ceil(count / 2);
        const count2 = Math.floor(count / 2);

        const wall1CenterX = baseWallX + pX * simStateRef.current.wallShift;
        const wall1CenterZ = baseWallZ + pZ * simStateRef.current.wallShift;

        const wall2CenterX = baseWallX + pX * simStateRef.current.wallShift2;
        const wall2CenterZ = baseWallZ + pZ * simStateRef.current.wallShift2;

        // Wall 1 players
        for (let i = 0; i < count1; i++) {
          const offsetMultiplier = i - (count1 - 1) / 2;
          placements.push({
            x: wall1CenterX + pX * offsetMultiplier * playerSpacing,
            z: wall1CenterZ + pZ * offsetMultiplier * playerSpacing,
            index: placements.length,
          });
        }

        // Wall 2 players
        for (let j = 0; j < count2; j++) {
          const offsetMultiplier = j - (count2 - 1) / 2;
          placements.push({
            x: wall2CenterX + pX * offsetMultiplier * playerSpacing,
            z: wall2CenterZ + pZ * offsetMultiplier * playerSpacing,
            index: placements.length,
          });
        }
      } else {
        // Single wall
        const wallCenterX = baseWallX + pX * simStateRef.current.wallShift;
        const wallCenterZ = baseWallZ + pZ * simStateRef.current.wallShift;

        for (let i = 0; i < count; i++) {
          const offsetMultiplier = i - (count - 1) / 2;
          placements.push({
            x: wallCenterX + pX * offsetMultiplier * playerSpacing,
            z: wallCenterZ + pZ * offsetMultiplier * playerSpacing,
            index: placements.length,
          });
        }
      }

      // Sort placements based on absolute distance to the center (X = 0) of the pitch (descending order).
      // This means the players furthest from the center line ("außen") are sorted first,
      // and those closer to the center line ("innen") are sorted later.
      const sortedPlacements = [...placements].sort((a, b) => Math.abs(b.x) - Math.abs(a.x));

      // Map each player's original index to a back number, starting from 2 upwards
      const numberMap = new Map<number, number>();
      sortedPlacements.forEach((p, sortedIdx) => {
        numberMap.set(p.index, sortedIdx + 2);
      });

      // Function to generate canvas-based back number texture
      const createNumberTexture = (num: number) => {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Fill background blue to match jersey
          ctx.fillStyle = '#1e40af';
          ctx.fillRect(0, 0, size, size);

          // Render high-contrast white number
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 84px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(num.toString(), size / 2, size / 2);
        }
        const texture = new THREE.CanvasTexture(canvas);
        wallDisposables.push(texture);
        return texture;
      };

      // Blue jerseys (Trikot) & white shorts and socks (weiße Hosen & Stutzen)
      const jerseyMat = new THREE.MeshPhongMaterial({ color: '#1e40af', shininess: 10 });
      const shortsMat = new THREE.MeshPhongMaterial({ color: '#ffffff', shininess: 5 });
      const sockMat = new THREE.MeshPhongMaterial({ color: '#ffffff', shininess: 5 });
      const skinMat = new THREE.MeshPhongMaterial({ color: '#ffdbac', shininess: 5 });
      const bootMat = new THREE.MeshPhongMaterial({ color: '#111111', shininess: 10 });

      wallDisposables.push(jerseyMat, shortsMat, sockMat, skinMat, bootMat);

      // Geometries
      const torsoGeo = new THREE.BoxGeometry(0.38, 0.75, 0.2);
      const headGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const hairGeo = new THREE.BoxGeometry(0.14, 0.08, 0.14);
      const shortsGeo = new THREE.BoxGeometry(0.39, 0.22, 0.21);
      const sockGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.45, 8);
      const kneeGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.16, 8);
      const bootGeo = new THREE.BoxGeometry(0.09, 0.07, 0.18);
      const sleeveGeo = new THREE.CylinderGeometry(0.055, 0.05, 0.16, 8);
      const armLowerGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.38, 8);
      const handGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
      const backNumGeo = new THREE.PlaneGeometry(0.25, 0.25);

      wallDisposables.push(
        torsoGeo, headGeo, hairGeo, shortsGeo, sockGeo,
        kneeGeo, bootGeo, sleeveGeo, armLowerGeo, handGeo, backNumGeo
      );

      for (let i = 0; i < placements.length; i++) {
        const placement = placements[i];
        const assignedNumber = numberMap.get(placement.index) || (i + 2);

        const player = new THREE.Group();
        player.position.set(placement.x, 0, placement.z);

        // Face towards the ball
        player.lookAt(new THREE.Vector3(ballX, 0, ballZ));

        // Torso / Jersey (Blue)
        const torso = new THREE.Mesh(torsoGeo, jerseyMat);
        torso.position.y = 1.15;
        torso.castShadow = true;
        torso.receiveShadow = true;
        player.add(torso);

        // Head
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.set(0, 1.63, 0);
        head.castShadow = true;
        player.add(head);

        // Hair / Cap
        const hairMat = new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? '#1e1b4b' : '#5c3d2e' });
        wallDisposables.push(hairMat);
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.set(0, 1.73, -0.01);
        player.add(hair);

        // Shorts (White)
        const shorts = new THREE.Mesh(shortsGeo, shortsMat);
        shorts.position.y = 0.72;
        shorts.castShadow = true;
        shorts.receiveShadow = true;
        player.add(shorts);

        // Socks (White)
        const leftSock = new THREE.Mesh(sockGeo, sockMat);
        leftSock.position.set(-0.1, 0.225, 0);
        leftSock.castShadow = true;
        leftSock.receiveShadow = true;
        player.add(leftSock);

        const rightSock = leftSock.clone();
        rightSock.position.set(0.1, 0.225, 0);
        player.add(rightSock);

        // Knee (Skin)
        const leftKnee = new THREE.Mesh(kneeGeo, skinMat);
        leftKnee.position.set(-0.1, 0.53, 0);
        leftKnee.castShadow = true;
        player.add(leftKnee);

        const rightKnee = leftKnee.clone();
        rightKnee.position.set(0.1, 0.53, 0);
        player.add(rightKnee);

        // Boots (Black)
        const leftBoot = new THREE.Mesh(bootGeo, bootMat);
        leftBoot.position.set(-0.1, 0.035, 0.05);
        leftBoot.castShadow = true;
        player.add(leftBoot);

        const rightBoot = leftBoot.clone();
        rightBoot.position.set(0.1, 0.035, 0.05);
        player.add(rightBoot);

        // Arms (Sleeves & Forearms)
        const leftArmGroup = new THREE.Group();
        leftArmGroup.position.set(-0.21, 1.4, 0);
        const leftSleeve = new THREE.Mesh(sleeveGeo, jerseyMat);
        leftSleeve.position.set(0, -0.08, 0);
        leftArmGroup.add(leftSleeve);

        const leftForearm = new THREE.Mesh(armLowerGeo, skinMat);
        leftForearm.position.set(0, -0.28, 0.06);
        leftForearm.rotation.x = Math.PI / 4;
        leftArmGroup.add(leftForearm);

        leftArmGroup.rotation.z = -Math.PI / 12;
        leftArmGroup.rotation.x = Math.PI / 12;
        player.add(leftArmGroup);

        const rightArmGroup = new THREE.Group();
        rightArmGroup.position.set(0.21, 1.4, 0);
        const rightSleeve = new THREE.Mesh(sleeveGeo, jerseyMat);
        rightSleeve.position.set(0, -0.08, 0);
        rightArmGroup.add(rightSleeve);

        const rightForearm = new THREE.Mesh(armLowerGeo, skinMat);
        rightForearm.position.set(0, -0.28, 0.06);
        rightForearm.rotation.x = Math.PI / 4;
        rightArmGroup.add(rightForearm);

        rightArmGroup.rotation.z = Math.PI / 12;
        rightArmGroup.rotation.x = Math.PI / 12;
        player.add(rightArmGroup);

        // Hands
        const leftHand = new THREE.Mesh(handGeo, skinMat);
        leftHand.position.set(-0.06, 0.85, 0.12);
        player.add(leftHand);

        const rightHand = leftHand.clone();
        rightHand.position.set(0.06, 0.85, 0.12);
        player.add(rightHand);

        // Dynamic Back Number
        const numberTexture = createNumberTexture(assignedNumber);
        const backNumMat = new THREE.MeshBasicMaterial({
          map: numberTexture,
          side: THREE.DoubleSide
        });
        wallDisposables.push(backNumMat);
        const backNumMesh = new THREE.Mesh(backNumGeo, backNumMat);
        backNumMesh.position.set(0, 1.15, -0.102);
        backNumMesh.rotation.y = Math.PI;
        player.add(backNumMesh);

        wallGroup.add(player);

        // Raycasting Colliders for detailed silhouette shadow figures
        wallColliders.push(torso);
        wallColliders.push(head);
        wallColliders.push(shorts);
        wallColliders.push(leftSock);
        wallColliders.push(rightSock);
        wallColliders.push(leftKnee);
        wallColliders.push(rightKnee);
        wallColliders.push(leftBoot);
        wallColliders.push(rightBoot);
      }
    };

    buildWall();

    // 9. GOALKEEPER RETICLE (NONE - clean view!)

    // 10. TREFFERFLÄCHE (HIT AREA ANALYSIS)
    // We represent this as a clean 2D grid spanning exactly across the goal mouth,
    // positioned flat along the goal line between the two posts. This completely eliminates
    // any lines or segments sticking inside/outside the goal area.
    const hitAreaGroup = new THREE.Group();
    scene.add(hitAreaGroup);

    const columns = 55;
    const rows = 22;
    const hitStrips: THREE.Mesh[] = [];

    // Define line material for the shot cone connection lines (white, solid, highly visible)
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
    });

    const coneLineL = new THREE.Line(new THREE.BufferGeometry(), lineMaterial);
    scene.add(coneLineL);

    const coneLineR = new THREE.Line(new THREE.BufferGeometry(), lineMaterial);
    scene.add(coneLineR);

    const buildHitAreaStrips = () => {
      // Clear existing
      while (hitAreaGroup.children.length > 0) {
        hitAreaGroup.remove(hitAreaGroup.children[0]);
      }
      hitStrips.length = 0;

      const ballX = simStateRef.current.ballPos.x;
      const ballZ = -simStateRef.current.ballPos.z;

      // 1. Connection line from Ball to Goal Center (0, 0)
      const len = Math.sqrt(ballX * ballX + ballZ * ballZ) || 1;
      const uX = -ballX / len;
      const uZ = -ballZ / len;

      // Perpendicular vector p pointing along the Trefferfläche
      let pX = uZ;
      let pZ = -uX;

      // Determine the ball-near post
      const distLeft = Math.sqrt((-3.66 - ballX) ** 2 + (0.01 - ballZ) ** 2);
      const distRight = Math.sqrt((3.66 - ballX) ** 2 + (0.01 - ballZ) ** 2);
      const nearLeft = distLeft < distRight;
      
      const Nx = nearLeft ? -3.66 : 3.66;
      const Nz = 0.01;
      const Fx = nearLeft ? 3.66 : -3.66;
      const Fz = 0.01;

      // Adjust p to point towards the other post
      if ((Nx < 0 && pX < 0) || (Nx > 0 && pX > 0)) {
        pX = -pX;
        pZ = -pZ;
      }

      // 2. Line-Line Intersection for the end of the Trefferfläche
      const dX = Fx - ballX;
      const dZ = Fz - ballZ;

      const denom = pX * dZ - pZ * dX;
      let tMax = 7.32;
      if (Math.abs(denom) > 1e-5) {
        tMax = ((ballX - Nx) * dZ - (ballZ - Nz) * dX) / denom;
      }
      tMax = Math.abs(tMax);
      tMax = Math.max(3.0, Math.min(15.0, tMax));

      // 3. Connect cone lines completely from the Ball to the Left and Right Posts
      const leftPost = new THREE.Vector3(-3.66, 0.04, 0.01);
      const rightPost = new THREE.Vector3(3.66, 0.04, 0.01);
      const ballVector = new THREE.Vector3(ballX, 0.04, ballZ);

      coneLineL.geometry.setFromPoints([ballVector, leftPost]);
      coneLineR.geometry.setFromPoints([ballVector, rightPost]);

      // 4. Create the grid cells
      const colWidth = tMax / columns;
      const rowHeight = 2.44 / rows;
      const cellGeo = new THREE.PlaneGeometry(colWidth, rowHeight);

      const cellMat = new THREE.MeshBasicMaterial({
        color: '#dc2626',
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      });

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
          const u = (c + 0.5) / columns;
          const sx = Nx + u * tMax * pX;
          const sz = Nz + u * tMax * pZ;
          const sy = (r + 0.5) * rowHeight;

          const cellMesh = new THREE.Mesh(cellGeo, cellMat.clone());
          cellMesh.position.set(sx, sy, sz);
          cellMesh.rotation.y = Math.atan2(ballX, ballZ);

          hitAreaGroup.add(cellMesh);
          hitStrips.push(cellMesh);
        }
      }
    };

    buildHitAreaStrips();

    // 11. RAYCASTER FOR HIT AREA CALCULATION
    const raycaster = new THREE.Raycaster();

    const updateHitArea = () => {
      // Make sure all matrices are up to date before raycasting!
      scene.updateMatrixWorld(true);

      const show = simStateRef.current.showHitArea;
      hitAreaGroup.visible = show;
      coneLineL.visible = show;
      coneLineR.visible = show;

      if (!show) return;

      const ballX = simStateRef.current.ballPos.x;
      const ballY = ballRadius;
      const ballZ = -simStateRef.current.ballPos.z;
      const ballVector = new THREE.Vector3(ballX, ballY, ballZ);

      // Cast ray to each cell's center
      for (let i = 0; i < hitStrips.length; i++) {
        const cell = hitStrips[i];
        if (!cell) continue;
        const cellPos = new THREE.Vector3(cell.position.x, cell.position.y, cell.position.z);

        // Vector direction
        const dir = new THREE.Vector3().subVectors(cellPos, ballVector);
        const distanceToGoal = dir.length();
        dir.normalize();

        raycaster.set(ballVector, dir);

        // Intersect with wall body colliders
        const intersects = raycaster.intersectObjects(wallColliders, true);

        let blocked = false;
        if (intersects.length > 0) {
          const hitDistance = intersects[0].distance;
          if (hitDistance < distanceToGoal) {
            blocked = true;
          }
        }

        const mat = cell.material as THREE.MeshBasicMaterial;
        if (blocked) {
          // Deep black human silhouette shadow representing wall player coverage
          mat.opacity = 0.88;
          mat.color.setHex(0x0a0a0a); // Solid black shadow figure
        } else {
          // Make open scoring target zones highly visible glowing red (Scoring-Zone)
          mat.opacity = 0.7;
          mat.color.setHex(0xdc2626); // Bright red
        }
      }
    };

    // Camera look states
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let yaw = 0; // look left/right
    let pitch = 0; // look up/down

    // Align initial view towards the ball
    const initCameraAngle = () => {
      const bX = simStateRef.current.ballPos.x;
      const bZ = -simStateRef.current.ballPos.z;
      const gX = simStateRef.current.gkPos.x;
      const gZ = -simStateRef.current.gkPos.z;

      const deltaX = bX - gX;
      const deltaZ = bZ - gZ;
      yaw = Math.atan2(deltaX, -deltaZ); // facing towards the pitch
      pitch = -0.05;
    };
    initCameraAngle();

    // Mouse and touch drag to look
    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      yaw -= deltaX * 0.003;
      pitch -= deltaY * 0.003;
      pitch = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, pitch)); // clamp up/down
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        isDragging = true;
        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length === 0) return;
      const deltaX = e.touches[0].clientX - prevMouseX;
      const deltaY = e.touches[0].clientY - prevMouseY;
      prevMouseX = e.touches[0].clientX;
      prevMouseY = e.touches[0].clientY;

      yaw -= deltaX * 0.004;
      pitch -= deltaY * 0.004;
      pitch = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, pitch));
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onMouseUp);

    // 12. ANIMATE LOOP
    let animationFrameId: number;
    let localWallCount = wallCount;
    let localWallShift = wallShift;
    let localWallShift2 = wallShift2;
    let localSplitWall = splitWall;
    let localBallPos = { ...ballPos };

    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Handle Goalkeeper movement (Keyboard Controls - Camera-relative)
      const keys = simStateRef.current.keys;
      const speed = 4.5 * clock.getDelta(); // slightly faster for a free-movement feel

      // Calculate forward/right directions relative to camera look angle (yaw)
      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyQuaternion(camera.quaternion);
      forward.y = 0; // lock movement to horizontal plane
      forward.normalize();

      const right = new THREE.Vector3(1, 0, 0);
      right.applyQuaternion(camera.quaternion);
      right.y = 0; // lock movement to horizontal plane
      right.normalize();

      const moveDir = new THREE.Vector3();

      if (keys.w || keys.ArrowUp) {
        moveDir.add(forward);
      }
      if (keys.s || keys.ArrowDown) {
        moveDir.sub(forward);
      }
      if (keys.a || keys.ArrowLeft) {
        moveDir.sub(right);
      }
      if (keys.d || keys.ArrowRight) {
        moveDir.add(right);
      }

      if (moveDir.lengthSq() > 0) {
        moveDir.normalize();
        const currentGk = simStateRef.current.gkPos;
        // Expand boundaries to allow free movement across the entire goal/pitch area
        const nextX = Math.max(-30, Math.min(30, currentGk.x + moveDir.x * speed));
        const nextZ = Math.max(-5, Math.min(45, currentGk.z + moveDir.z * speed));
        setGkPos({ x: nextX, z: nextZ });
      }

      // Check if settings changed
      if (
        localWallCount !== simStateRef.current.wallCount ||
        localWallShift !== simStateRef.current.wallShift ||
        localWallShift2 !== simStateRef.current.wallShift2 ||
        localSplitWall !== simStateRef.current.splitWall ||
        localBallPos.x !== simStateRef.current.ballPos.x ||
        localBallPos.z !== simStateRef.current.ballPos.z
      ) {
        localWallCount = simStateRef.current.wallCount;
        localWallShift = simStateRef.current.wallShift;
        localWallShift2 = simStateRef.current.wallShift2;
        localSplitWall = simStateRef.current.splitWall;
        localBallPos = { ...simStateRef.current.ballPos };

        // Re-align ball
        ball.position.set(localBallPos.x, ballRadius, -localBallPos.z);

        buildWall();
        buildHitAreaStrips();
        updateHitArea();
      }

      // Update camera position from Goalkeeper Position state
      const curGk = simStateRef.current.gkPos;
      // Note: GK position Z is positive. In Three.js we defend at Z=0 and move deeper into negative Z.
      // So GK stands slightly in front of the goal line, i.e. Z is negative.
      camera.position.set(curGk.x, 1.65, curGk.z);

      // Apply direct look-at ball rotation so the ball is always at the center of the view
      camera.lookAt(ball.position);

      // Realtime hit area analysis update
      updateHitArea();

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight || 550;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Clean up
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onMouseUp);
      
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [view]);

  // Handle on-screen mobile movements
  const moveGkMobile = (dir: 'left' | 'right' | 'forward' | 'backward') => {
    const step = 0.5; // larger step size
    const currentGk = simStateRef.current.gkPos;
    let nextX = currentGk.x;
    let nextZ = currentGk.z;

    if (dir === 'left') nextX = Math.max(-30, currentGk.x - step);
    if (dir === 'right') nextX = Math.min(30, currentGk.x + step);
    if (dir === 'forward') nextZ = Math.max(-5, currentGk.z - step);
    if (dir === 'backward') nextZ = Math.min(45, currentGk.z + step);

    setGkPos({ x: nextX, z: nextZ });
  };

  return (
    <div id="goalkeeper-simulator-container" className="w-full bg-slate-950 text-white rounded-3xl overflow-hidden border border-slate-900 shadow-2xl relative">
      {/* 1. INTRO VIEW */}
      {view === 'intro' && (
        <div className="p-10 text-center space-y-8 relative py-20">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-transparent to-slate-900/40 pointer-events-none"></div>
          
          <div className="mx-auto w-20 h-20 bg-gradient-to-tr from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-2xl transform rotate-6 border border-amber-400/30">
            <Shield className="w-10 h-10 text-slate-950 font-black animate-pulse" />
          </div>

          <div className="space-y-3 max-w-xl mx-auto">
            <h1 className="text-3xl font-black tracking-tight font-sans text-white">
              Torwart-Simulator 3D
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Meistere das freie Stellungsspiel, die perfekte Mauergröße und verhindere Tore. Platziere den Ball auf dem Feld und teste dein Können unter realen physikalischen Winkeln in Ego-Perspektive!
            </p>
          </div>

          <div className="flex justify-center gap-3 max-w-sm mx-auto pt-4">
            <button
              id="btn-start-simulator"
              onClick={() => setView('setup2d')}
              className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl cursor-pointer transition-all duration-300 shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:shadow-[0_0_35px_rgba(245,158,11,0.45)] transform hover:-translate-y-0.5"
            >
              Torwartsimulator starten
            </button>
          </div>
        </div>
      )}

      {/* 2. 2D SETUP VIEW */}
      {view === 'setup2d' && (
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-900 pb-4">
            <div className="flex items-center gap-3">
              <button
                id="btn-back-to-intro"
                onClick={() => setView('intro')}
                className="p-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-base font-extrabold tracking-tight">1. Freistoß positionieren</h2>
                <p className="text-[11px] text-slate-400">Klicke auf die Spielfeldhälfte, um den Ball zu legen.</p>
              </div>
            </div>
            <div className="px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs font-bold rounded-xl">
              Ball: X: {ballPos.x.toFixed(1)}m | Z: {ballPos.z.toFixed(1)}m
            </div>
          </div>

          <div className="flex justify-center">
            <div className="relative border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 shadow-inner max-w-full">
              <canvas
                id="canvas-setup-2d"
                ref={canvas2dRef}
                width={550}
                height={400}
                onClick={handleFieldClick}
                className="cursor-crosshair max-w-full block"
              />
              <div className="absolute top-3 left-3 bg-slate-950/80 border border-slate-900 px-3 py-1.5 rounded-lg text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                Draufsicht (Minimap)
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-between gap-4 max-w-md mx-auto">
            <button
              id="btn-back-to-menu-from-setup"
              onClick={onBack}
              className="py-3 px-6 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              id="btn-start-3d-sim"
              onClick={() => {
                setGkPos({ x: 0, z: 0.5 }); // Reset goalkeeper to goal center
                setView('sim3d');
              }}
              className="flex-1 py-3 px-6 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer text-center"
            >
              Simulation starten 🚀
            </button>
          </div>
        </div>
      )}

      {/* 3. 3D SIMULATION EXPERIENCE */}
      {view === 'sim3d' && (
        <div className="relative w-full h-[620px] flex flex-col">
          {/* DEZENTE STATUSLEISTE (HUD) AT TOP */}
          <div className="absolute top-0 inset-x-0 z-30 bg-slate-950/90 border-b border-slate-900/60 p-3 flex flex-wrap items-center justify-between gap-3 text-xs backdrop-blur-md">
            <div className="flex items-center gap-3">
              <button
                id="btn-back-to-setup2d"
                onClick={() => setView('setup2d')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors text-[11px] font-bold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                2D-Setup
              </button>
              <div className="h-4 w-[1px] bg-slate-800"></div>
              <div className="flex items-center gap-1 text-slate-400 font-mono text-[11px]">
                <span>Ballort:</span>
                <span className="text-amber-500 font-bold">{Math.sqrt(ballPos.x * ballPos.x + ballPos.z * ballPos.z).toFixed(1)}m</span>
              </div>
            </div>

            {/* WALL & INTERACTIVE CONTROLS */}
            <div className="flex items-center flex-wrap gap-4">
              {/* Number of Players */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold font-mono text-[11px] flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-indigo-400" /> Mauer:
                </span>
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                  <button
                    id="btn-wall-minus"
                    onClick={() => setWallCount(Math.max(0, wallCount - 1))}
                    className="px-2.5 py-1 text-slate-400 hover:text-white hover:bg-slate-800 font-bold font-mono transition-colors border-r border-slate-800 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="px-3 font-mono font-bold text-white text-[11px] min-w-[20px] text-center">
                    {wallCount}
                  </span>
                  <button
                    id="btn-wall-plus"
                    onClick={() => setWallCount(Math.min(10, wallCount + 1))}
                    className="px-2.5 py-1 text-slate-400 hover:text-white hover:bg-slate-800 font-bold font-mono transition-colors border-l border-slate-800 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Split Wall Checkbox */}
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-mono text-slate-400 hover:text-white select-none">
                <input
                  id="checkbox-split-wall"
                  type="checkbox"
                  checked={splitWall}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSplitWall(checked);
                    if (checked) {
                      // Separate them on initialization so they do not overlap
                      setWallShift(-1.0);
                      setWallShift2(1.0);
                    } else {
                      setWallShift(0);
                    }
                  }}
                  className="rounded bg-slate-900 border-slate-800 text-indigo-500 focus:ring-0 cursor-pointer w-3.5 h-3.5"
                />
                <span>Zweigeteilt</span>
              </label>

              {/* Shift Wall(s) */}
              {!splitWall ? (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold font-mono text-[11px] flex items-center gap-1">
                    <Move className="w-3.5 h-3.5 text-amber-500" />
                  </span>
                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                    <button
                      id="btn-wall-shift-left"
                      onClick={() => setWallShift(prev => Number((prev - 0.2).toFixed(1)))}
                      className="px-2.5 py-1 text-slate-400 hover:text-white hover:bg-slate-800 font-bold font-mono transition-colors border-r border-slate-800 cursor-pointer text-[10px]"
                    >
                      ◀ L
                    </button>
                    <button
                      id="btn-wall-shift-right"
                      onClick={() => setWallShift(prev => Number((prev + 0.2).toFixed(1)))}
                      className="px-2.5 py-1 text-slate-400 hover:text-white hover:bg-slate-800 font-bold font-mono transition-colors cursor-pointer text-[10px]"
                    >
                      R ▶
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Mauer 1 (Left Split Control) */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-semibold font-mono text-[10px] flex items-center gap-1">
                      <Move className="w-3 h-3 text-blue-400" /> M1:
                    </span>
                    <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                      <button
                        id="btn-wall1-shift-left"
                        onClick={() => setWallShift(prev => Number((prev - 0.2).toFixed(1)))}
                        className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-800 font-bold font-mono transition-colors border-r border-slate-800 cursor-pointer text-[10px]"
                      >
                        ◀
                      </button>
                      <button
                        id="btn-wall1-shift-right"
                        onClick={() => setWallShift(prev => Number((prev + 0.2).toFixed(1)))}
                        className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-800 font-bold font-mono transition-colors cursor-pointer text-[10px]"
                      >
                        ▶
                      </button>
                    </div>
                  </div>

                  {/* Mauer 2 (Right Split Control) */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-semibold font-mono text-[10px] flex items-center gap-1">
                      <Move className="w-3 h-3 text-emerald-400" /> M2:
                    </span>
                    <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                      <button
                        id="btn-wall2-shift-left"
                        onClick={() => setWallShift2(prev => Number((prev - 0.2).toFixed(1)))}
                        className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-800 font-bold font-mono transition-colors border-r border-slate-800 cursor-pointer text-[10px]"
                      >
                        ◀
                      </button>
                      <button
                        id="btn-wall2-shift-right"
                        onClick={() => setWallShift2(prev => Number((prev + 0.2).toFixed(1)))}
                        className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-800 font-bold font-mono transition-colors cursor-pointer text-[10px]"
                      >
                        ▶
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Toggle Hit Area */}
              <button
                id="btn-toggle-hitarea"
                onClick={() => setShowHitArea(!showHitArea)}
                className={`flex items-center gap-1 px-3 py-1.5 border rounded-lg transition-all text-[11px] font-bold cursor-pointer ${
                  showHitArea
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Trefferfläche {showHitArea ? 'AN' : 'AUS'}
              </button>
            </div>
          </div>

          {/* THE 3D VIEWPORT CONTAINER */}
          <div
            id="div-three-viewport"
            ref={mountRef}
            className="flex-1 w-full relative cursor-grab active:cursor-grabbing overflow-hidden"
          >
            {/* Floating Trefferfläche Toggle & Legend */}
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2.5">
              <button
                id="btn-floating-toggle-hitarea"
                onClick={() => setShowHitArea(!showHitArea)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-black uppercase tracking-wider shadow-lg transition-all backdrop-blur-md cursor-pointer ${
                  showHitArea
                    ? 'bg-rose-500/25 hover:bg-rose-500/35 border-rose-500/50 text-rose-200'
                    : 'bg-slate-950/85 hover:bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                <Layers className="w-4 h-4 text-rose-500" />
                Trefferfläche: {showHitArea ? 'AN (Sichtbar)' : 'AUS (Versteckt)'}
              </button>

              {showHitArea && (
                <div className="p-2.5 bg-slate-950/90 border border-slate-800 rounded-xl w-48 space-y-1.5 backdrop-blur-md shadow-lg animate-fade-in text-left">
                  <span className="block text-[9px] text-amber-500 font-mono uppercase tracking-wider font-extrabold">Schussweg-Analyse</span>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[10px] text-slate-300">
                      <div className="w-3 h-3 rounded bg-red-600 border border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] shrink-0"></div>
                      <span>Freie Schussbahn</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-300">
                      <div className="w-3 h-3 rounded bg-zinc-950 border border-zinc-700 shadow-[0_0_8px_rgba(0,0,0,0.8)] shrink-0"></div>
                      <span>Schattenfigur (Mauer)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Helper Banner */}
            <div className="absolute bottom-4 left-4 z-20 p-2.5 bg-slate-950/85 border border-slate-900 rounded-xl backdrop-blur-md">
              <span className="block text-[9px] text-amber-500 font-mono uppercase tracking-wider font-extrabold mb-0.5">Steuerung</span>
              <p className="text-[10px] text-slate-300 font-medium">
                Pfeiltasten & Maus
              </p>
            </div>

            {/* On-screen controls for Goalkeeper translation on Mobile / Touch */}
            <div className="absolute bottom-4 right-4 z-20 bg-slate-950/85 border border-slate-900 p-3.5 rounded-2xl flex flex-col items-center gap-2 backdrop-blur-md">
              <span className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider mb-1">Torwart bewegen</span>
              <button
                id="btn-mobile-up"
                onTouchStart={() => moveGkMobile('forward')}
                onClick={() => moveGkMobile('forward')}
                className="w-10 h-10 bg-slate-900 active:bg-slate-800 border border-slate-800 rounded-xl flex items-center justify-center font-bold text-slate-200 transition-colors select-none cursor-pointer text-sm"
              >
                ▲
              </button>
              <div className="flex gap-2">
                <button
                  id="btn-mobile-left"
                  onTouchStart={() => moveGkMobile('left')}
                  onClick={() => moveGkMobile('left')}
                  className="w-10 h-10 bg-slate-900 active:bg-slate-800 border border-slate-800 rounded-xl flex items-center justify-center font-bold text-slate-200 transition-colors select-none cursor-pointer text-sm"
                >
                  ◀
                </button>
                <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center font-bold text-indigo-400 text-xs font-mono">
                  {gkPos.x === 0 ? '0' : `${gkPos.x > 0 ? '+' : ''}${gkPos.x.toFixed(1)}`}
                </div>
                <button
                  id="btn-mobile-right"
                  onTouchStart={() => moveGkMobile('right')}
                  onClick={() => moveGkMobile('right')}
                  className="w-10 h-10 bg-slate-900 active:bg-slate-800 border border-slate-800 rounded-xl flex items-center justify-center font-bold text-slate-200 transition-colors select-none cursor-pointer text-sm"
                >
                  ▶
                </button>
              </div>
              <button
                id="btn-mobile-down"
                onTouchStart={() => moveGkMobile('backward')}
                onClick={() => moveGkMobile('backward')}
                className="w-10 h-10 bg-slate-900 active:bg-slate-800 border border-slate-800 rounded-xl flex items-center justify-center font-bold text-slate-200 transition-colors select-none cursor-pointer text-sm"
              >
                ▼
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
