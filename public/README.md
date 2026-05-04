# public/

Drop the official **koki.ai** brand assets here. The app reads them by relative path:

| File | Used by | Notes |
|---|---|---|
| `logo.png`     | (optional) `<KokiLogo>` if you swap to `<img>` | Full lockup, ≥ 1280×360 PNG |
| `logo.svg`     | (optional) | Vector copy of the wordmark |
| `paw.svg`      | KokiMark icon (favicon, tight slots) | Just the paw glyph |
| `favicon.png`  | Browser tab | 256×256 minimum |
| `og.png`       | Social share preview | 1200×630 |

The current build renders `<KokiLogo>` as a **pixel-faithful inline SVG** so it works
even when the PNG isn't shipped — but if you want the real PNG, drop it as
`public/logo.png` and switch `KokiLogo.tsx` to render `<img src="/logo.png">`.
