import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Search, 
  Check, 
  Activity, 
  Sparkles,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import { cn } from '../utils/cn';

export const ALL_INJURED_BODY_PARTS = [
  'Kopf',
  'Hals/Nacken',
  'rechte Schulter',
  'linke Schulter',
  'rechter Arm',
  'linker Arm',
  'rechter Ellenbogen',
  'linker Ellenbogen',
  'rechte Hand',
  'linke Hand',
  'Brust',
  'Bauch',
  'oberer Rücken',
  'unterer Rücken',
  'rechte Hüfte',
  'linke Hüfte',
  'vorderer Oberschenkel rechts',
  'hinterer Oberschenkel rechts',
  'vorderer Oberschenkel links',
  'hinterer Oberschenkel links',
  'Knie rechts',
  'Knie links',
  'Wade rechts',
  'Wade links',
  'Schienbein rechts',
  'Schienbein links',
  'Knöchel rechts',
  'Knöchel links',
  'Fuß rechts',
  'Fuß links'
] as const;

export type InjuredBodyPart = typeof ALL_INJURED_BODY_PARTS[number];

export const BODY_REGIONS: { title: string; icon: string; parts: InjuredBodyPart[] }[] = [
  {
    title: 'Kopf & Rumpf',
    icon: '🧠',
    parts: [
      'Kopf',
      'Hals/Nacken',
      'Brust',
      'Bauch',
      'oberer Rücken',
      'unterer Rücken',
      'rechte Hüfte',
      'linke Hüfte'
    ]
  },
  {
    title: 'Schultern & Arme',
    icon: '💪',
    parts: [
      'rechte Schulter',
      'linke Schulter',
      'rechter Arm',
      'linker Arm',
      'rechter Ellenbogen',
      'linker Ellenbogen',
      'rechte Hand',
      'linke Hand'
    ]
  },
  {
    title: 'Oberschenkel & Knie',
    icon: '🦵',
    parts: [
      'vorderer Oberschenkel rechts',
      'hinterer Oberschenkel rechts',
      'vorderer Oberschenkel links',
      'hinterer Oberschenkel links',
      'Knie rechts',
      'Knie links'
    ]
  },
  {
    title: 'Unterschenkel & Füße',
    icon: '👟',
    parts: [
      'Schienbein rechts',
      'Schienbein links',
      'Wade rechts',
      'Wade links',
      'Knöchel rechts',
      'Knöchel links',
      'Fuß rechts',
      'Fuß links'
    ]
  }
];

// Realistic 3D Muscle/Body Part Geometry
interface MeshRing {
  y: number;
  rx: number;
  rz: number;
  offsetX?: number;
  offsetZ?: number;
  // Specific muscle deformation weights [front, back, left, right]
  bulge?: [number, number, number, number];
}

interface AnatomicalBodyPart3D {
  id: InjuredBodyPart;
  name: string;
  center: [number, number, number];
  hitRadius: [number, number, number];
  facing: [number, number, number]; // Preferred view normal
  rings: MeshRing[];
  segments?: number;
}

