# CAR SERVICE 06 — MEDIA PIPELINE

## Source directories

```text
/carservice/tools/flyers
/carservice/tools/3d
```

## Required inventory

For every asset record:

- filename
- type
- dimensions
- duration if video
- FPS if video
- codec
- file size
- texture size
- triangle count for 3D
- material count
- texture count
- source/license if known
- intended role
- mobile suitability
- quality concerns

## Known assets

### Environment

`rogland_clear_night_4k.exr`

Treat as an environment resource, not as a texture to duplicate indiscriminately.

Provide:

- desktop quality path
- mobile-safe path
- fallback

### Before/after

`ScreenRecording_09-16-2026 22-57-08_1`

First inspect technically.

Then determine whether it supports:

- scrub
- masked reveal
- split comparison
- linear playback
- spatial integration

Do not build the final interaction before seeing the actual content.

## Media rules

Never load every heavy asset immediately.

Prioritize:

1. first viewport
2. first narrative transition
3. imminent next scene
4. deferred catalogue assets

## Video

Provide:

- poster
- loading state
- error fallback
- mobile strategy
- reduced-motion strategy

## 3D

Optimize before runtime use.

Possible operations:

- remove unused objects
- reduce texture resolution
- compress textures
- reduce polygon density where visually safe
- merge static geometry where appropriate
- lazy-load secondary scenes

Do not reduce quality blindly.

## External assets

External assets may be used for prototype exploration, but provenance should be recorded internally.

Never confuse prototype sourcing with commercial production rights.
