import { DocumentAnnotations, DocumentItem, DocumentPage } from '../types';
import { renderTemplateBackground } from '../lib/pdfRenderer';

// Helper to render high-fidelity lecture slide graphic onto dataURL
function createLectureSlideCanvas(
  course: string,
  lectureTitle: string,
  slideTitle: string,
  bullets: string[],
  diagramType: 'synapse' | 'chemistry' | 'vector' | 'summary',
  slideNum: number,
  totalSlides: number
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 900, 1200);

  // Subtle header banner
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 900, 130);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 130);
  ctx.lineTo(900, 130);
  ctx.stroke();

  // Course tag & date
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillStyle = '#0284c7';
  ctx.fillText(course.toUpperCase(), 48, 48);

  ctx.font = '400 13px system-ui, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`Lecture 14 · Slide ${slideNum} of ${totalSlides}`, 900 - 200, 48);

  // Slide Title
  ctx.font = '700 28px Outfit, system-ui, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(slideTitle, 48, 92);

  // Bullet items
  let currentY = 180;
  ctx.font = '400 18px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = '#334155';

  bullets.forEach((bullet) => {
    // Bullet marker
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(58, currentY - 5, 4, 0, Math.PI * 2);
    ctx.fill();

    // Bullet text
    ctx.fillStyle = '#334155';
    // Wrap text if needed
    const words = bullet.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 750 && n > 0) {
        ctx.fillText(line, 74, currentY);
        line = words[n] + ' ';
        currentY += 28;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 74, currentY);
    currentY += 40;
  });

  // Render scientific visual diagram in the lower stage
  currentY = Math.max(currentY + 20, 560);
  ctx.strokeStyle = '#cbd5e1';
  ctx.strokeRect(48, currentY, 804, 520);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(49, currentY + 1, 802, 518);

  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('FIGURE & SCHEMATIC MODEL', 68, currentY + 32);

  if (diagramType === 'synapse') {
    // Presynaptic terminal bouton
    ctx.fillStyle = '#e0f2fe';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(450, currentY + 120, 90, Math.PI, 0, false);
    ctx.stroke();
    ctx.fill();

    // Synaptic vesicles
    ctx.fillStyle = '#38bdf8';
    for (const [vx, vy] of [[420, currentY + 90], [450, currentY + 80], [480, currentY + 95], [440, currentY + 110], [460, currentY + 115]]) {
      ctx.beginPath();
      ctx.arc(vx, vy, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // Synaptic cleft
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 13px system-ui, sans-serif';
    ctx.fillText('Synaptic Cleft (~20 nm)', 380, currentY + 185);

    // Postsynaptic density
    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = '#ca8a04';
    ctx.beginPath();
    ctx.roundRect(240, currentY + 220, 420, 80, 16);
    ctx.fill();
    ctx.stroke();

    // Receptors (AMPA & NMDA)
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(300, currentY + 205, 50, 30);
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText('AMPA-R', 302, currentY + 200);

    ctx.fillStyle = '#ea580c';
    ctx.fillRect(520, currentY + 205, 55, 30);
    ctx.fillStyle = '#0f172a';
    ctx.fillText('NMDA-R', 522, currentY + 200);

    // Ions
    ctx.fillStyle = '#2563eb';
    ctx.font = '600 14px "JetBrains Mono", monospace';
    ctx.fillText('Na+ (Inflow)', 300, currentY + 270);
    ctx.fillStyle = '#c2410c';
    ctx.fillText('Ca2+ / Mg2+ block', 495, currentY + 270);

    // Explanatory badge
    ctx.fillStyle = '#1e293b';
    ctx.font = '400 14px system-ui, sans-serif';
    ctx.fillText('Postsynaptic Density (Dendritic Spine Membrane)', 280, currentY + 340);
  } else if (diagramType === 'chemistry') {
    // Chemical reaction pathway
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 24px "JetBrains Mono", monospace';
    ctx.fillText('R—C(=O)—R\'  +  R\'\'—MgBr   ⟶   [Tetrahedral Intermediate]', 120, currentY + 140);
    ctx.fillText('                              ⟶   R—C(OH)(R\')(R\'\')', 120, currentY + 240);

    ctx.fillStyle = '#64748b';
    ctx.font = '400 15px system-ui, sans-serif';
    ctx.fillText('Step 1: Nucleophilic attack of carbanion onto carbonyl carbon (C=O electrophile)', 120, currentY + 310);
    ctx.fillText('Step 2: Protonation with mild acid H3O+ yielding tertiary alcohol', 120, currentY + 350);
  } else if (diagramType === 'vector') {
    // 2D Vector field with arrows
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.5;
    for (let x = 180; x <= 720; x += 90) {
      for (let y = currentY + 70; y <= currentY + 450; y += 90) {
        const dx = (y - (currentY + 260)) * 0.15;
        const dy = -(x - 450) * 0.15;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + dx, y + dy);
        ctx.stroke();

        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 18px "JetBrains Mono", monospace';
    ctx.fillText('F(x, y) = ⟨ -y, x ⟩  (Rotational Circulation Field)', 240, currentY + 480);
  } else {
    // Summary table
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 16px system-ui, sans-serif';
    ctx.fillText('Key Mechanism Stages:', 100, currentY + 80);
    ctx.font = '400 15px system-ui, sans-serif';
    ctx.fillText('1. High-frequency stimulation (Tetanus 100 Hz)', 120, currentY + 120);
    ctx.fillText('2. Strong dendritic depolarization pushes out Mg2+ ion pore plug', 120, currentY + 160);
    ctx.fillText('3. Ca2+ surges through open NMDA receptor channel', 120, currentY + 200);
    ctx.fillText('4. CaMKII phosphorylation causes exocytosis of AMPA receptors', 120, currentY + 240);
    ctx.fillText('5. Result: Enhanced EPSP amplitude persists for weeks/months', 120, currentY + 280);
  }

  // Footer
  ctx.font = '400 12px system-ui, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('CONFIDENTIAL & PROPRIETARY · ACADEMIC STUDY USE ONLY', 48, 1160);

  return canvas.toDataURL('image/jpeg', 0.92);
}

export const SAMPLE_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-neuro-101',
    title: 'Lecture 14 - Synaptic Plasticity & LTP.pdf',
    courseName: 'NEUR 101 - Cellular Neuroscience',
    folderId: 'folder-neuro',
    totalPages: 4,
    fileSize: '3.4 MB',
    isSample: true,
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 3600000 * 4,
    tags: ['neuroscience', 'LTP', 'synapses', 'midterm-prep'],
  },
  {
    id: 'doc-ochem-2',
    title: 'Chem 220 - Carbonyl Chemistry & Grignards.pdf',
    courseName: 'CHEM 220 - Organic Chemistry II',
    folderId: 'folder-chem',
    totalPages: 3,
    fileSize: '2.8 MB',
    isSample: true,
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 1,
    tags: ['reactions', 'synthesis', 'mechanisms'],
  },
  {
    id: 'doc-calc-3',
    title: 'Math 213 - Greens Theorem & Vector Calculus.pdf',
    courseName: 'MATH 213 - Multivariable Calculus',
    folderId: 'folder-math',
    totalPages: 3,
    fileSize: '4.1 MB',
    isSample: true,
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 86400000 * 3,
    tags: ['calculus', 'curl', 'divergence', 'green-theorem'],
  },
];

