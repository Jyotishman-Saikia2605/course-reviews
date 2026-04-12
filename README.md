# HU course reviews (static site)

Unofficial aggregated humanities course feedback from Google Form exports. The site only lists courses in [`data/offerings.json`](data/offerings.json) (your current-semester allowlist).

## Prerequisites

- **Node.js 20+** and npm (for the frontend)
- **Python 3** with `pandas` and `openpyxl` (for regenerating data from Excel)

```bash
py -3 -m pip install -r requirements.txt
```

## Update data from spreadsheets

Place exports as:

- `data/BSW-HUL-Course-Feedback-Responses.xlsx`
- `data/HSS-Courses-Review-Responses.xlsx`

Then run:

```bash
npm run import
```

On Linux or macOS, either change the `import` script in `package.json` to use `python3`, or run `python3 tools/import_reviews.py` directly.

This writes [`public/data/reviews.json`](public/data/reviews.json). **Commit that file** if you deploy without running Python on the host (recommended for Netlify/Vercel free tiers).

## Local development

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Production build

```bash
npm run build
npm run preview
```

Output is in `dist/`, including `/data/reviews.json` copied from `public/`.

## Go live

### Netlify

- New site → import the Git repo.
- Build command: `npm run build`
- Publish directory: `dist`
- [`netlify.toml`](netlify.toml) includes an SPA fallback so `/course/HUL212` works on refresh.

### Vercel

- New project → import the Git repo.
- Framework preset: **Vite** (or set build command to `npm run build`, output `dist`).
- [`vercel.json`](vercel.json) adds a fallback rewrite for client-side routes.

If you **do not** run `npm run import` in CI, commit an up-to-date `public/data/reviews.json` after each spreadsheet change.

## Privacy

The import script does **not** copy respondent name or entry number from the BSW sheet into `reviews.json`.
