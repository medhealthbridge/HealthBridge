import { CODE_BY_KEY, isPatientRight, isPrimary, isUpper, kindOf, positionOf, rootCount, type ToothState } from "@/src/lib/dental-chart";

/**
 * One tooth, drawn as a shaded illustration (crown and roots) in the frontal view a paper dental chart uses.
 * Drawn crown-up (as a lower tooth) and flipped for upper teeth, so every row shares one occlusal line.
 * Findings are painted on the tooth itself: decay and fillings on their surfaces, crowns over the crown,
 * root canals down the roots, an implant screw in place of roots, a ghost outline where a tooth is missing.
 */

/** Drawing height: every tooth in a row shares it, so crowns line up on one occlusal line. */
export const glyphHeight = (tooth: number) => (isPrimary(tooth) ? 84 : 118);

type Size = { width: number; crown: number; rootEnd: number };

/** Mesio-distal width, crown height and root tip, in chart units. Baby teeth are smaller with shorter roots. */
export function glyphSize(tooth: number): Size {
  const kind = kindOf(tooth);
  const position = positionOf(tooth);
  const upper = isUpper(tooth);
  if (isPrimary(tooth)) {
    const width = kind === "molar" ? (position === 5 ? 34 : 28) : kind === "canine" ? 22 : upper ? (position === 1 ? 24 : 20) : 18;
    return { width, crown: kind === "molar" ? 32 : 35, rootEnd: kind === "molar" ? 74 : 80 };
  }
  const width =
    kind === "molar" ? [0, 0, 0, 0, 0, 0, 46, 43, 39][position] :
    kind === "premolar" ? 31 :
    kind === "canine" ? 29 :
    upper ? (position === 1 ? 32 : 26) : (position === 1 ? 22 : 23);
  const crown = kind === "molar" ? 44 : kind === "premolar" ? 45 : kind === "canine" ? 49 : 48;
  const rootEnd = kind === "canine" ? 116 : kind === "incisor" ? 108 : kind === "premolar" ? 108 : 104;
  return { width, crown, rootEnd };
}

function crownPath(kind: string, W: number, C: number) {
  const x = (f: number) => (f * W).toFixed(2);
  const y = (f: number) => (f * C).toFixed(2);
  const neck = `Q ${x(0.5)} ${C + 3} `;
  switch (kind) {
    case "incisor":
      return `M ${x(0.2)} ${C} C ${x(0.06)} ${y(0.7)} ${x(0.03)} ${y(0.25)} ${x(0.09)} 3 Q ${x(0.5)} -1.5 ${x(0.91)} 3 C ${x(0.97)} ${y(0.25)} ${x(0.94)} ${y(0.7)} ${x(0.8)} ${C} ${neck}${x(0.2)} ${C} Z`;
    case "canine":
      return `M ${x(0.22)} ${C} C ${x(0.05)} ${y(0.7)} ${x(0.04)} ${y(0.36)} ${x(0.18)} ${y(0.2)} Q ${x(0.36)} ${y(0.06)} ${x(0.5)} 0 Q ${x(0.64)} ${y(0.06)} ${x(0.82)} ${y(0.2)} C ${x(0.96)} ${y(0.36)} ${x(0.95)} ${y(0.7)} ${x(0.78)} ${C} ${neck}${x(0.22)} ${C} Z`;
    case "premolar":
      return `M ${x(0.2)} ${C} C ${x(0.02)} ${y(0.7)} ${x(0.02)} ${y(0.3)} ${x(0.15)} ${y(0.13)} Q ${x(0.32)} -0.5 ${x(0.5)} 1 Q ${x(0.68)} -0.5 ${x(0.85)} ${y(0.13)} C ${x(0.98)} ${y(0.3)} ${x(0.98)} ${y(0.7)} ${x(0.8)} ${C} ${neck}${x(0.2)} ${C} Z`;
    default:
      return `M ${x(0.14)} ${C} C ${x(0.01)} ${y(0.72)} ${x(-0.01)} ${y(0.3)} ${x(0.07)} ${y(0.12)} Q ${x(0.17)} -0.5 ${x(0.3)} 1.5 Q ${x(0.41)} 3.2 ${x(0.5)} 5 Q ${x(0.59)} 3.2 ${x(0.7)} 1.5 Q ${x(0.83)} -0.5 ${x(0.93)} ${y(0.12)} C ${x(1.01)} ${y(0.3)} ${x(0.99)} ${y(0.72)} ${x(0.86)} ${C} ${neck}${x(0.14)} ${C} Z`;
  }
}

