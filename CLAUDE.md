# CLAUDE.md

Educational SPA — virtual museum **«Эпоха перемен» (1991–2022)**. UI and all narration
content are in **Russian**; keep that in mind when editing strings or writing TTS-related code.

## Commands

```bash
npm install
npm run dev      # Vite dev server, default port 5173
npm run build    # tsc -b && vite build (strict typecheck included)
npm run preview  # serve dist/

# Manual typecheck (no emit) — fast and what CI would use
npx tsc -b --noEmit
```

**Port conflict on this machine:** another `node` process holds `localhost:5173`.
Use `npm run dev -- --port 5180 --strictPort` if `5173` is taken (script `dev:5180`
not added by design — keep the default for fresh installs).

There is **no test runner** configured. Validation = `tsc -b --noEmit` + a manual
walk-through in the browser (Home → Hall → each excursion → quiz).

## Architecture

```
src/
├── App.tsx                Routes: / /hall /about /excursion/:id /excursion/:id/quiz
├── main.tsx               BrowserRouter + React 18 createRoot
├── content/               Excursion data — single source of truth for all text
│   ├── types.ts           Excursion / SlideStop / Source / QuizQuestion types
│   ├── excursion1.ts      1991–1999  (5 stops, 5 quiz, 16 sources)
│   ├── excursion2.ts      2000–2008  (4 stops, 5 quiz, 12 sources)
│   ├── excursion3.ts      2008–2022  (6 stops, 6 quiz, 14 sources)
│   └── index.ts           export const excursions; museum metadata
├── pages/                 Route components, each wrapped in PageTransition
├── components/            Header / Footer / Layout / AnimatedHeading / NarrationControls
├── three/                 React-Three-Fiber scenes (lazy-loaded)
│   ├── TimelineScene.tsx  ⭐ main excursion visual — Catmull-Rom curve + nodes
│   ├── PortalScene.tsx    Hero landing background
│   └── Artifact.tsx       Legacy per-stop artifacts (currently unused, kept for ref)
├── hooks/useNarration.ts  Two-engine TTS: Web Speech + Piper VITS
├── store/progress.ts      Zustand + persist (visitedStops, quizResults, XP, badges)
├── utils/ttsNormalize.ts  Russian text → spoken words (years, dates, %, ranges)
└── styles/index.css       Tailwind layers + .num-display / .num-mono / .num-marker
```

## Critical gotchas

### 1. TTS numbers MUST go through `normalizeForTTS`

Off-the-shelf engines (both Web Speech and Piper VITS) read `1991` as
*«один девять девять один»*. Always pipe through `normalizeForTTS()` from
`src/utils/ttsNormalize.ts` before handing text to any speech engine.
The normalizer handles: years (nominative + genitive in dates), day
ordinals, percentages, decimals, thousand separators, date ranges, `№`,
`≈`, em/en dashes, and strips footnote markers `[N]`.

Tests: `npx tsx /tmp/test-tts2.mjs` (ad-hoc samples — see git history for
the script). When in doubt, add new cases there before changing the regex
order in `normalizeForTTS`.

### 2. Hook-order trap in ExcursionPage

`ExcursionPage.tsx` derives `nodes`, `totalNodes`, `stage` from `excursion`,
**but `excursion` may be `undefined`** (bad URL). All hooks (`useState`,
`useMemo`, `useEffect`) must run **before** the `if (!excursion) return …`
guard — otherwise React throws «rendered fewer hooks». See the layout at
the top of that file.

### 3. Zustand selectors must return stable references

Earlier the store had `badges: () => string[]` and `totalXp: () => number`
methods called as `useProgress(s => s.badges())`. This created a new array
every render → infinite loop with `useSyncExternalStore`. Now derivations
live as **pure functions** + tiny hooks (`useBadgeList`, `useTotalXp`)
that subscribe to the raw `visitedStops` / `quizResults` maps. **Never
re-introduce method selectors that return new objects.**

### 4. Piper VITS — lazy & external

`@diffusionstudio/vits-web` is dynamically imported only when the user
switches to «Студийный» voice (`useNarration.ts → speakPiper`). The
ONNX runtime and ~60 MB voice models are fetched from CDN /
HuggingFace and cached in OPFS — first run is slow, subsequent runs
are offline-friendly. Do **not** statically import this package or its
voices.

### 5. Vite chunking is intentional

`vite.config.ts → manualChunks` splits `three`, `r3f` (drei/fiber),
and `motion` (gsap/framer-motion) into separate chunks. Keep big libs
in their groups when adding new deps so the initial JS payload
(currently ~102 KB gzipped) doesn't balloon.

### 6. 3D scenes & reduced motion

Both `TimelineScene` and `PortalScene` are wrapped in `lazy()` and a
`<Suspense fallback>`. Inside, expensive effects (particles, pulse
animation) check `reducedMotion`. When adding visuals, route them
through that flag — keyboard / a11y users must not get a flashing
scene.

### 7. Content footnotes

Every narration paragraph in `content/excursion*.ts` ends references
with `[N]` markers that map to entries in `excursion.sources`. UI
renders these as `<sup>` in `ExcursionPage`, TTS strips them via
`normalizeForTTS`. Source numbering is **per-excursion** and must
match — adding a paragraph cite means also adding the source row.

### 8. Camera follows the curve, not nodes

`TimelineScene → CameraFollow` interpolates `currentT` along the
Catmull-Rom curve (`curve.getPointAt(t)`), not directly between
node positions. This makes «Дальше» feel like flying along the
timeline. Don't replace with `positions[i]` lerp — UX regressed
visibly when that happened.

## Code style

- TypeScript strict; no `any` without justification
- Tailwind + custom utilities (`.glass`, `.btn-primary/ghost`, `.chip`,
  `.heading-serif`, `.num-display/mono/marker`)
- Russian copy uses typographic quotes «…», em-dash —, NBSP between
  number and unit. The TTS normalizer expects these characters
- Fonts: **Cormorant Garamond** for display headings (serif),
  **Inter** for body and numerals with `tabular-nums`, **JetBrains
  Mono** for dates/codes (class `num-mono`)
- Animations: GSAP for char-by-char headings (`AnimatedHeading.tsx`),
  Framer Motion for route + element transitions

## Adding a new excursion / stop / quiz question

1. Edit `src/content/excursionN.ts` — add a `SlideStop` (id, subtopic,
   title, date, accent, artifact, narration[], caption, exhibitNote)
2. Append matching numbered entries to `excursion.sources` and reference
   them with `[N]` inside narration paragraphs
3. Add quiz questions to `excursion.quiz` (4 options, `correctIndex`,
   `explanation`)
4. Years used in `date` are auto-extracted by `ExcursionPage` for the
   timeline label — keep at least one 4-digit year per date
5. Run `npx tsc -b --noEmit` — `Excursion` shape is strict

## Browser notes

- Web Speech voices vary wildly between OS/browsers. On macOS the
  hook prefers Premium/Enhanced Russian voices automatically; on
  Linux desktop browsers often have only robotic eSpeak — Piper VITS
  is the fallback that always sounds good
- OPFS (Origin Private File System) is required for Piper voice
  caching — works in modern Chromium and Firefox; Safari requires
  iOS 15.2+ / macOS 15.2+
- WebGL context loss happens occasionally when HMR rebuilds R3F
  Canvas — R3F restores automatically, ignore the console line
