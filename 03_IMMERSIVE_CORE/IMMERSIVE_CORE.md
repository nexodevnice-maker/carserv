# IMMERSIVE CORE — CAR SERVICE 06

## Purpose

This document defines reusable engineering principles for immersive web experiences.

It does not define the visual identity of CAR SERVICE 06.

## Core model

```text
INPUT
 ↓
SMOOTH / NORMALIZED PROGRESS
 ↓
MASTER EXPERIENCE STATE
 ↓
CAMERA + MEDIA + WEBGL + DOM
 ↓
COMPOSITE EXPERIENCE
```

## Scroll

Scroll is a temporal control system.

It may control:

- camera position
- camera target
- focal length / FOV
- media playback position
- object visibility
- spatial reveals
- DOM typography
- transitions

Avoid:

```text
scroll → random animations
```

Prefer:

```text
scroll → progress → deterministic scene state
```

## Camera

Camera paths should use intentional curves.

A camera move should have:

- anticipation
- acceleration
- controlled deceleration
- destination
- visual subject

Avoid arbitrary axis movement.

## Media

Every major media asset requires:

- preload policy
- poster/fallback
- responsive treatment
- mobile policy
- disposal/cleanup where applicable
- loading/error state

## WebGL

WebGL is justified when it provides:

- spatial depth
- occlusion
- controlled camera traversal
- physically meaningful interaction
- material/light behavior unavailable or inferior in ordinary DOM

Do not use WebGL merely to display a static car.

## Transitions

A transition should be motivated by the subject.

CAR SERVICE 06 candidate transition languages:

- water
- foam
- reflections
- darkness/light
- pressure
- surface transformation
- vehicle movement

## Performance

Required:

- controlled DPR
- progressive loading
- lazy loading
- texture discipline
- responsive asset selection
- cleanup
- no unnecessary render loops
- no uncontrolled allocations

## Accessibility

Reduced motion is not an afterthought.

The non-animated experience must preserve the complete information hierarchy.

Keyboard focus must remain visible and logical.

## Responsive

Desktop, tablet and mobile may share the same narrative state model while using different spatial implementations.

## Failure modes

Reject:

- animation accumulation
- multiple competing scroll controllers
- camera jitter
- uncontrolled RAF loops
- oversized textures
- WebGL resources never disposed
- video continuously decoding when not needed
- visual state that cannot be reconstructed from progress
