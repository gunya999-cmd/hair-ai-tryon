# AI pipeline v0.1

## Goal

Change hairstyle only while preserving identity, face geometry, expression, skin tone, lighting, and background.

## MVP provider approach

Use external GPU provider first: Replicate, Fal, or RunPod.

## Prompt template

```text
Change hairstyle only to: {{style}}.
Keep the exact same person, face, identity, facial expression, skin tone, age, lighting, camera angle, background and clothing.
Realistic natural hair, fitted to head shape, correct hairline, correct shadows.
Do not change eyes, nose, mouth, jaw, face proportions or background.
```

## Negative prompt

```text
changed identity, different person, distorted face, extra face, bad hairline, wig look, unrealistic hair, blurry, low quality, changed background, changed clothes
```

## Production-quality pipeline later

1. Face detection / landmarks: MediaPipe Face Mesh or InsightFace.
2. Hair/head mask: segmentation model.
3. Inpainting mask: existing hair + safe scalp region.
4. Identity lock: InstantID / IP-Adapter FaceID.
5. Control: face pose, depth, edges.
6. Generate 4-8 variants per request.
7. Store outputs in R2.
8. Use swipe feedback to reorder future styles.