/** Grooves and cusp ridges that make the crown read as a tooth rather than a blob. */
function crownDetail(kind: string, W: number, C: number) {
  const x = (f: number) => (f * W).toFixed(2);
  if (kind === "molar") return `M ${x(0.5)} 6 C ${x(0.48)} ${C * 0.35} ${x(0.52)} ${C * 0.6} ${x(0.5)} ${C * 0.8} M ${x(0.24)} 4 Q ${x(0.22)} ${C * 0.4} ${x(0.27)} ${C * 0.7} M ${x(0.76)} 4 Q ${x(0.78)} ${C * 0.4} ${x(0.73)} ${C * 0.7}`;
  if (kind === "premolar") return `M ${x(0.5)} 3 Q ${x(0.47)} ${C * 0.4} ${x(0.5)} ${C * 0.75}`;
  if (kind === "canine") return `M ${x(0.5)} 2 Q ${x(0.46)} ${C * 0.45} ${x(0.5)} ${C * 0.85}`;
  return `M ${x(0.36)} 4 Q ${x(0.34)} ${C * 0.4} ${x(0.38)} ${C * 0.75} M ${x(0.64)} 4 Q ${x(0.66)} ${C * 0.4} ${x(0.62)} ${C * 0.75}`;
}

function rootPaths(roots: number, W: number, C: number, R: number) {
  const x = (f: number) => (f * W).toFixed(2);
  const L = R - C;
  const top = C - 3;
  if (roots === 1) {
    return { behind: null as string | null, front: `M ${x(0.2)} ${top} C ${x(0.2)} ${C + L * 0.38} ${x(0.37)} ${R - 7} ${x(0.5)} ${R} C ${x(0.63)} ${R - 7} ${x(0.8)} ${C + L * 0.38} ${x(0.8)} ${top} Z`, tips: [0.5] };
  }
  const split = C + L * 0.24;
  const front = `M ${x(0.15)} ${top} C ${x(0.1)} ${C + L * 0.42} ${x(0.17)} ${R - 11} ${x(0.29)} ${R} C ${x(0.38)} ${R - 7} ${x(0.42)} ${C + L * 0.52} ${x(0.5)} ${split} C ${x(0.58)} ${C + L * 0.52} ${x(0.62)} ${R - 7} ${x(0.71)} ${R} C ${x(0.83)} ${R - 11} ${x(0.9)} ${C + L * 0.42} ${x(0.85)} ${top} Z`;
  const behind = roots === 3 ? `M ${x(0.36)} ${top} C ${x(0.35)} ${C + L * 0.45} ${x(0.43)} ${R - 4} ${x(0.51)} ${R + 1} C ${x(0.59)} ${R - 4} ${x(0.65)} ${C + L * 0.45} ${x(0.64)} ${top} Z` : null;
  return { behind, front, tips: roots === 3 ? [0.29, 0.51, 0.71] : [0.29, 0.71] };
}

const STROKE = "rgba(70, 55, 35, 0.45)";

