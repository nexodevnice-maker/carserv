# CAR SERVICE 06 — PROJECT ARCHITECTURE V1

## 1. Objective

Build a premium immersive demonstration site for CAR SERVICE 06, using the real supplied flyers and the local media/3D corpus as the source of truth.

This is a sector demo intended to prove what can be created for this profession. It must feel like a deliberately art-directed digital experience, not a generic car-wash template.

## 2. Source-of-truth hierarchy

1. Supplied CAR SERVICE 06 flyers
2. Local assets in `/carservice/tools/3d`
3. Existing immersive engineering lessons validated on MECA RIVIERA
4. External references only for inspiration or missing generic assets
5. Never invent facts

The two flyers currently establish:
- CAR SERVICE 06
- premium/professional vehicle cleaning
- interior + exterior cleaning
- premium finishing / shine
- professional products
- service advertised across the 06
- a rental offer with a Toyota C-HR
- rental price points shown on the flyer: 70€/day, 400€/7 days, 700€/15 days
- insurance included
- unlimited mileage
- hybrid
- comfort & safety
- availability 7/7
- Instagram handle `car_service06`

Claims such as exact availability, geography, pricing, or conditions must remain tied to the supplied source material and must not be expanded without evidence.

## 3. Recommended technical base

Prefer the proven MECA-style engineering base:
- Astro
- TypeScript
- native browser scroll
- one normalized scroll-progress system
- Three.js only where spatial rendering has a real purpose
- no library added merely for visual effect
- responsive media
- reduced-motion path
- aggressive cleanup and GPU discipline

Do not introduce GSAP/Lenis/React Three Fiber automatically. Add a dependency only when an actual measured requirement justifies it.

## 4. Architectural layers

```text
src/
├── experience/
│   ├── ExperienceShell.ts
│   ├── experience-config.ts
│   ├── scene-registry.ts
│   └── experience-state.ts
│
├── motion/
│   ├── progress.ts
│   ├── easing.ts
│   ├── camera-path.ts
│   ├── scene-state.ts
│   └── reduced-motion.ts
│
├── camera/
│   ├── CameraRig.ts
│   ├── camera-presets.ts
│   └── camera-curves.ts
│
├── media/
│   ├── media-registry.ts
│   ├── video-controller.ts
│   ├── image-sequence.ts
│   ├── preload-policy.ts
│   └── fallbacks.ts
│
├── webgl/
│   ├── WebGLStage.ts
│   ├── materials/
│   ├── objects/
│   ├── environment/
│   └── disposal.ts
│
├── scenes/
│   ├── arrival/
│   ├── transformation/
│   ├── detailing/
│   ├── interior/
│   ├── rental/
│   └── transition/
│
├── property/
│   └── car-service-data.ts
│
├── ui/
│   ├── Header.ts
│   ├── ProgressIndicator.ts
│   ├── SceneCaption.ts
│   ├── CTA.ts
│   └── accessibility/
│
├── content/
│   ├── brand.ts
│   ├── cleaning.ts
│   └── rental.ts
│
└── styles/
    ├── tokens.css
    ├── typography.css
    ├── experience.css
    └── responsive.css
```

The exact framework-specific folder layout may differ, but the responsibilities must remain separated.

## 5. Core state model

Use ONE normalized progression:

```text
scroll input
    ↓
normalized progress [0..1]
    ↓
master scene state
    ├── camera
    ├── media
    ├── WebGL
    ├── DOM
    └── scene transitions
```

Avoid independent scroll systems per component.

## 6. Scene grammar

Initial candidate sequence, subject to inspection of the new media:

```text
0.00 — ARRIVAL
0.10 — WATER / FOAM / MATERIAL
0.25 — TRANSFORMATION
0.42 — DETAIL / FINISH
0.58 — INTERIOR
0.72 — REVEAL
0.84 — RENTAL
0.94 — ACTION
1.00 — NEXT CHAPTER
```

These are placeholders, not final timings.

The final rhythm must be determined from the actual supplied video and assets.

## 7. Candidate cinematic scenes

### A. THE WASH
A vehicle emerges into a dark premium detailing environment. Water/foam is a physical transition language, not a decorative particle effect.

### B. TRANSFORMATION
Use the supplied before/after video as evidence of the actual service. The experience should make the transformation perceptible rather than merely display a video card.

### C. SURFACE / FINISH
Macro material language: reflections, water beads, paint, glass, wheel surfaces. Use only if supported by available media/assets.

### D. INTERIOR
A controlled camera passage through the cabin can demonstrate interior cleaning. Do not turn this into a generic showroom walkthrough.

### E. RENTAL REVEAL
The rental offer should be spatially revealed. Avoid a conventional pricing-card grid as the primary presentation.

### F. ROAD / 06
A territorial transition can exist only if the asset corpus supports it. Do not assert specific cities as service locations unless the source material confirms them.

## 8. Environment

`rogland_clear_night_4k.exr` is the supplied environment candidate.

Architecture must support:
- HDRI loading
- fallback environment
- intensity/exposure control
- mobile-safe resolution
- disposal
- progressive loading

Do not bake the HDRI into every scene. Treat it as an environment resource.

## 9. Supplied before/after video

`ScreenRecording_09-16-2026 22-57-08_1` is the supplied service before/after media.

The implementation must first inspect:
- exact duration
- dimensions
- codec/container
- frame rate
- whether it is screen-recorded or source video
- visual quality
- whether it can support scroll synchronization
- whether mobile needs a separate treatment

Do not decide the final role of the video before inspection.

## 10. Responsive architecture

Desktop:
- cinematic spatial composition

Tablet:
- reduced spatial complexity

Mobile:
- dedicated editorial/cinematic composition
- fewer expensive WebGL objects
- simplified camera
- carefully managed video
- preserved narrative order

Do not make mobile a scaled desktop.

## 11. Accessibility

Required:
- `prefers-reduced-motion`
- keyboard navigation
- visible focus
- semantic headings
- accessible buttons
- meaningful media alternatives
- readable experience without motion

## 12. Performance

Required from the beginning:
- progressive media loading
- poster/fallback
- responsive video
- compressed textures
- controlled DPR
- no unnecessary render loop
- disposal of WebGL resources
- cleanup of listeners/observers
- lazy loading outside the immediate narrative window

Target visual quality first, but never allow uncontrolled GPU/memory growth.

## 13. Data-driven model

Keep brand/service/rental data separate from rendering.

A new sector demo should eventually be able to reuse the engine while replacing:
- content
- assets
- scene registry
- camera choreography
- transition grammar
- visual tokens

The engine must not hard-code CAR SERVICE 06 assumptions.

## 14. Anti-patterns

Reject:
- hero + navbar + cards
- generic car wash template
- giant centered text over stock footage
- arbitrary gradients
- glassmorphism
- gratuitous 3D
- repeated fade-ins
- identical scene durations
- excessive parallax
- decorative particles with no narrative function
- pricing cards as the main experience
- copying MECA RIVIERA's visual identity

## 15. Validation gates

### Gate A — Source inspection
All files in `/carservice/tools/flyers` and `/carservice/tools/3d` inventoried and inspected.

### Gate B — Architecture
Application starts, no broken imports, scene registry works, media registry works, normalized progress works.

### Gate C — First vertical slice
Arrival → transformation → rental/action is navigable and visually coherent.

### Gate D — Visual QA
Desktop + mobile + reverse scroll + fast scroll + reduced motion.

### Gate E — Performance
Console clean, no uncontrolled memory/GPU growth, acceptable loading and runtime behavior.

Never treat `npm run build` as visual validation.
