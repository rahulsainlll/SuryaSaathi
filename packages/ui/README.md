# @suryasaathi/ui

Shared [HeroUI v3](https://heroui.com) theme, tokens and components for `apps/web` and `apps/console`.

- `theme.css` imports Tailwind CSS v4 and `@heroui/styles`, then overrides HeroUI's theme variables
  (solar saffron accent, diagnosis colours). Dark mode follows HeroUI: `.dark` or `data-theme="dark"`.
- `tokens.ts` exposes the same values to TypeScript (charts, canvas).
- `src/components` holds small shared components built on HeroUI, including `<Logo>`.
- `brand/` holds the brand files: the logo (`suryasaathi-logo.svg`, and
  `suryasaathi-logo-dark.svg` for the dark theme), the mark on its own, the favicon
  (`favicon.svg`, `favicon.ico`) and the app icon (SVG, and PNGs at 180, 192 and 512 px).
  `src/brand.ts` exposes them to the apps: `brandIcons` for `metadata.icons` and
  `brandManifest()` for `app/manifest.ts`.

The package ships TypeScript source; apps compile it via `transpilePackages` in `next.config.ts`.

```css
/* app/globals.css */
@import "@suryasaathi/ui/theme.css";
```

```tsx
import { DiagnosisChip, Logo, brandIcons, brandManifest } from "@suryasaathi/ui";
```