export function ToothGlyph({ tooth, state, className }: { tooth: number; state: ToothState | undefined; className?: string }) {
  const { width: W, crown: C, rootEnd: R } = glyphSize(tooth);
  const kind = kindOf(tooth);
  const upper = isUpper(tooth);
  const roots = rootCount(tooth);
  const { behind, front, tips } = rootPaths(roots, W, C, R);
  const crown = crownPath(kind, W, C);
  const missing = !!state?.missing && !state.implant;
  // Mesial faces the midline: the viewer's right for teeth on the patient's right.
  const mesialRight = isPatientRight(tooth);
  const color = (code: string) => CODE_BY_KEY.get(code)?.color ?? "#999";

  const spot = (surface: string, fill: string, stroke: string, kindOfMark: "fill" | "ring" = "fill") => {
    const at: Record<string, [number, number, number, number]> = {
      O: [W / 2, kind === "molar" ? 6.5 : 5, W * 0.27, 3.6],
      B: [W / 2, C * 0.55, W * 0.17, C * 0.17],
      L: [W / 2, C * 0.55, W * 0.24, C * 0.24],
      M: [mesialRight ? W * 0.85 : W * 0.15, C * 0.5, W * 0.09, C * 0.22],
      D: [mesialRight ? W * 0.15 : W * 0.85, C * 0.5, W * 0.09, C * 0.22],
    };
    const [cx, cy, rx, ry] = at[surface] ?? at.O;
    return kindOfMark === "ring"
      ? <ellipse key={`${surface}${fill}`} cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={stroke} strokeWidth={1.6} strokeDasharray="2.5 1.8" />
      : <ellipse key={`${surface}${fill}`} cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} stroke={stroke} strokeWidth={0.8} />;
  };
  // Lingual can't be seen from the front, so it is drawn as a dashed ring.
  const marks = (surfaces: string, fill: string, stroke: string) => surfaces.split("").map((s) => spot(s, fill, stroke, s === "L" ? "ring" : "fill"));

  const body = (
    <g opacity={missing ? 0.22 : state?.impacted ? 0.8 : 1} strokeDasharray={missing ? "3 2.5" : undefined}>
      {/* Roots, or the implant screw that replaces them */}
      {state?.implant ? (
        <g>
          <path d={`M ${W * 0.36} ${C - 2} L ${W * 0.64} ${C - 2} L ${W * 0.6} ${R - 14} L ${W * 0.5} ${R - 4} L ${W * 0.4} ${R - 14} Z`} fill="url(#tc-metal)" stroke="rgba(30,41,59,.5)" strokeWidth={0.8} />
          {Array.from({ length: Math.floor((R - C - 14) / 6) }, (_, i) => (
            <line key={i} x1={W * 0.33} x2={W * 0.67} y1={C + 4 + i * 6} y2={C + 1 + i * 6} stroke="rgba(30,41,59,.55)" strokeWidth={1.2} />
          ))}
        </g>
      ) : (
        <>
          {behind && <path d={behind} fill="url(#tc-root-back)" stroke={STROKE} strokeWidth={0.7} />}
          <path d={front} fill="url(#tc-root)" stroke={STROKE} strokeWidth={0.8} />
          {state?.rct && tips.map((t) => <path key={t} d={`M ${W / 2} ${C - 4} Q ${W * ((t + 0.5) / 2)} ${(C + R) / 2} ${W * t} ${R - 5}`} fill="none" stroke={color("rct")} strokeWidth={2.2} strokeLinecap="round" />)}
          {state?.lesion && tips.slice(0, 1).map((t) => <circle key="lesion" cx={W * (roots === 1 ? 0.5 : t)} cy={R - 1} r={6.5} fill={color("periapical")} fillOpacity={0.55} stroke={color("periapical")} strokeWidth={1} />)}
        </>
      )}
      {/* Crown */}
      <path d={crown} fill="url(#tc-enamel)" stroke={STROKE} strokeWidth={0.8} />
      <path d={crownDetail(kind, W, C)} fill="none" stroke="rgba(120,100,70,.28)" strokeWidth={0.9} strokeLinecap="round" />
      <ellipse cx={W * 0.36} cy={C * 0.42} rx={W * 0.13} ry={C * 0.26} fill="url(#tc-shine)" />
      {state?.crown && <path d={crown} fill="url(#tc-gold)" fillOpacity={0.88} stroke="#a16207" strokeWidth={0.9} />}
      {state?.bridge && (
        <>
          <path d={crown} fill={color("bridge")} fillOpacity={0.35} stroke={color("bridge")} strokeWidth={1} />
          <rect x={-3} y={C * 0.42} width={W + 6} height={4} rx={2} fill={color("bridge")} fillOpacity={0.8} />
        </>
      )}
      {state?.veneer && <path d={crown} fill="#ffffff" fillOpacity={0.55} stroke="#94a3b8" strokeWidth={1} />}
      {state && marks(state.sealant, color("sealant"), "#15803d")}
      {state && marks(state.filling, color("filling"), "#0369a1")}
      {state && marks(state.watch, "none", color("watch"))}
      {state && marks(state.caries, "#57190f", "#dc2626")}
      {state?.fracture && <polyline points={`${W * 0.58},1 ${W * 0.44},${C * 0.3} ${W * 0.6},${C * 0.5} ${W * 0.46},${C * 0.78}`} fill="none" stroke={color("fracture")} strokeWidth={1.8} strokeLinejoin="round" />}
      {state?.mobile && (
        <g stroke={color("mobility")} strokeWidth={1.4} fill="none" strokeLinecap="round">
          <path d={`M -2 ${C * 0.3} Q -6 ${C * 0.55} -2 ${C * 0.8}`} />
          <path d={`M ${W + 2} ${C * 0.3} Q ${W + 6} ${C * 0.55} ${W + 2} ${C * 0.8}`} />
        </g>
      )}
    </g>
  );

  const pad = 7;
  const H = glyphHeight(tooth);
  return (
    <svg viewBox={`${-pad} -4 ${W + pad * 2} ${H + 6}`} className={className} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <g transform={upper ? `translate(0 ${H - 2}) scale(1 -1)` : undefined}>
        <g transform={state?.impacted ? `rotate(${isPatientRight(tooth) ? 16 : -16} ${W / 2} ${R * 0.6})` : undefined}>{body}</g>
        {missing && <path d={`M ${W * 0.2} ${C * 0.2} L ${W * 0.8} ${C * 0.85} M ${W * 0.8} ${C * 0.2} L ${W * 0.2} ${C * 0.85}`} stroke="#94a3b8" strokeWidth={1.6} strokeLinecap="round" />}
      </g>
    </svg>
  );
}