// Highly realistic parametric anatomical muscle definitions
const REALISTIC_BODY_PARTS: AnatomicalBodyPart3D[] = [
  // 1. Kopf (Head with Cranium, Jawline, Chin & Brow)
  {
    id: 'Kopf',
    name: 'Kopf',
    center: [0, 164, 2],
    hitRadius: [22, 28, 24],
    facing: [0, 0, 1],
    rings: [
      { y: 190, rx: 10, rz: 12, offsetZ: 0 },
      { y: 180, rx: 19, rz: 22, offsetZ: 0 },
      { y: 168, rx: 21, rz: 23, offsetZ: 1 },
      { y: 156, rx: 18, rz: 20, offsetZ: 2 }, // Eye/Jaw level
      { y: 145, rx: 13, rz: 16, offsetZ: 5 }, // Chin projection
      { y: 138, rx: 10, rz: 11, offsetZ: 2 }
    ]
  },

  // 2. Hals/Nacken (Neck with Sternocleidomastoid & Trapezius slope)
  {
    id: 'Hals/Nacken',
    name: 'Hals/Nacken',
    center: [0, 130, 0],
    hitRadius: [13, 12, 13],
    facing: [0, 0, 1],
    rings: [
      { y: 138, rx: 11, rz: 11, offsetZ: 1 },
      { y: 130, rx: 12, rz: 12, offsetZ: 0 },
      { y: 122, rx: 16, rz: 15, offsetZ: -2 }
    ]
  },

  // 3. Schultern (Deltoid muscle caps with 3D teardrop shape)
  {
    id: 'rechte Schulter',
    name: 'rechte Schulter',
    center: [-38, 118, 0],
    hitRadius: [15, 14, 15],
    facing: [-1, 0.4, 0.4],
    rings: [
      { y: 126, rx: 12, rz: 13, offsetX: -34, offsetZ: 0 },
      { y: 118, rx: 15, rz: 14, offsetX: -39, offsetZ: 1 },
      { y: 108, rx: 12, rz: 12, offsetX: -42, offsetZ: 0 }
    ]
  },
  {
    id: 'linke Schulter',
    name: 'linke Schulter',
    center: [38, 118, 0],
    hitRadius: [15, 14, 15],
    facing: [1, 0.4, 0.4],
    rings: [
      { y: 126, rx: 12, rz: 13, offsetX: 34, offsetZ: 0 },
      { y: 118, rx: 15, rz: 14, offsetX: 39, offsetZ: 1 },
      { y: 108, rx: 12, rz: 12, offsetX: 42, offsetZ: 0 }
    ]
  },

  // 4. Brust (Pectoralis Major Left & Right with sternum cleft)
  {
    id: 'Brust',
    name: 'Brust',
    center: [0, 102, 10],
    hitRadius: [30, 18, 15],
    facing: [0, 0, 1],
    rings: [
      { y: 120, rx: 26, rz: 15, offsetZ: 8 },
      { y: 108, rx: 31, rz: 18, offsetZ: 11 }, // Pectoral peak
      { y: 94, rx: 28, rz: 15, offsetZ: 8 }
    ]
  },

  // 5. Oberer Rücken (Trapezius, Rhomboids, Latissimus V-Taper)
  {
    id: 'oberer Rücken',
    name: 'oberer Rücken',
    center: [0, 102, -10],
    hitRadius: [30, 18, 15],
    facing: [0, 0, -1],
    rings: [
      { y: 120, rx: 27, rz: 15, offsetZ: -8 },
      { y: 108, rx: 32, rz: 17, offsetZ: -10 },
      { y: 94, rx: 28, rz: 15, offsetZ: -9 }
    ]
  },

  // 6. Bauch (Rectus Abdominis 6-Pack & Obliques)
  {
    id: 'Bauch',
    name: 'Bauch',
    center: [0, 68, 7],
    hitRadius: [26, 20, 14],
    facing: [0, 0, 1],
    rings: [
      { y: 94, rx: 27, rz: 14, offsetZ: 7 },
      { y: 80, rx: 25, rz: 13, offsetZ: 8 },
      { y: 65, rx: 24, rz: 14, offsetZ: 8 },
      { y: 50, rx: 26, rz: 15, offsetZ: 7 }
    ]
  },

  // 7. Unterer Rücken (Erector Spinae & Lumbar curve)
  {
    id: 'unterer Rücken',
    name: 'unterer Rücken',
    center: [0, 68, -7],
    hitRadius: [26, 20, 14],
    facing: [0, 0, -1],
    rings: [
      { y: 94, rx: 27, rz: 14, offsetZ: -7 },
      { y: 80, rx: 25, rz: 13, offsetZ: -8 },
      { y: 65, rx: 24, rz: 14, offsetZ: -8 },
      { y: 50, rx: 26, rz: 15, offsetZ: -7 }
    ]
  },

  // 8. Hüfte (Pelvis, Iliac Crest & Gluteus Maximus/Medius)
  {
    id: 'rechte Hüfte',
    name: 'rechte Hüfte',
    center: [-22, 34, 0],
    hitRadius: [17, 18, 17],
    facing: [-1, 0, 0.4],
    rings: [
      { y: 50, rx: 16, rz: 16, offsetX: -16, offsetZ: 0 },
      { y: 35, rx: 18, rz: 18, offsetX: -20, offsetZ: 0 },
      { y: 18, rx: 16, rz: 16, offsetX: -18, offsetZ: -2 }
    ]
  },
  {
    id: 'linke Hüfte',
    name: 'linke Hüfte',
    center: [22, 34, 0],
    hitRadius: [17, 18, 17],
    facing: [1, 0, 0.4],
    rings: [
      { y: 50, rx: 16, rz: 16, offsetX: 16, offsetZ: 0 },
      { y: 35, rx: 18, rz: 18, offsetX: 20, offsetZ: 0 },
      { y: 18, rx: 16, rz: 16, offsetX: 18, offsetZ: -2 }
    ]
  },

  // 9. Arme (Biceps / Triceps / Forearm flexors)
  {
    id: 'rechter Arm',
    name: 'rechter Arm',
    center: [-50, 75, 2],
    hitRadius: [12, 38, 12],
    facing: [-1, 0, 0.4],
    rings: [
      { y: 108, rx: 11, rz: 11, offsetX: -44, offsetZ: 0 },
      { y: 92, rx: 12, rz: 12, offsetX: -48, offsetZ: 2 }, // Biceps peak
      { y: 78, rx: 10, rz: 10, offsetX: -52, offsetZ: 1 },
      { y: 58, rx: 9, rz: 9, offsetX: -55, offsetZ: 4 },  // Forearm bulk
      { y: 32, rx: 8, rz: 7, offsetX: -57, offsetZ: 5 },  // Wrist
      { y: 22, rx: 7, rz: 6, offsetX: -58, offsetZ: 6 }
    ]
  },
  {
    id: 'rechter Ellenbogen',
    name: 'rechter Ellenbogen',
    center: [-53, 68, -1],
    hitRadius: [10, 10, 10],
    facing: [-1, 0, -0.7],
    rings: [
      { y: 74, rx: 9, rz: 9, offsetX: -52, offsetZ: 0 },
      { y: 68, rx: 10, rz: 10, offsetX: -53, offsetZ: -2 }, // Olecranon point
      { y: 62, rx: 9, rz: 9, offsetX: -54, offsetZ: 0 }
    ]
  },
  {
    id: 'rechte Hand',
    name: 'rechte Hand',
    center: [-60, 8, 7],
    hitRadius: [10, 15, 8],
    facing: [-1, 0, 0.5],
    rings: [
      { y: 20, rx: 7, rz: 6, offsetX: -59, offsetZ: 6 },
      { y: 10, rx: 9, rz: 6, offsetX: -60, offsetZ: 7 }, // Palm
      { y: -2, rx: 7, rz: 4, offsetX: -62, offsetZ: 8 }  // Fingers
    ]
  },

  {
    id: 'linker Arm',
    name: 'linker Arm',
    center: [50, 75, 2],
    hitRadius: [12, 38, 12],
    facing: [1, 0, 0.4],
    rings: [
      { y: 108, rx: 11, rz: 11, offsetX: 44, offsetZ: 0 },
      { y: 92, rx: 12, rz: 12, offsetX: 48, offsetZ: 2 }, // Biceps peak
      { y: 78, rx: 10, rz: 10, offsetX: 52, offsetZ: 1 },
      { y: 58, rx: 9, rz: 9, offsetX: 55, offsetZ: 4 },  // Forearm bulk
      { y: 32, rx: 8, rz: 7, offsetX: 57, offsetZ: 5 },  // Wrist
      { y: 22, rx: 7, rz: 6, offsetX: 58, offsetZ: 6 }
    ]
  },
  {
    id: 'linker Ellenbogen',
    name: 'linker Ellenbogen',
    center: [53, 68, -1],
    hitRadius: [10, 10, 10],
    facing: [1, 0, -0.7],
    rings: [
      { y: 74, rx: 9, rz: 9, offsetX: 52, offsetZ: 0 },
      { y: 68, rx: 10, rz: 10, offsetX: 53, offsetZ: -2 }, // Olecranon point
      { y: 62, rx: 9, rz: 9, offsetX: 54, offsetZ: 0 }
    ]
  },
  {
    id: 'linke Hand',
    name: 'linke Hand',
    center: [60, 8, 7],
    hitRadius: [10, 15, 8],
    facing: [1, 0, 0.5],
    rings: [
      { y: 20, rx: 7, rz: 6, offsetX: 59, offsetZ: 6 },
      { y: 10, rx: 9, rz: 6, offsetX: 60, offsetZ: 7 }, // Palm
      { y: -2, rx: 7, rz: 4, offsetX: 62, offsetZ: 8 }  // Fingers
    ]
  },

  // 10. Oberschenkel (Quadriceps vs Hamstrings)
  {
    id: 'vorderer Oberschenkel rechts',
    name: 'vorderer Oberschenkel rechts',
    center: [-20, -20, 9],
    hitRadius: [16, 36, 12],
    facing: [0, 0, 1],
    rings: [
      { y: 16, rx: 16, rz: 14, offsetX: -18, offsetZ: 6 },
      { y: -8, rx: 16, rz: 15, offsetX: -20, offsetZ: 9 }, // Rectus femoris bulge
      { y: -32, rx: 15, rz: 14, offsetX: -20, offsetZ: 9 }, // Vastus medialis teardrop
      { y: -50, rx: 13, rz: 12, offsetX: -19, offsetZ: 6 }
    ]
  },
  {
    id: 'hinterer Oberschenkel rechts',
    name: 'hinterer Oberschenkel rechts',
    center: [-20, -20, -9],
    hitRadius: [16, 36, 12],
    facing: [0, 0, -1],
    rings: [
      { y: 16, rx: 16, rz: 14, offsetX: -18, offsetZ: -6 },
      { y: -8, rx: 16, rz: 15, offsetX: -20, offsetZ: -9 }, // Hamstring belly
      { y: -32, rx: 15, rz: 14, offsetX: -20, offsetZ: -9 },
      { y: -50, rx: 13, rz: 12, offsetX: -19, offsetZ: -6 }
    ]
  },

  {
    id: 'vorderer Oberschenkel links',
    name: 'vorderer Oberschenkel links',
    center: [20, -20, 9],
    hitRadius: [16, 36, 12],
    facing: [0, 0, 1],
    rings: [
      { y: 16, rx: 16, rz: 14, offsetX: 18, offsetZ: 6 },
      { y: -8, rx: 16, rz: 15, offsetX: 20, offsetZ: 9 }, // Rectus femoris bulge
      { y: -32, rx: 15, rz: 14, offsetX: 20, offsetZ: 9 }, // Vastus medialis teardrop
      { y: -50, rx: 13, rz: 12, offsetX: 19, offsetZ: 6 }
    ]
  },
  {
    id: 'hinterer Oberschenkel links',
    name: 'hinterer Oberschenkel links',
    center: [20, -20, -9],
    hitRadius: [16, 36, 12],
    facing: [0, 0, -1],
    rings: [
      { y: 16, rx: 16, rz: 14, offsetX: 18, offsetZ: -6 },
      { y: -8, rx: 16, rz: 15, offsetX: 20, offsetZ: -9 }, // Hamstring belly
      { y: -32, rx: 15, rz: 14, offsetX: 20, offsetZ: -9 },
      { y: -50, rx: 13, rz: 12, offsetX: 19, offsetZ: -6 }
    ]
  },

  // 11. Knie (Patella & Joint Capsule)
  {
    id: 'Knie rechts',
    name: 'Knie rechts',
    center: [-20, -62, 5],
    hitRadius: [13, 12, 13],
    facing: [0, 0, 1],
    rings: [
      { y: -54, rx: 13, rz: 12, offsetX: -19, offsetZ: 3 },
      { y: -62, rx: 13, rz: 13, offsetX: -19, offsetZ: 5 }, // Patella front
      { y: -72, rx: 12, rz: 11, offsetX: -19, offsetZ: 2 }
    ]
  },
  {
    id: 'Knie links',
    name: 'Knie links',
    center: [20, -62, 5],
    hitRadius: [13, 12, 13],
    facing: [0, 0, 1],
    rings: [
      { y: -54, rx: 13, rz: 12, offsetX: 19, offsetZ: 3 },
      { y: -62, rx: 13, rz: 13, offsetX: 19, offsetZ: 5 }, // Patella front
      { y: -72, rx: 12, rz: 11, offsetX: 19, offsetZ: 2 }
    ]
  },

  // 12. Unterschenkel (Schienbein vs Wade Gastrocnemius)
  {
    id: 'Schienbein rechts',
    name: 'Schienbein rechts',
    center: [-19, -108, 8],
    hitRadius: [12, 34, 10],
    facing: [0, 0, 1],
    rings: [
      { y: -74, rx: 12, rz: 11, offsetX: -19, offsetZ: 4 },
      { y: -94, rx: 13, rz: 12, offsetX: -20, offsetZ: 7 }, // Shin ridge
      { y: -120, rx: 11, rz: 10, offsetX: -19, offsetZ: 5 },
      { y: -140, rx: 9, rz: 9, offsetX: -19, offsetZ: 3 }
    ]
  },
  {
    id: 'Wade rechts',
    name: 'Wade rechts',
    center: [-19, -108, -8],
    hitRadius: [14, 34, 12],
    facing: [0, 0, -1],
    rings: [
      { y: -74, rx: 12, rz: 11, offsetX: -19, offsetZ: -4 },
      { y: -94, rx: 15, rz: 14, offsetX: -20, offsetZ: -10 }, // Gastrocnemius diamond
      { y: -120, rx: 12, rz: 11, offsetX: -19, offsetZ: -6 },  // Soleus taper
      { y: -140, rx: 9, rz: 9, offsetX: -19, offsetZ: -3 }   // Achilles
    ]
  },

  {
    id: 'Schienbein links',
    name: 'Schienbein links',
    center: [19, -108, 8],
    hitRadius: [12, 34, 10],
    facing: [0, 0, 1],
    rings: [
      { y: -74, rx: 12, rz: 11, offsetX: 19, offsetZ: 4 },
      { y: -94, rx: 13, rz: 12, offsetX: 20, offsetZ: 7 }, // Shin ridge
      { y: -120, rx: 11, rz: 10, offsetX: 19, offsetZ: 5 },
      { y: -140, rx: 9, rz: 9, offsetX: 19, offsetZ: 3 }
    ]
  },
  {
    id: 'Wade links',
    name: 'Wade links',
    center: [19, -108, -8],
    hitRadius: [14, 34, 12],
    facing: [0, 0, -1],
    rings: [
      { y: -74, rx: 12, rz: 11, offsetX: 19, offsetZ: -4 },
      { y: -94, rx: 15, rz: 14, offsetX: 20, offsetZ: -10 }, // Gastrocnemius diamond
      { y: -120, rx: 12, rz: 11, offsetX: 19, offsetZ: -6 },  // Soleus taper
      { y: -140, rx: 9, rz: 9, offsetX: 19, offsetZ: -3 }   // Achilles
    ]
  },

  // 13. Knöchel & Füße
  {
    id: 'Knöchel rechts',
    name: 'Knöchel rechts',
    center: [-19, -148, 2],
    hitRadius: [11, 10, 11],
    facing: [0, 0, 1],
    rings: [
      { y: -142, rx: 9, rz: 9, offsetX: -19, offsetZ: 0 },
      { y: -148, rx: 11, rz: 10, offsetX: -19, offsetZ: 1 }, // Malleolus bumps
      { y: -156, rx: 10, rz: 12, offsetX: -19, offsetZ: 2 }
    ]
  },
  {
    id: 'Knöchel links',
    name: 'Knöchel links',
    center: [19, -148, 2],
    hitRadius: [11, 10, 11],
    facing: [0, 0, 1],
    rings: [
      { y: -142, rx: 9, rz: 9, offsetX: 19, offsetZ: 0 },
      { y: -148, rx: 11, rz: 10, offsetX: 19, offsetZ: 1 }, // Malleolus bumps
      { y: -156, rx: 10, rz: 12, offsetX: 19, offsetZ: 2 }
    ]
  },

  {
    id: 'Fuß rechts',
    name: 'Fuß rechts',
    center: [-19, -168, 12],
    hitRadius: [11, 10, 22],
    facing: [0, -0.4, 1],
    rings: [
      { y: -156, rx: 10, rz: 12, offsetX: -19, offsetZ: 2 },
      { y: -164, rx: 11, rz: 18, offsetX: -19, offsetZ: 10 }, // Instep & Arch
      { y: -172, rx: 10, rz: 22, offsetX: -19, offsetZ: 16 }  // Forefoot & Toes
    ]
  },
  {
    id: 'Fuß links',
    name: 'Fuß links',
    center: [19, -168, 12],
    hitRadius: [11, 10, 22],
    facing: [0, -0.4, 1],
    rings: [
      { y: -156, rx: 10, rz: 12, offsetX: 19, offsetZ: 2 },
      { y: -164, rx: 11, rz: 18, offsetX: 19, offsetZ: 10 }, // Instep & Arch
      { y: -172, rx: 10, rz: 22, offsetX: 19, offsetZ: 16 }  // Forefoot & Toes
    ]
  }
];

