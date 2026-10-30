// Single source for the PyPI package details shown on the site (markup + clipboard).
// Bump RELEASE when a new version lands on https://pypi.org/project/stegguard/.
export const PACKAGE = "stegguard";
export const RELEASE = "0.4.0";
export const PYPI_URL = `https://pypi.org/project/${PACKAGE}/`;

// `extra` adds an optional dependency group, e.g. "images" pulls in Pillow.
export function pipInstall(extra?: string): string {
  if (extra === undefined) return `pip install ${PACKAGE}`;
  if (!/^[a-z0-9-]+$/.test(extra)) throw new Error(`invalid extra: ${JSON.stringify(extra)}`);
  // Quoted so zsh doesn't treat the brackets as a glob.
  return `pip install '${PACKAGE}[${extra}]'`;
}
