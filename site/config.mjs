// Where the site and the repository live. Change these when the repository moves.
export const REPO = 'sgdiachenko/gm-ai-marketplace-angular-nestjs';
export const BRANCH = 'main';
export const GITHUB = `https://github.com/${REPO}`;
// GitHub Pages serves a project site under /<repository>/. Pages link to each other with relative
// paths, so only 404.html, which GitHub serves at any depth, needs this absolute prefix.
export const BASE_PATH = '/gm-ai-marketplace-angular-nestjs/';
export const SITE_URL = `https://sgdiachenko.github.io${BASE_PATH}`;
// The first Claude Code releases with the one-step install (docs/installing.md): `/plugin install
// <plugin> --marketplace <repo>` in a session, and `claude plugin install … --marketplace` in a shell.
export const MIN_CLAUDE_CODE = '2.1.275';
export const MIN_CLAUDE_CODE_SHELL = '2.1.292';
// Which file in site/i18n/ holds the UI strings.
export const LOCALE = 'en';
