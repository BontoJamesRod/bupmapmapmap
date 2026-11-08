/** GitHub repo URL for "Report it" links. Set by CI (VITE_REPO_URL); empty hides the links. */
export const REPO_URL: string = import.meta.env.VITE_REPO_URL ?? "";

/** Quick-pick chips shown when search is empty. */
export const POPULAR = ["registrar", "salceda-building", "canteen", "clinic", "gymnasium", "cesd"];

/** Users farther than this from the campus center are treated as off-campus. */
export const ON_CAMPUS_RADIUS_M = 350;