export function getSamplePagesForDoc(docId: string): DocumentPage[] {
  if (docId === 'doc-neuro-101') {
    return [
      {
        id: 'neuro-p1',
        pageNumber: 1,
        template: 'pdf',
        title: 'Synaptic Transmission Overview',
        aspectRatio: 1200 / 900,
        bgDataUrl: createLectureSlideCanvas(
          'NEUR 101: Cellular Neuroscience',
          'Synaptic Plasticity',
          'Chemical Synaptic Transmission & Structure',
          [
            'Synapses are specialized communicative junctions between excitable neuronal membranes.',
            'Presynaptic active zone contains docked neurotransmitter vesicles (primarily Glutamate).',
            'Action potential triggers voltage-gated Ca2+ channels (VGCC), driving SNARE-mediated vesicle fusion.',
            'Postsynaptic membrane contains ionotropic receptors (AMPA, NMDA, Kainate) anchored to scaffolding proteins.',
          ],
          'synapse',
          1,
          4
        ),
      },
      {
        id: 'neuro-p2',
        pageNumber: 2,
        template: 'pdf',
        title: 'Induction of Long-Term Potentiation',
        aspectRatio: 1200 / 900,
        bgDataUrl: createLectureSlideCanvas(
          'NEUR 101: Cellular Neuroscience',
          'LTP Induction',
          'The NMDA Receptor: Molecular Coincidence Detector',
          [
            'At resting potentials (-70 mV), extracellular Mg2+ enters the pore and acts as a physical plug.',
            'AMPA receptor activation produces initial depolarization (EPSP).',
            'Sufficiently strong depolarization (~ -30 mV) expels the positively charged Mg2+ ion from pore.',
            'Simultaneous glutamate binding + depolarization allows high calcium (Ca2+) conductance.',
          ],
          'summary',
          2,
          4
        ),
      },
      {
        id: 'neuro-p3',
        pageNumber: 3,
        template: 'cornell',
        title: 'Cornell Study Notes: Molecular Cascades',
        aspectRatio: 1200 / 900,
        bgDataUrl: renderTemplateBackground('cornell', 900, 1200),
      },
      {
        id: 'neuro-p4',
        pageNumber: 4,
        template: 'lined',
        title: 'Review & Clinical Connections',
        aspectRatio: 1200 / 900,
        bgDataUrl: renderTemplateBackground('lined', 900, 1200),
      },
    ];
  }

  if (docId === 'doc-ochem-2') {
    return [
      {
        id: 'chem-p1',
        pageNumber: 1,
        template: 'pdf',
        title: 'Carbonyl Electrophilicity & Organometallics',
        aspectRatio: 1200 / 900,
        bgDataUrl: createLectureSlideCanvas(
          'CHEM 220: Organic Chemistry II',
          'Carbonyl Reactions',
          'Nucleophilic Addition with Organomagnesium (Grignard)',
          [
            'Carbonyl carbon possesses significant partial positive charge due to oxygen electronegativity.',
            'Grignard reagents (R-MgX) behave as masked carbanions (R:-) with high nucleophilic affinity.',
            'Solvent requirement: strictly anhydrous ether or THF to avoid rapid proton quench.',
            'Reaction with ketones produces tertiary alcohols; with aldehydes produces secondary alcohols.',
          ],
          'chemistry',
          1,
          3
        ),
      },
      {
        id: 'chem-p2',
        pageNumber: 2,
        template: 'grid',
        title: 'Reaction Mechanisms & Curved Arrow Practice',
        aspectRatio: 1200 / 900,
        bgDataUrl: renderTemplateBackground('grid', 900, 1200),
      },
      {
        id: 'chem-p3',
        pageNumber: 3,
        template: 'blank',
        title: 'Retrosynthesis Synthesis Tree',
        aspectRatio: 1200 / 900,
        bgDataUrl: renderTemplateBackground('blank', 900, 1200),
      },
    ];
  }

  // Fallback / Calculus
  return [
    {
      id: 'calc-p1',
      pageNumber: 1,
      template: 'pdf',
      title: 'Vector Fields in R2 and Circulation',
      aspectRatio: 1200 / 900,
      bgDataUrl: createLectureSlideCanvas(
        'MATH 213: Multivariable Calculus',
        'Vector Calculus',
        'Line Integrals & Vector Field Circulation',
        [
          'A vector field F(x, y) associates each point (x, y) with a 2-dimensional vector.',
          'Circulation line integral measures work done moving along a closed trajectory C.',
          'Green\'s Theorem transforms a closed line integral into an iterated double integral over region D.',
          'Formula: ∮_C (L dx + M dy) = ∬_D (∂M/∂x - ∂L/∂y) dA.',
        ],
        'vector',
        1,
        3
      ),
    },
    {
      id: 'calc-p2',
      pageNumber: 2,
      template: 'grid',
      title: 'Grid Sketch: Flux vs Curl Evaluation',
      aspectRatio: 1200 / 900,
      bgDataUrl: renderTemplateBackground('grid', 900, 1200),
    },
    {
      id: 'calc-p3',
      pageNumber: 3,
      template: 'cornell',
      title: 'Cornell Notes: When does Green\'s Theorem apply?',
      aspectRatio: 1200 / 900,
      bgDataUrl: renderTemplateBackground('cornell', 900, 1200),
    },
  ];
}

