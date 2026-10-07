export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefixes a `public/` asset path with the deployment base path (e.g. `/vappino` on GitHub Pages). */
export function asset(path: string): string {
  return `${BASE_PATH}${path}`;
}