/** Shared gradients for every tooth on the page. Render once per chart. */
export function ToothGlyphDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="tc-enamel" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#cfc8b8" />
          <stop offset="0.22" stopColor="#ece6da" />
          <stop offset="0.45" stopColor="#fdfbf6" />
          <stop offset="0.7" stopColor="#efe9de" />
          <stop offset="1" stopColor="#bfb7a4" />
        </linearGradient>
        <linearGradient id="tc-root" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#bba887" />
          <stop offset="0.4" stopColor="#e8dcc0" />
          <stop offset="0.55" stopColor="#f1e7cf" />
          <stop offset="1" stopColor="#b8a37d" />
        </linearGradient>
        <linearGradient id="tc-root-back" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#a8936e" />
          <stop offset="0.5" stopColor="#cdbd9a" />
          <stop offset="1" stopColor="#a08a64" />
        </linearGradient>
        <linearGradient id="tc-gold" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#a16207" />
          <stop offset="0.4" stopColor="#facc15" />
          <stop offset="0.55" stopColor="#fef08a" />
          <stop offset="1" stopColor="#a16207" />
        </linearGradient>
        <linearGradient id="tc-metal" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#64748b" />
          <stop offset="0.45" stopColor="#e2e8f0" />
          <stop offset="1" stopColor="#475569" />
        </linearGradient>
        <radialGradient id="tc-shine">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}
