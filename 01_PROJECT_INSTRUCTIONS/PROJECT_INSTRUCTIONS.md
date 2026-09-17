# CAR SERVICE 06 — PROJECT INSTRUCTIONS

## 1. Project role

CAR SERVICE 06 is a sector demonstration project intended to show prospects what a premium immersive website could look like for an automotive cleaning/detailing and rental activity.

This is a demonstration project. Its quality must nevertheless be production-grade in engineering discipline.

## 2. Current source pillars

The supplied flyers establish two visible business pillars:

### Premium vehicle cleaning

- interior cleaning
- exterior washing
- premium finishing / long-lasting shine
- professional products
- vehicle/environment respect language

### Vehicle rental

The supplied rental flyer shows:

- Toyota C-HR
- 70€/day
- 400€/7 days
- 700€/15 days
- insurance included
- unlimited mileage
- hybrid
- comfort & safety
- availability 7/7

Do not expand these claims without source evidence.

## 3. Experience objective

The visitor should feel that a vehicle is:

ARRIVING → BEING TRANSFORMED → BECOMING DESIRABLE → BECOMING AVAILABLE

The website should feel closer to a cinematic automotive film than to a service catalogue.

## 4. Candidate narrative

The following is a working narrative, not a final locked storyboard:

ARRIVAL
→ WATER
→ FOAM
→ TRANSFORMATION
→ SURFACE / FINISH
→ INTERIOR
→ REVEAL
→ RENTAL
→ ACTION

Actual sequence and timing must be determined after inspecting the available media.

## 5. Supplied media

Current known assets include:

- `rogland_clear_night_4k.exr` — environment candidate
- `ScreenRecording_09-16-2026 22-57-08_1` — before/after service video

All files in `/carservice/tools/flyers` and `/carservice/tools/3d` are source material and must be inventoried before implementation.

## 6. First milestone

Do not build the full catalogue.

Build the smallest vertical slice capable of proving:

- atmosphere
- transformation
- cinematic scroll
- controlled camera movement
- media integration
- rental transition
- clear action

## 7. Architecture requirements

Separate responsibilities into:

- experience
- motion
- camera
- media
- webgl
- scenes
- content
- UI
- accessibility
- responsive
- QA

Use one normalized progression as the source of truth for scene state.

## 8. Mobile

Mobile is a different composition.

Do not simply scale the desktop scene down.

Reduce:

- spatial complexity
- expensive WebGL
- camera amplitude
- simultaneous visual layers

Preserve:

- narrative
- hierarchy
- transformation
- atmosphere
- action

## 9. Commercial integrity

The design may create desire, but the content must remain factual.

No invented testimonials, badges, certifications, statistics or claims.
