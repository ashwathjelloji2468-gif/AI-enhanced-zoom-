# DESIGN.md — Connect (Zoom Clone)

This file is the single source of truth for visual and interaction design
on this project. Read this before generating or modifying any UI. If a
prompt asks for something that conflicts with a rule here, follow this
file unless the prompt explicitly says to override it.

---

## 1. Mission

Connect is a video-calling product cloned from Zoom's core functionality,
then extended with AI features Zoom doesn't have (or gates behind
host-only permissions). The design goal is **not** to look like Zoom —
it's to feel calmer, faster, and more considered than Zoom, while matching
its functional behavior exactly. Every screen should read as deliberate,
not templated. If a component looks like a generic SaaS/AI-app default
(centered white card, purple-to-blue gradient, emoji-heavy empty states),
it's wrong — rebuild it against the tokens below instead.

---

## 2. Brand

- **Name:** Connect
- **Personality:** calm, precise, quietly confident. Not playful, not
  corporate-cold. Think "a well-made tool," not "a startup pitching you."
- **Signature motif:** the "signal" — concentric pulse rings representing
  a call connecting. Used in `ConnectionSignal` (auth branding panel) and
  echoed in smaller pulse indicators elsewhere (recording dot, speaking
  indicator). Don't introduce a second unrelated motif (no abstract blobs,
  no line-art icons of cameras/phones as decoration) — everything
  decorative should trace back to this one idea.
- **Audience:** teams who want a fast, no-bloat alternative to Zoom, with
  meeting intelligence (summaries, in-call AI) that doesn't require a
  paid tier or host gatekeeping.

---

## 3. Style foundations

### 3.1 Color

```js
// tailwind.config.ts — theme.extend.colors
colors: {
  brand: {
    DEFAULT: "#4F9DDE",
    hover:   "#3D8BCC",
    light:   "#7FB8E8",
    subtle:  "#EAF3FC",
    text:    "#2E6DA4",   // use for brand-colored TEXT on light backgrounds — passes AA, brand.DEFAULT does not
  },
  surface: {
    DEFAULT: "#FFFFFF",
    sunken:  "#F8FAFC",
    raised:  "#FFFFFF",
    border:  "#E2E8F0",
  },
  dark: {
    bg:      "#0B0E1A",
    surface: "#12162A",
    border:  "rgba(255,255,255,0.10)",
    tile:    "#1A2036",
  },
  ink: {
    DEFAULT: "#0F172A",
    muted:   "#64748B",
    faint:   "#94A3B8",   // meta/timestamps ONLY — fails AA for body text
    inverse: "#F8FAFC",
    "inverse-muted": "#94A3B8",
  },
  success: { DEFAULT: "#16A34A", subtle: "#F0FDF4" },
  warning: { DEFAULT: "#D97706", subtle: "#FFFBEB" },
  danger:  { DEFAULT: "#DC2626", subtle: "#FEF2F2", hover: "#B91C1C" },
  info:    { DEFAULT: "#4F9DDE", subtle: "#EAF3FC" },
  live:    "#EF4444",
}
```

**Rule:** the video room (`/meeting/[meetingId]`) is always dark
(`dark.*` tokens), regardless of any future light/dark mode toggle on the
rest of the app. Landing, auth, and dashboard are always light
(`surface.*`/`ink.*`). Don't let these bleed into each other.

### 3.2 Typography

```js
fontFamily: {
  display: ["var(--font-display)", "sans-serif"], // Space Grotesk — headings, brand moments
  sans:    ["var(--font-sans)", "sans-serif"],     // Inter — everything else
  mono:    ["var(--font-mono)", "monospace"],      // JetBrains Mono — codes, timestamps, IDs
}
```

| Token | Mobile | Desktop | Weight | Use |
|---|---|---|---|---|
| `text-display-lg` | 32px/1.15 | 56px/1.1 | 500 | Landing hero H1 only |
| `text-display-md` | 24px/1.2 | 32px/1.2 | 500 | Page titles, section headings |
| `text-display-sm` | 20px/1.3 | 24px/1.3 | 500 | Card/dialog titles |
| `text-body-lg` | 16px/1.6 | 18px/1.6 | 400 | Lead paragraphs |
| `text-body` | 14px/1.6 | 15px/1.6 | 400 | Default body text |
| `text-body-sm` | 13px/1.5 | 13px/1.5 | 400 | Secondary/meta text |
| `text-caption` | 12px/1.4 | 12px/1.4 | 500 | Labels, badges, timestamps |

Never introduce a font size outside this table. If something needs to be
bigger, move it up a token, don't invent a one-off value.

### 3.3 Spacing, radius, touch targets

