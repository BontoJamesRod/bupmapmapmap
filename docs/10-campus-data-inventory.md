~~~~~~~~~~~~~~#~~~~~~~~~~~~~~ → **Technology Department** (`technology-department`) |→ **Waiting Shed** (`waiting-shed`), beside the CSC office |→ **Salceda West Wing** (`salceda-west-wing`), to confirm |→ **Entrepreneurship Department** (`entrepreneurship-department`) |→ **Entrepreneurship Annex** (`entrepreneurship-annex`) |→ **Salceda North Wing** (`salceda-north-wing`), to confirm |→ **NSTP Building** (`nstp-building`), behind the canteen |10 — Campus Data Inventory (BU Polangui)

| | |
|---|---|
| **Compiled** | 2026-11-07 |
| **Sources** | OpenStreetMap (snapshot saved in [`data/raw/osm-snapshot-2026-11-07.json`](../data/raw/osm-snapshot-2026-11-07.json)), official BU web pages, BU Libraries page |
| **Status** | Research only. **Nothing here is verified on site yet.** |

## 1. Campus facts

| Item | Value | Source |
|---|---|---|
| Official name | Bicol University Polangui Campus (BUPC) | BU website, OSM |
| Address | San Juan Street, Centro Occidental, Polangui, Albay | OSM, Wikipedia |
| Postal code | OSM says `4507`; Polangui is commonly listed as `4506`. **Verify.** | OSM |
| OSM boundary | Relation [13027320](https://www.openstreetmap.org/relation/13027320) | OSM |
| Bounding box | 13.29500–13.29764 N, 123.48329–123.48664 E (~290 m × 360 m) | OSM |
| Lot area (historical) | 17,899 m² set aside for the school | Wikipedia (PGCHS article) |
| History | Founded 1959 as the School for Philippine Craftsmen (RA 1900/1913); integrated into BU on 14 Dec 2000 | BU Libraries, Wikipedia |
| Library | Located on the **2nd floor, Salceda Building** | BU Libraries page |
| Main gate | East side, metal gate at 13.29545 N, 123.48661 E, beside the **BUPC Guard House** | OSM |
| Internal road | A loop road with a **roundabout** near the center (~13.29618 N, 123.48477 E) | OSM |

### Programs (from the official BU site; older listings in brackets)
BS Computer Science · BS Information Systems · BS Information Technology · BS Entrepreneurship · BS Nursing · Bachelor of Elementary Education · Bachelor of Technology and Livelihood Education · [BS Computer Engineering] · [BS Electronics Engineering] · [BS Electronics Technology]. The campus is also a TESDA training provider (automotive servicing, welding).

## 2. Buildings matched to a name (13 + 2)

OSM has named *points* placed beside building outlines. Each point was matched to the nearest outline, with the distance shown. Matches marked **?** are uncertain.

| Proposed id | Name (as tagged) | OSM building | Footprint | Match distance | Confidence |
|---|---|---|---|---|---|
| `nursing-department` | NURSING DEPARTMENT | way/551347954 | 2,388 m² (largest) | 2.5 m | High |
| `gymnasium` | GYMNASIUM | way/551347999 | 1,773 m² | inside | High |
| `cesd` | CESD = **Computer Studies & Engineering Dept.** | way/551347992 | 1,493 m² | inside | High (confirmed by directory) |
| `salceda-building` | SALCEDA BUILDING = **Education Dept.** (library 2F) | way/551347988 | 859 m² | 2.7 m | High (directory) |
| `dormstel` | DORMSTEL BUILDING | way/551347950 | 776 m² | inside | High |
| `administration-building` | ADMINISTRATION BUILDING | way/551347993 | 670 m² | 3.7 m | High |
| `electronics-technology-building` | ELECTRONICS TECHNOLOGY BUILDING | way/551347997 | 641 m² | 2.4 m | High |
| `automotive-building` | AUTOMOTIVE BUILDING | way/551347995 | 594 m² | 0.6 m | High |
| `center-for-student-services` | CENTER FOR STUDENT SERVICES | way/551347956 | 382 m² | 5.6 m | Medium |
| `rotc-rde-building` | Headquarters ROTC office **and** Research Development & Extension Office | way/551347996 | 372 m² | 1.2 m / 2.6 m | Medium (two offices, one building?) |
| `canteen` | BUP CANTEEN | way/551347951 | 263 m² | 1.0 m | High |
| `clinic` | MEDICAL AND DENTAL CLINIC (BU Health Services) | way/872167021 | 212 m² | 15.4 m | **Confirmed** by a student (2026-11-08): its own building with the clinic plus one vacant room |
| `registrar` | REGISTRAR | way/885477496 | 116 m² | 0.5 m | High |
| `guard-house` | BUPC Guard House | way/1369878385 | 29 m² | named way | High |
| `photocopy-shop` | Photocopy shop | way/1369878389 | 43 m² | named way | High |

## 2a. NSTP Orientation Directory map (received 2026-11-08)

A schematic campus directory poster from the BU Polangui NSTP orientation. It is not to scale and is **rotated about 45°**: the poster's "up" is the real **northwest**, and the "Entrance" at the bottom right is the east gate on San Juan St. With that rotation, every labeled building lines up with an OSM outline:

| Poster label | Poster position | OSM match |
|---|---|---|
| BUP Gymnasium | upper-left of roundabout | way/551347999 ✔ |
| Nursing Department (several green blocks) | upper-right | way/551347954 + likely bldg-a05 |
| Canteen | right above the roundabout | way/551347951 ✔ |
| Dormstel | top edge | way/551347950 ✔ |
| Entrepreneurship Dept. | above the Gym | likely bldg-a07 (maybe a08) |
| Technology Dept. | west edge, top | likely bldg-a11 (maybe a08) |
| BUPDMO | west edge | unknown: check |
| ROTC | west edge, at roundabout level | way/551347996 ✔ |
| Research & Development, Auxiliary, Supply Office | west edge | way/551347996 and/or Automotive way/551347995: check |
| Registrar | west edge, bottom | way/885477496 (+ maybe bldg-a12) |
| Computer Studies & Engineering Dept. | lower-left | way/551347992 (OSM "CESD") ✔ |
| Admin Building | below CS & Eng | way/551347993 ✔ |
| CSC / NSTP / Guidance Office | right below the roundabout | way/551347956 (OSM "Center for Student Services") ✔ |
| Clinic (not drawn on the poster; marked by a student) | below CSC/NSTP, left of Education | way/872167021 ✔ |
| Education Department (U-shape) | lower-right | Salceda way/551347988 + likely bldg-a06, bldg-a09 |
| Entrance | bottom-right | Main Gate node/12686508525 ✔ |

The poster also confirms the road layout: a central **roundabout**, a cross of roads through it, a loop road around the edge, and a **Y-fork** leading to the entrance.

## 3. Unidentified buildings (12 → 5)

Ordered north to south. On 2026-11-08 a student annotated the app's map (see 3a), which named 7 of them. The 5 still unknown are a01–a04 and a12.

| Placeholder id | OSM way | Footprint | Center (lat, lon) | Location hint |
|---|---|---|---|---|
| `bldg-a01` | 870877902 | 48 m² | 13.297437, 123.484118 | Far north corner, small |
| `bldg-a02` | 885456221 | 30 m² | 13.297422, 123.483969 | Far north corner, small |
| `bldg-a03` | 551347949 | 167 m² | 13.297192, 123.484288 | North of Dormstel |
| `bldg-a04` | 1369878386 | 71 m² | 13.296763, 123.484008 | West of Dormstel |
| `bldg-a05` | 870511318 | 356 m² | 13.296555, 123.484495 | ~~Between Gym and Nursing~~ → **NSTP Building** |
| `bldg-a06` | 551347989 | 413 m² | 13.296506, 123.485292 | ~~North of Salceda, east of Nursing~~ → part of **Salceda Building** (U-shape) |
| `bldg-a07` | 551347948 | 247 m² | 13.296497, 123.483932 | ~~West edge~~ → **Entrepreneurship Annex** |
| `bldg-a08` | 551347947 | 194 m² | 13.296338, 123.483825 | ~~West edge~~ → **Entrepreneurship Department** |
| `bldg-a09` | 551347987 | 466 m² | 13.296266, 123.485126 | ~~Center-east, beside the Student Services building~~ → part of **Salceda Building** (U-shape) |
| `bldg-a10` | 551347955 | 66 m² | 13.296119, 123.485140 | ~~Center-east, small (kiosk/CR?)~~ → **Waiting Shed** |
| `bldg-a11` | 551347998 | 757 m² | 13.295980, 123.483787 | ~~West side, near Electronics (**large: likely academic**)~~ → **Technology Department** |
| `bldg-a12` | 551347994 | 303 m² | 13.295179, 123.485136 | South, next to the Registrar |

The likely candidates for these are the **computer studies (CS/IS/IT)**, **education**, **entrepreneurship** and **engineering** buildings, comfort rooms, a stage, and storage or maintenance sheds.

## 3a. Student-annotated map (received 2026-11-08)

A student drew on a screenshot of the app. What it established:

- **Floors:** only the **Administration Building** and **Salceda Building** have 2 floors. Every other building has 1.
- **Hallways and walkways:** red lines = walkable hallways, short ticks = doors. The first pass traced the strokes directly. The student then asked for tidy, straight lines that follow each building's shape, so the data is now **declarative** (see docs/04 §5.1):
  - **Salceda** is one U-shaped building. Its two OSM wings (former a06 and a09) are merged in via `parts`, and its hallway is a U through the middle of the wings.
  - **CESD** is an upside-down U with a matching U hallway. **Nursing** and **Admin** get a straight centre hallway.
  - **Doors** are taken from where the sketch's lines met each building, then joined straight to the hallway and the nearest road.
- **Nursing** (2nd sketch) is built around an inner court used for tennis and badminton (`nursing-court`). Its hallway is a loop around that court.
- **Entrepreneurship Stalls** (`entrep-stalls`) run along the campus fence across the road from Salceda, and the **Photocopy Shop** is among them. OSM still has the photocopy shop near the gate, so that footprint is retired; fix it upstream in OSM.
- **Salceda open passage:** a walkway, possibly open stairs, through the gap between the main block and the north wing, from the road side into the building and the court.
- **Volleyball court** in the middle of the Salceda U (added as the `volleyball-court` area).
- **Open field** east of the Admin building (`campus-field`). The label on the sketch reads like "GPAS FIELD"; the real name still needs confirming.
- **Waiting shed** beside the CSC office (Center for Student Services) = bldg-a10.
- **NSTP Building** behind the canteen = bldg-a05.
- **Entrepreneurship:** the two west-edge buildings (a07, a08). **Technology Dept.** is the large west building (a11).

## 4. On-site survey checklist

Bring a phone with the OSM app (e.g. *StreetComplete* or *Every Door*) or this table printed.

**Per building (all 27):**
- [ ] Official name on the signage (photo)
- [ ] Common or nickname names students use → `aliases`
- [ ] Departments, offices and notable rooms with floor numbers
- [x] ~~Number of floors~~ Admin and Salceda: 2. All others: 1
- [ ] Main entrance location (stand at the door and record GPS), plus other entrances
- [ ] Stairs-only, or ramp available?

**Specific questions:**
- [x] ~~What does CESD stand for?~~ Computer Studies & Engineering Dept. (directory)
- [x] ~~Is the Clinic its own building?~~ Yes: clinic plus one vacant room (2026-11-08)
- [ ] Is **Salceda Building** the Education Department building? ~~Do the U-shape arms belong to it?~~ Yes, it is one U-shaped building (2026-11-08).
- [ ] What does **BUPDMO** stand for, and which building is it in?
- [x] ~~Which building is the Technology Dept. / Entrepreneurship?~~ Tech = a11, Entrep = a07 + a08 (2026-11-08)
- [ ] What is the field east of Admin called? (sketch reads "GPAS FIELD")
- [ ] Are **ROTC**, **RDE**, **Auxiliary** and **Supply Office** in one building (way/551347996)? Where is the **Automotive** building relative to them?
- [ ] Is the **Electronics Technology Building** part of the Technology Dept.?
- [ ] Is the Registrar (way/885477496) a separate structure, and is bldg-a12 part of it?
- [ ] What does **CSC** stand for (Central Student Council?)
- [ ] What are the small buildings near Dormstel (a01–a04) and between CSS and Education (a10)? CRs, stalls, storage?
- [ ] Are there other gates (pedestrian side gates)? Which are open, and at what hours?

**Paths:**
- [x] ~~Draw the hallways and walkways~~ First pass from the annotated map (2026-11-08). Still check: any shortcuts across the open areas?
- [ ] Note barriers: fences, locked gates, drainage canals, grass you're not allowed to cross.
- [ ] Mark stairs and ramps.

**Landmarks for instructions:**
- [ ] Flagpole, stage, statues, notable trees, the parking area, the waiting shed

When done, push names, entrances and footpaths **upstream to OpenStreetMap** too, so the data helps everyone (and the weekly sync keeps us aligned).

## 5. Sources
- OpenStreetMap: https://www.openstreetmap.org/relation/13027320 (© OpenStreetMap contributors, ODbL)
- BU Polangui (official): https://bicol-u.edu.ph/category/bu-polangui/
- BU Programs: https://bicol-u.edu.ph/programs/
- BU Libraries, Polangui: https://sites.google.com/bicol-u.edu.ph/buls/about-us/libraries/bu-polangui
- FindUniversity.ph program list: https://www.finduniversity.ph/universities/bicol-university-polangui/undergraduate-courses/
- Wikipedia, Polangui General Comprehensive High School: https://en.wikipedia.org/wiki/Polangui_General_Comprehensive_High_School
- Wikipedia, Bicol University: https://en.wikipedia.org/wiki/Bicol_University
