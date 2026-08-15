# Low-end / perf notes (T5.8)

Cloud Agent environment: Linux + Chromium (Playwright 1.62). No physical low-end laptop.

## 2D fallback

- Forced via `?lowperf=1` (and `?mode=2d`).
- E2E `e2e/studio-flow.spec.ts` opens `/dev/flip?lowperf=1`, asserts 2D copy, flips to spread 2.
- CSS 3D remains the default; 2D is a first-class slide/crossfade (D3). No WebGL.

## Landing (AT-9)

- Playwright `e2e/at9-lazy-index.spec.ts` and the activation spec: no request for `/data/cards-index.json` on `/`.
- Starter binder cards are embedded display URLs. Images use `loading="lazy"`.

## Lighthouse

Not run. `lighthouse` is not on the approved dependency list (architecture §2). Jacob can run it locally on the landing URL; the AT-9 e2e is the automated stand-in.

## CPU 6× throttle

Not asserted. Architecture D21: frame-timing tests in parallel Playwright projects cause false jank. No isolated perf project was added. The auto-degrade probe still exists in `renderMode.ts` (`avg > 22ms` or 25% of frames `> 28ms`).