- Spacing: Tailwind default 4px scale, no custom overrides.
- Radius: `sm` 6px (inputs, small buttons) · `md` 10px (cards, dialogs) ·
  `lg` 16px (hero panels) · `full` (pills, avatars, control-bar buttons).
- **Every tappable element is minimum 44x44px on mobile/tablet**, even if
  the visible icon is smaller — pad the hit area, don't shrink the target.

### 3.4 Motion

- Panel slide-ins (chat, ask-ai, mobile sheets): `duration-200 ease-out`.
- Hover states: `duration-150 ease-out`, opacity/background only — never
  animate width/height on hover.
- Status pulses (recording dot, speaking indicator): CSS animation, not
  JS. These stay active even under `prefers-reduced-motion` since they're
  status indicators, not decoration. Everything else respects that media
  query.

---

## 4. Accessibility (non-negotiable, not a nice-to-have)

- Keyboard-reachable, visible focus ring on every interactive element
  (`focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2`).
  Never ship `outline-none` without replacing it with an equally visible
  alternative.
- Every icon-only button needs `aria-label`.
- Color is never the only signal — pair it with text or an icon/shape
  change (recording banner uses red *and* text; speaking indicator uses a
  ring *and* a dot).
- Text contrast: 4.5:1 minimum for body text, 3:1 for large text (18px+,
  or 14px+ bold). `ink.faint` is borderline (~2.9:1) — meta text only,
  never anything the user must read to complete a task.

---

## 5. Responsive rules

Breakpoints: Tailwind defaults (`sm` 640 / `md` 768 / `lg` 1024 / `xl` 1280).
Design mobile-first — base styles are mobile, override up.

| Surface | Mobile (<768) | Tablet (768–1024) | Desktop (≥1024) |
|---|---|---|---|
| Landing nav | Hamburger → slide-down menu | Inline nav | Inline nav |
| Dashboard nav | Bottom tab bar (4 icons) | Sidebar, icon-only | Sidebar, full labels |
| New Meeting dialog | Bottom sheet (slide up, full width) | Centered modal | Centered modal |
| Video grid | 1 dominant tile + horizontal filmstrip | Grid, capped at 2 cols | Grid, up to 4 cols |
| Chat / Ask-AI panel | Full-screen overlay | Side panel, 240px | Side panel, 288px |
| Control bar | 44px touch targets; overflow rare actions behind "More" | Standard | Standard |
| Screen share | Full-screen spotlight + bottom filmstrip | Spotlight + side filmstrip | Spotlight + side filmstrip |

---

## 6. Voice & writing tone

- Direct, unfussy, no forced enthusiasm. "Start recording?" not "Ready to
  capture the magic? 🎉"
- Error messages state what happened and what to do, no blame, no
  exclamation marks: "Couldn't find that meeting." not "Oops! Something
  went wrong!"
- Empty states are calm, not cute: "No meetings yet. Create one to get
  started." not "It's quiet here... 👀"
- Consent/legal-adjacent copy (recording banner, consent dialog) is
  plain and complete — no minimizing legal weight for the sake of a
  friendlier tone.

---

## 7. Do / Don't

**Do:**
- Reuse the signal-pulse motif for any new "live/active" indicator.
- Keep the video room dark and everything else light — no exceptions
  without updating this file first.
- Build new panels (any future slide-out) off the existing `ChatPanel`
  shell pattern for consistency, not a new one-off layout.
- Check every new color pairing against the contrast rules in §4 before
  shipping it.

**Don't:**
- Don't introduce a second accent color. `brand` is the only saturated
  color in the light-mode UI; everything else is ink/surface neutrals or
  semantic (success/warning/danger).
- Don't use gradients as decoration (the one exception: the very subtle
  radial glow behind the landing hero and auth branding panel — that's
  it, don't add more).
- Don't default to centered-white-card-with-shadow for new surfaces
  without checking whether the split-panel or full-bleed pattern already
  used elsewhere fits better.
- Don't use emoji as functional icons in production UI (fine as
  placeholder icon text during prototyping, but flag for real icon
  replacement — e.g. lucide-react — before considering a screen done).

---

## 8. Reference components (already built — match these, don't diverge)

- `components/auth/ConnectionSignal.tsx` — the pulse-ring motif, canonical version
- `components/landing/MeetingPreviewMock.tsx` — how to represent "the product" visually without a literal screenshot
- `components/video/RecordingBanner.tsx` — pattern for status banners (color + text + icon, never color alone)
- `components/dashboard/MeetingCard.tsx` — pattern for list-item cards with status badges
- `components/video/ControlBar.tsx` — pattern for icon-button groups with active/inactive states.
