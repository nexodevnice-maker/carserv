# CAR SERVICE 06 — VALIDATION PROTOCOL

## Rule

No phase is considered valid because the code compiles.

Validation means inspecting the running experience.

## Gate 1 — Source

- [ ] all flyers inspected
- [ ] all 3D assets inventoried
- [ ] all video metadata measured
- [ ] HDRI inspected
- [ ] unknown assets marked

## Gate 2 — Runtime

- [ ] application starts
- [ ] no broken imports
- [ ] no fatal console errors
- [ ] scene registry works
- [ ] media registry works
- [ ] normalized progress works

## Gate 3 — Visual

- [ ] hero/arrival has immediate identity
- [ ] camera feels directed
- [ ] transformation is legible
- [ ] transitions are motivated
- [ ] typography belongs to the composition
- [ ] rental section does not become a generic card grid
- [ ] no accidental visual collisions

## Gate 4 — Interaction

- [ ] forward scroll
- [ ] reverse scroll
- [ ] fast scroll
- [ ] jump navigation
- [ ] keyboard
- [ ] visible focus
- [ ] reduced motion

## Gate 5 — Responsive

Desktop:
- [ ] composition
- [ ] typography
- [ ] video
- [ ] WebGL

Mobile:
- [ ] composition rebuilt intentionally
- [ ] video readable
- [ ] no excessive motion
- [ ] no overflow
- [ ] acceptable GPU/memory behavior

## Gate 6 — Performance

- [ ] controlled DPR
- [ ] no unnecessary RAF
- [ ] textures reasonable
- [ ] media progressive
- [ ] WebGL disposal verified
- [ ] no obvious memory growth
- [ ] loading remains acceptable

## Gate 7 — 30-second test

Watch only the first 30 seconds.

Questions:

- Does it immediately feel automotive?
- Does it feel premium without clichés?
- Is transformation apparent?
- Is there curiosity to continue?
- Does it feel specific to CAR SERVICE 06?

If not, correct before expanding.

## Gate 8 — AI-smell test

Search the visual result for:

- generic hero
- oversized text
- gradients
- glow
- glassmorphism
- generic cards
- predictable fade-ins
- stock-luxury composition
- decorative 3D

Remove anything that weakens identity.

## Final scorecard

IMMERSION       PASS / FAIL
CINEMATOGRAPHY  PASS / FAIL
ART DIRECTION   PASS / FAIL
SCROLL          PASS / FAIL
WEBGL           PASS / FAIL
VIDEO           PASS / FAIL
RESPONSIVE      PASS / FAIL
PERFORMANCE     PASS / FAIL
ACCESSIBILITY   PASS / FAIL
SEO             PASS / FAIL
AI SMELL        PASS / FAIL

Then list the five largest remaining defects.
