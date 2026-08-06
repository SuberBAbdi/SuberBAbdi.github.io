# Deploying your portfolio to GitHub Pages

This is a single-file site (`index.html` — HTML, CSS and JS all included, no build step needed).

## Option A — User site (recommended): `suberbabdi.github.io`

1. On GitHub, create a **new repository** named exactly: `SuberBAbdi.github.io`
   (must match your username exactly, including case doesn't matter but spelling does).
2. Upload `index.html` to the root of that repo (drag-and-drop on the GitHub web UI works, or via git — see below).
3. Go to the repo's **Settings → Pages**. GitHub will usually auto-detect and publish from the `main` branch, root folder.
4. Wait ~1 minute, then visit **https://suberbabdi.github.io** — your site is live.

## Option B — Project site (if you'd rather keep it under an existing repo)

1. Push `index.html` to any repo, e.g. `portfolio`.
2. Settings → Pages → set source to the `main` branch, `/ (root)` folder.
3. Site will be live at `https://suberbabdi.github.io/portfolio/`.

## Pushing via git (either option)

```bash
git clone https://github.com/SuberBAbdi/SuberBAbdi.github.io.git
cd SuberBAbdi.github.io
# copy index.html into this folder
git add index.html
git commit -m "Add portfolio site"
git push
```

## Notes / things you may want to tweak

- **Contact**: your CV didn't list an email address, so the footer currently only links to GitHub and LinkedIn. Add a `mailto:` link in the footer if you'd like an email option — I intentionally left your phone number off the public site for privacy; add it only if you're comfortable with it being public.
- **Projects**: add real GitHub repo links to the project cards (`<a href="...">`) once those repos are public, so visitors can view the code.
- **Colors/fonts**: all design tokens are defined at the top of the `<style>` block (`:root`), so you can retheme easily without touching layout code.
