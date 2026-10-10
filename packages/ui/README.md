# @suryasaathi/ui

Shared [HeroUI v3](https://heroui.com) theme, tokens and components for `apps/web` and `apps/console`.

- `theme.css` imports Tailwind CSS v4 and `@heroui/styles`, then overrides HeroUI's theme variables
  (solar saffron accent, diagnosis colours). Dark mode follows HeroUI: `.dark` or `data-theme="dark"`.
- `tokens.ts` exposes the same values to TypeScript (charts, canvas).
- `src/components` holds small shared components built on HeroUI.

The package ships TypeScript source; apps compile it via `transpilePackages` in `next.config.ts`.

```css
/* app/globals.css */
@import "@suryasaathi/ui/theme.css";
```

```tsx
import { BrandMark, DiagnosisChip } from "@suryasaathi/ui";
```
