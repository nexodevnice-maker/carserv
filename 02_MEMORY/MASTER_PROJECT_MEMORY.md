# CAR SERVICE 06 — MASTER PROJECT MEMORY

## Identity

Name: CAR SERVICE 06

## Source-derived visual direction

The supplied cleaning flyer uses a predominantly dark automotive environment with yellow/gold premium accents and white information.

The rental flyer introduces a black/red automotive visual language.

These source differences must be resolved deliberately rather than mechanically combining every color.

## Experience thesis

The strongest differentiator for the site should be the visible transformation of the vehicle.

The before/after material is therefore strategically important.

## Existing engineering knowledge

The project may reuse validated patterns from the MECA RIVIERA project where appropriate:

- normalized scroll progression
- explicit scene states
- intentional camera choreography
- responsive media
- progressive loading
- controlled DPR
- cleanup/disposal
- reduced-motion path
- browser-based visual QA

These are engineering patterns, not a visual template.

## Current known media

`rogland_clear_night_4k.exr`

Candidate environment.

`ScreenRecording_09-16-2026 22-57-08_1`

Supplied before/after video.

The actual technical properties must be recorded in the media inventory after inspection.

## Current architectural intention

One experience state controls:

- camera
- WebGL
- video
- DOM
- transitions

Avoid isolated component-level scroll timelines that fight each other.

## Known risks

- overusing 3D
- making the rental section look like pricing cards
- mixing the flyer color systems without art direction
- making the experience too similar to MECA RIVIERA
- using the before/after video as a passive embedded rectangle
- loading oversized HDR/media assets without progressive strategy
- mobile becoming a degraded desktop
