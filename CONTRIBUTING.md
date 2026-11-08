# Contributing to BUPC Navi

Thanks for helping people find their way around BU Polangui! There are three ways to help, from easiest to most involved.

## 1. Report a problem (no coding)
Open the app, tap a place, then **Report an issue**. Or open a [new issue](../../issues/new/choose) and choose:
- **Wrong or missing place:** a wrong name, missing office, wrong floor
- **Route problem:** the route goes through a wall or fence, or takes a strange detour
- **Bug / Feature request**

A photo of the building's signage helps a lot.

## 2. Fix campus data (edit a text file)
All campus knowledge lives in [`data/overrides/places.yaml`](data/overrides/places.yaml). You can edit it directly on GitHub (pencil icon), which creates a pull request for you.

Example: naming an unidentified building and adding rooms.

```yaml
bldg-a11:
  osm: way/551347998
  name: ICT Building            # what the signage says
  shortName: ICT
  category: academic
  aliases: [computer building, cs building]
  departments: [Computer Studies Department]
  floors: 2
  rooms:
    - { code: CL1, name: Computer Lab 1, floor: 1, type: lab }
    - { code: CL2, name: Computer Lab 2, floor: 2, type: lab }
  verified: true
  source: [survey:2026-11-20]
```

**Rules:**
- **Never change an existing `id`** (the key, like `bldg-a11`). Links and QR codes depend on it. Change the `name` instead.
- Set `verified: true` only if you checked it **in person**. Add `survey:<date>` to `source`.
- Plain text only, no HTML.
- CI will check your edit automatically. If it fails, the message tells you what's wrong.

**Map geometry** (building shapes, paths) comes from OpenStreetMap. To fix a shape or add a footpath, edit [OpenStreetMap](https://www.openstreetmap.org/relation/13027320) directly (free account) and our weekly sync will pick it up. For urgent fixes, add a line to `data/overrides/paths.geojson`.

## 3. Contribute code
```bash
git clone https://github.com/<owner>/bupc-navi.git
cd bupc-navi
npm install
npm run data:build   # builds public/data from data/
npm run dev          # http://localhost:5173
npm test
```
- Branch: `feat/…`, `fix/…`, `data/…`, `docs/…`
- Commits: [Conventional Commits](https://www.conventionalcommits.org/)
- Reference requirement IDs from the [SRS](docs/02-srs.md) in your PR, e.g. "Implements FR-SRC-02"
- Meet the [Definition of Done](docs/09-roadmap.md#definition-of-done-every-feature)

## Licensing of contributions
- **Code** contributions are licensed under Apache 2.0.
- **Data** contributions (anything in `data/`) are licensed under the **ODbL 1.0**, the same as OpenStreetMap, so they can flow back to OSM.
- **Photos:** only your own photos, licensed CC BY-SA 4.0, credited in `photo.credit`.

## Code of conduct
Be kind and constructive. Harassment of any kind isn't tolerated. Maintainers may remove content or contributors that violate this.