interface BodyPartSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPart?: string;
  onSelect: (bodyPart: string) => void;
}

export const BodyPartSelectorModal: React.FC<BodyPartSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedPart = '',
  onSelect
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // 3D Camera & Rotation Angles
  const [rotY, setRotY] = useState<number>(0); // Yaw (horizontal rotation, 0 = Front, Math.PI = Back)
  const [rotX, setRotX] = useState<number>(0.05); // Pitch (vertical tilt)
  const [zoom, setZoom] = useState<number>(1.0);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const [tempSelected, setTempSelected] = useState<string>(selectedPart);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Drag interaction state
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const velocityRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTempSelected(selectedPart);
      // Auto-orient based on pre-selection
      if (selectedPart && (selectedPart.includes('Rücken') || selectedPart.includes('Wade') || selectedPart.includes('hinterer'))) {
        setRotY(Math.PI);
      } else {
        setRotY(0);
      }
      setRotX(0.05);
      setZoom(1.0);
    }
  }, [isOpen, selectedPart]);

  // 3D Matrix Rotation Helper
  const rotatePoint = useCallback((x: number, y: number, z: number, rx: number, ry: number) => {
    // 1. Rotate Y (Yaw)
    const cosY = Math.cos(ry);
    const sinY = Math.sin(ry);
    const x1 = x * cosY + z * sinY;
    const z1 = -x * sinY + z * cosY;

    // 2. Rotate X (Pitch)
    const cosX = Math.cos(rx);
    const sinX = Math.sin(rx);
    const y2 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;

    return { x: x1, y: y2, z: z2 };
  }, []);

  // 3D Rendering Engine (Realistic Anatomical Mannequin)
  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2 - 12;
    const fov = 480 * zoom;

    // 3-Point Lighting Vectors (Key, Fill, Rim)
    const keyLight = { x: 0.6, y: 0.7, z: 1.0 };
    const klLen = Math.hypot(keyLight.x, keyLight.y, keyLight.z);
    keyLight.x /= klLen; keyLight.y /= klLen; keyLight.z /= klLen;

    // 1. Draw High-End Athletic 3D Studio Hologram Platform
    const platformY = -180;
    const platformRot = rotatePoint(0, platformY, 0, rotX, rotY);
    const platformScreenY = cy - platformRot.y;

    ctx.save();
    // Outer glow ring
    ctx.beginPath();
    ctx.ellipse(cx + platformRot.x, platformScreenY, 78 * zoom, 26 * zoom, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Inner sports pulse ring
    ctx.beginPath();
    ctx.ellipse(cx + platformRot.x, platformScreenY, 50 * zoom, 16 * zoom, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // 2. Transform & Sort all 3D Anatomical Parts by Depth (Painter's Algorithm)
    const transformedParts = REALISTIC_BODY_PARTS.map(part => {
      const pos = rotatePoint(part.center[0], part.center[1], part.center[2], rotX, rotY);
      const facing = rotatePoint(part.facing[0], part.facing[1], part.facing[2], rotX, rotY);
      const fLen = Math.hypot(facing.x, facing.y, facing.z) || 1;
      facing.x /= fLen; facing.y /= fLen; facing.z /= fLen;

      // Perspective projection
      const depthFactor = fov / (fov + pos.z);
      const screenX = cx + pos.x * depthFactor;
      const screenY = cy - pos.y * depthFactor;

      const rx = Math.max(6, part.hitRadius[0] * depthFactor);
      const ry = Math.max(6, part.hitRadius[1] * depthFactor);
      const rz = Math.max(6, part.hitRadius[2] * depthFactor);

      const isPartSelected = tempSelected === part.id;
      const isPartHovered = hoveredPart === part.id;

      // Project all mesh rings for realistic muscular contours
      const projectedRings = part.rings.map(ring => {
        const ringWorldX = (ring.offsetX || 0);
        const ringWorldY = ring.y;
        const ringWorldZ = (ring.offsetZ || 0);

        const rRot = rotatePoint(ringWorldX, ringWorldY, ringWorldZ, rotX, rotY);
        const rDepthFactor = fov / (fov + rRot.z);
        const rScreenX = cx + rRot.x * rDepthFactor;
        const rScreenY = cy - rRot.y * rDepthFactor;

        const ringRx = ring.rx * rDepthFactor;
        const ringRz = ring.rz * rDepthFactor;

        return {
          screenX: rScreenX,
          screenY: rScreenY,
          rx: ringRx,
          rz: ringRz,
          y: ring.y,
          depth: rRot.z
        };
      });

      return {
        part,
        pos,
        facing,
        screenX,
        screenY,
        rx,
        ry,
        rz,
        isPartSelected,
        isPartHovered,
        projectedRings,
        depth: pos.z
      };
    });

    // Sort ascending by depth (farthest rendered first)
    transformedParts.sort((a, b) => a.depth - b.depth);

    // 3. Render Realistic 3D Muscle Geometry
    transformedParts.forEach(item => {
      const { screenX, screenY, rx, ry, isPartSelected, isPartHovered, facing, projectedRings } = item;

      ctx.save();

      // Realistic Diffuse & Specular Lighting
      const dot = Math.max(0.18, facing.x * keyLight.x + facing.y * keyLight.y + facing.z * keyLight.z);
      const rimLight = Math.pow(1 - Math.abs(facing.z), 2) * 0.35; // Specular rim reflection
      
      // Color & Material Grading
      if (isPartSelected) {
        // Glowing Red/Rose for Injured Body Part
        const grad = ctx.createRadialGradient(
          screenX - rx * 0.3, screenY - ry * 0.3, 2,
          screenX, screenY, Math.max(rx, ry) * 1.15
        );
        grad.addColorStop(0, '#ffe4e6');
        grad.addColorStop(0.3, '#f43f5e');
        grad.addColorStop(0.8, '#be123c');
        grad.addColorStop(1, '#881337');
        ctx.fillStyle = grad;
        ctx.strokeStyle = '#fda4af';
        ctx.lineWidth = 2.4;
        ctx.shadowColor = 'rgba(244, 63, 94, 0.9)';
        ctx.shadowBlur = 14;
      } else if (isPartHovered) {
        // Bio-Scan Cyan/Sky Blue for Hovered Body Part
        const grad = ctx.createRadialGradient(
          screenX - rx * 0.3, screenY - ry * 0.3, 2,
          screenX, screenY, Math.max(rx, ry) * 1.15
        );
        grad.addColorStop(0, '#e0f2fe');
        grad.addColorStop(0.3, '#38bdf8');
        grad.addColorStop(0.8, '#0284c7');
        grad.addColorStop(1, '#075985');
        ctx.fillStyle = grad;
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 2.2;
        ctx.shadowColor = 'rgba(56, 189, 248, 0.85)';
        ctx.shadowBlur = 12;
      } else {
        // Studio Athletic Mannequin Gradient (Titanium Slate)
        const lit = Math.floor(35 + dot * 55 + rimLight * 40);
        const dark = Math.max(12, Math.floor(lit * 0.38));
        const mid = Math.floor((lit + dark) / 2);

        const grad = ctx.createRadialGradient(
          screenX - rx * 0.35, screenY - ry * 0.35, 2,
          screenX, screenY, Math.max(rx, ry) * 1.2
        );
        grad.addColorStop(0, `rgb(${lit + 25}, ${lit + 30}, ${lit + 45})`);
        grad.addColorStop(0.4, `rgb(${mid + 15}, ${mid + 20}, ${mid + 30})`);
        grad.addColorStop(1, `rgb(${dark}, ${dark + 2}, ${dark + 8})`);
        ctx.fillStyle = grad;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 1.2;
      }

      // Render connected smooth muscle contour hull from parametric rings
      if (projectedRings.length >= 2) {
        ctx.beginPath();
        // Left contour
        ctx.moveTo(projectedRings[0].screenX - projectedRings[0].rx, projectedRings[0].screenY);
        for (let i = 1; i < projectedRings.length; i++) {
          const prev = projectedRings[i - 1];
          const curr = projectedRings[i];
          const cpX = (prev.screenX - prev.rx + curr.screenX - curr.rx) / 2;
          const cpY = (prev.screenY + curr.screenY) / 2;
          ctx.quadraticCurveTo(prev.screenX - prev.rx, prev.screenY, cpX, cpY);
        }
        const last = projectedRings[projectedRings.length - 1];
        ctx.lineTo(last.screenX - last.rx, last.screenY);
        ctx.lineTo(last.screenX + last.rx, last.screenY);
        
        // Right contour
        for (let i = projectedRings.length - 2; i >= 0; i--) {
          const next = projectedRings[i + 1];
          const curr = projectedRings[i];
          const cpX = (next.screenX + next.rx + curr.screenX + curr.rx) / 2;
          const cpY = (next.screenY + curr.screenY) / 2;
          ctx.quadraticCurveTo(next.screenX + next.rx, next.screenY, cpX, cpY);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw internal anatomical muscle fibers / depth curves
        projectedRings.forEach((ring, idx) => {
          if (idx % 2 === 0 || isPartSelected || isPartHovered) {
            ctx.beginPath();
            ctx.ellipse(ring.screenX, ring.screenY, ring.rx * 0.8, ring.rz * 0.45, 0, 0, Math.PI * 2);
            ctx.strokeStyle = isPartSelected
              ? 'rgba(255, 228, 230, 0.5)'
              : isPartHovered
              ? 'rgba(224, 242, 254, 0.5)'
              : 'rgba(148, 163, 184, 0.18)';
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        });
      } else {
        // Fallback spherical mesh
        ctx.beginPath();
        ctx.ellipse(screenX, screenY, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Selected Core Pulse Target Marker
      if (isPartSelected) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(screenX, screenY, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

  }, [rotX, rotY, zoom, hoveredPart, tempSelected, rotatePoint]);

  // Real-time animation loop (auto-rotate & physics inertia)
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min(50, time - lastTime) / 1000;
      lastTime = time;

      if (!isDraggingRef.current) {
        if (autoRotate) {
          setRotY(prev => (prev + dt * 0.55) % (Math.PI * 2));
        } else if (Math.abs(velocityRef.current.vx) > 0.001 || Math.abs(velocityRef.current.vy) > 0.001) {
          setRotY(prev => (prev + velocityRef.current.vx) % (Math.PI * 2));
          setRotX(prev => Math.max(-0.55, Math.min(0.55, prev + velocityRef.current.vy)));
          velocityRef.current.vx *= 0.92;
          velocityRef.current.vy *= 0.92;
        }
      }

      drawScene();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [autoRotate, drawScene]);

  // 3D Raycasting Hit-Test on Mouse Move
  const findPartUnderCursor = (clientX: number, clientY: number): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2 - 12;
    const fov = 480 * zoom;

    const hits = REALISTIC_BODY_PARTS
      .map(part => {
        const pos = rotatePoint(part.center[0], part.center[1], part.center[2], rotX, rotY);
        const facing = rotatePoint(part.facing[0], part.facing[1], part.facing[2], rotX, rotY);
        const depthFactor = fov / (fov + pos.z);
        const screenX = cx + pos.x * depthFactor;
        const screenY = cy - pos.y * depthFactor;
        const rx = Math.max(10, part.hitRadius[0] * depthFactor * 1.18);
        const ry = Math.max(10, part.hitRadius[1] * depthFactor * 1.18);

        const dx = (x - screenX) / rx;
        const dy = (y - screenY) / ry;
        const distSq = dx * dx + dy * dy;

        return { part, pos, facing, distSq };
      })
      .filter(item => item.distSq <= 1.0)
      // Sort by front-facing depth so clicking the front picks front muscles, and back picks back muscles
      .sort((a, b) => b.pos.z - a.pos.z);

    return hits.length > 0 ? hits[0].part.id : null;
  };

  // Pointer Events (Mouse / Touch Orbit)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    velocityRef.current = { vx: 0, vy: 0 };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };

      const vx = dx * 0.008;
      const vy = -dy * 0.008;
      velocityRef.current = { vx, vy };

      setRotY(prev => (prev + vx) % (Math.PI * 2));
      setRotX(prev => Math.max(-0.55, Math.min(0.55, prev + vy)));
    } else {
      const hit = findPartUnderCursor(e.clientX, e.clientY);
      setHoveredPart(hit);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      const dx = Math.abs(velocityRef.current.vx);
      const dy = Math.abs(velocityRef.current.vy);
      if (dx < 0.003 && dy < 0.003) {
        const hit = findPartUnderCursor(e.clientX, e.clientY);
        if (hit) {
          setTempSelected(hit);
        }
      }
    }
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom(prev => Math.max(0.75, Math.min(1.65, prev + zoomDelta)));
  };

  const setViewAngle = (side: 'front' | 'back' | 'right' | 'left') => {
    setAutoRotate(false);
    velocityRef.current = { vx: 0, vy: 0 };
    setRotX(0.05);
    if (side === 'front') setRotY(0);
    if (side === 'back') setRotY(Math.PI);
    if (side === 'right') setRotY(Math.PI / 2);
    if (side === 'left') setRotY(-Math.PI / 2);
  };

  const handlePartClick = (part: InjuredBodyPart) => {
    setTempSelected(part);
    const def = REALISTIC_BODY_PARTS.find(p => p.id === part);
    if (def) {
      if (def.facing[2] < -0.3 && Math.cos(rotY) > 0) {
        setRotY(Math.PI);
      } else if (def.facing[2] > 0.3 && Math.cos(rotY) < 0) {
        setRotY(0);
      }
    }
  };

  const handleConfirm = () => {
    onSelect(tempSelected);
    onClose();
  };

  const filteredParts = ALL_INJURED_BODY_PARTS.filter(p => 
    p.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const currentDisplayName = hoveredPart || tempSelected || 'Klicke oder ziehe den realistischen 3D-Körper';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Top Glow Header Accent */}
        <div className="h-1.5 bg-gradient-to-r from-rose-500 via-sky-400 to-rose-600 flex-shrink-0" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 pb-3 flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-black text-lg shadow-inner">
              🩺
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Verletztes Körperteil auswählen</span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Realistische 3D-Anatomie
                </span>
              </h2>
              <p className="text-xs text-slate-400 hidden sm:block">
                Drehe den anatomischen 3D-Körper frei in 360° oder nutze die Schnellwahl-Perspektiven.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content: Left 3D Canvas, Right Quick Pick / Search */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Interactive 3D Canvas (7 Cols on desktop) */}
          <div className="md:col-span-7 flex flex-col items-center bg-slate-950/90 border border-slate-800 rounded-3xl p-4 relative shadow-inner overflow-hidden">
            
            {/* Top 3D Control Bar */}
            <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-3 z-10">
              {/* Perspective Preset Buttons */}
              <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setViewAngle('front')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition",
                    Math.abs(rotY) < 0.3 ? "bg-rose-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  Vorne
                </button>
                <button
                  type="button"
                  onClick={() => setViewAngle('back')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition",
                    Math.abs(Math.abs(rotY) - Math.PI) < 0.3 ? "bg-rose-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  Hinten
                </button>
                <button
                  type="button"
                  onClick={() => setViewAngle('right')}
                  className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 transition"
                  title="Rechte Seite"
                >
                  Rechts
                </button>
                <button
                  type="button"
                  onClick={() => setViewAngle('left')}
                  className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 transition"
                  title="Linke Seite"
                >
                  Links
                </button>
              </div>

              {/* 3D Action Tools: Auto-Rotate & Zoom */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAutoRotate(prev => !prev)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition shadow-sm cursor-pointer",
                    autoRotate 
                      ? "bg-emerald-600 border-emerald-400 text-white" 
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  )}
                  title={autoRotate ? "Auto-Drehung anhalten" : "Auto-3D-Drehung starten"}
                >
                  {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span className="text-[11px] hidden sm:inline">{autoRotate ? 'Stop' : '3D Auto'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setZoom(prev => Math.min(1.6, prev + 0.15))}
                  className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Heranzoomen"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(prev => Math.max(0.75, prev - 0.15))}
                  className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Herauszoomen"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => { setRotY(0); setRotX(0.05); setZoom(1.0); }}
                  className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Ausrichtung zurücksetzen"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Live Status Banner */}
            <div className="w-full mb-2 px-3.5 py-2 rounded-2xl bg-slate-900/95 border border-slate-800 flex items-center justify-between text-xs z-10 shadow-md">
              <div className="flex items-center gap-2 truncate">
                <Activity className={cn("w-4 h-4 flex-shrink-0", tempSelected || hoveredPart ? "text-rose-400 animate-pulse" : "text-slate-500")} />
                <span className={cn("font-extrabold truncate", tempSelected || hoveredPart ? "text-white text-sm" : "text-slate-400 text-xs")}>
                  {currentDisplayName}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex-shrink-0 ml-2">
                3D Frei drehbar
              </span>
            </div>

            {/* 3D Canvas Element */}
            <div className="relative w-full max-w-[320px] aspect-[320/460] select-none flex items-center justify-center cursor-grab active:cursor-grabbing">
              <canvas
                ref={canvasRef}
                width={340}
                height={480}
                className="w-full h-full touch-none drop-shadow-2xl"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={() => { isDraggingRef.current = false; setHoveredPart(null); }}
                onWheel={handleWheel}
              />

              {/* Drag instruction overlay hint */}
              <div className="absolute bottom-2 inset-x-0 text-center pointer-events-none">
                <span className="text-[10px] text-slate-500 bg-slate-950/85 px-3 py-1 rounded-full border border-slate-800/80 backdrop-blur-sm shadow-md">
                  🖱️ Ziehen zum 360°-Drehen • Klick zum Auswählen
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Search & Categorized List (5 Cols on desktop) */}
          <div className="md:col-span-5 flex flex-col gap-4">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Körperteil suchen (z. B. Knie, Wade)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* List of Body Parts */}
            <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
              {searchQuery ? (
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                    Suchergebnisse ({filteredParts.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {filteredParts.map(part => (
                      <button
                        key={part}
                        type="button"
                        onClick={() => handlePartClick(part)}
                        onMouseEnter={() => setHoveredPart(part)}
                        onMouseLeave={() => setHoveredPart(null)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border cursor-pointer",
                          tempSelected === part
                            ? "bg-rose-600 border-rose-400 text-white shadow"
                            : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
                        )}
                      >
                        {tempSelected === part && <Check className="w-3 h-3" />}
                        <span>{part}</span>
                      </button>
                    ))}
                    {filteredParts.length === 0 && (
                      <p className="text-xs text-slate-500 py-3">Kein passendes Körperteil gefunden.</p>
                    )}
                  </div>
                </div>
              ) : (
                BODY_REGIONS.map(region => (
                  <div key={region.title} className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                      <span>{region.icon}</span>
                      <span>{region.title}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {region.parts.map(part => (
                        <button
                          key={part}
                          type="button"
                          onClick={() => handlePartClick(part)}
                          onMouseEnter={() => setHoveredPart(part)}
                          onMouseLeave={() => setHoveredPart(null)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[11px] font-medium transition flex items-center gap-1 border cursor-pointer",
                            tempSelected === part
                              ? "bg-rose-600 border-rose-400 text-white font-bold shadow"
                              : hoveredPart === part
                              ? "bg-sky-950/60 border-sky-600 text-sky-200"
                              : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
                          )}
                        >
                          {tempSelected === part && <Check className="w-3 h-3" />}
                          <span>{part}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs truncate">
            <span className="text-slate-400">Ausgewählt:</span>
            {tempSelected ? (
              <span className="font-black text-white bg-rose-950/80 text-rose-200 px-3 py-1.5 rounded-xl border border-rose-800/80 flex items-center gap-1.5 truncate shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                <span className="truncate">{tempSelected}</span>
              </span>
            ) : (
              <span className="text-slate-500 italic">Noch kein Körperteil ausgewählt</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 transition"
            >
              Abbrechen
            </button>
            <button
              type="button"
              disabled={!tempSelected}
              onClick={handleConfirm}
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 active:scale-95 transition shadow-lg shadow-rose-950/60 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              <span>Auswahl übernehmen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