// Initial preloaded annotations for demonstration
export function getInitialAnnotationsForDoc(docId: string): DocumentAnnotations {
  if (docId === 'doc-neuro-101') {
    return {
      strokes: [
        // Highlighter across "voltage-gated Ca2+ channels"
        {
          id: 'stroke-hl-1',
          tool: 'highlighter',
          style: 'ballpoint',
          color: '#facc15', // yellow
          width: 22,
          opacity: 0.38,
          points: [
            { x: 380, y: 275, pressure: 0.5 },
            { x: 520, y: 275, pressure: 0.5 },
            { x: 670, y: 275, pressure: 0.5 },
          ],
          pageIndex: 0,
          createdAt: Date.now() - 3600000,
        },
        // Hand-drawn fountain pen annotation circling NMDA-R
        {
          id: 'stroke-pen-1',
          tool: 'pen',
          style: 'fountain',
          color: '#dc2626', // crimson red
          width: 3.5,
          opacity: 0.95,
          points: [
            { x: 510, y: 760, pressure: 0.3 },
            { x: 550, y: 755, pressure: 0.6 },
            { x: 585, y: 775, pressure: 0.8 },
            { x: 580, y: 805, pressure: 0.7 },
            { x: 535, y: 810, pressure: 0.5 },
            { x: 505, y: 785, pressure: 0.3 },
            { x: 512, y: 762, pressure: 0.4 },
          ],
          pageIndex: 0,
          createdAt: Date.now() - 3400000,
        },
        // Handwritten arrow pointing to NMDA-R
        {
          id: 'stroke-arrow-hand',
          tool: 'pen',
          style: 'ballpoint',
          color: '#dc2626',
          width: 2.5,
          opacity: 0.95,
          points: [
            { x: 620, y: 730, pressure: 0.5 },
            { x: 590, y: 765, pressure: 0.6 },
          ],
          pageIndex: 0,
          createdAt: Date.now() - 3300000,
        },
      ],
      shapes: [
        {
          id: 'shape-box-1',
          shapeType: 'rectangle',
          startX: 230,
          startY: 775,
          endX: 670,
          endY: 880,
          color: '#2563eb',
          width: 2,
          pageIndex: 0,
          createdAt: Date.now() - 3000000,
        },
      ],
      textNotes: [
        {
          id: 'text-1',
          pageIndex: 0,
          x: 620,
          y: 710,
          content: '★ Must know for Midterm: NMDA requires BOTH depolarization + Glutamate!',
          fontSize: 14,
          color: '#dc2626',
          isBold: true,
          width: 240,
        },
      ],
      stickyNotes: [
        {
          id: 'sticky-1',
          pageIndex: 0,
          x: 680,
          y: 200,
          width: 200,
          height: 160,
          color: 'yellow',
          content: 'Dr. Martinez emphasized: APV is the selective antagonist used in lab assays to block LTP induction.',
          isCollapsed: false,
        },
        {
          id: 'sticky-2',
          pageIndex: 1,
          x: 660,
          y: 220,
          width: 210,
          height: 150,
          color: 'green',
          content: 'Mg2+ block acts as a voltage sensor! Negative inside pulls it in; positive pushes it out.',
          isCollapsed: false,
        },
      ],
      audioNotes: [
        {
          id: 'audio-1',
          pageIndex: 0,
          x: 100,
          y: 200,
          title: 'Prof. Martinez on CaMKII Autophosphorylation',
          durationSeconds: 42,
          createdAt: Date.now() - 7200000,
        },
      ],
      bookmarks: [
        {
          id: 'bm-1',
          pageIndex: 0,
          title: 'Synapse Structure',
          color: '#0284c7',
          createdAt: Date.now() - 86400000,
        },
        {
          id: 'bm-2',
          pageIndex: 1,
          title: 'NMDA Coincidence Detector',
          color: '#dc2626',
          createdAt: Date.now() - 86400000,
        },
        {
          id: 'bm-3',
          pageIndex: 2,
          title: 'Cornell Mechanism Map',
          color: '#16a34a',
          createdAt: Date.now() - 86400000,
        },
      ],
      flashcards: [
        {
          id: 'fc-1',
          pageIndex: 0,
          question: 'What two simultaneous conditions are required for NMDA receptor channel opening?',
          answer: '1. Glutamate binding to the receptor.\n2. Membrane depolarization (~ -30 mV) to dislodge the Mg2+ pore block.',
          tags: ['Neuroscience', 'LTP', 'Receptors'],
          easeFactor: 2.5,
          intervalDays: 1,
          repetitions: 1,
          dueDate: Date.now() - 1000,
        },
        {
          id: 'fc-2',
          pageIndex: 0,
          question: 'What is the downstream kinase activated by Ca2+ influx that drives early LTP expression?',
          answer: 'CaMKII (Calcium/Calmodulin-dependent protein kinase II), which autophosphorylates and inserts AMPA receptors into the postsynaptic membrane.',
          tags: ['Neuroscience', 'Signaling'],
          easeFactor: 2.6,
          intervalDays: 3,
          repetitions: 2,
          dueDate: Date.now() - 1000,
        },
        {
          id: 'fc-3',
          pageIndex: 1,
          question: 'What drug is the classic competitive antagonist for NMDA receptors?',
          answer: 'APV (or AP5; (2R)-amino-5-phosphonovaleric acid).',
          tags: ['Pharmacology'],
          easeFactor: 2.4,
          intervalDays: 2,
          repetitions: 1,
          dueDate: Date.now() + 86400000,
        },
      ],
    };
  }

  return {
    strokes: [],
    shapes: [],
    textNotes: [],
    stickyNotes: [],
    audioNotes: [],
    bookmarks: [],
    flashcards: [],
  };
}
