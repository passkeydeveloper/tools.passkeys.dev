// TEMPORARY: explains a Workers Builds "name must match the name of your Worker" failure.
//
// Wrangler compares the tag of the Worker named in wrangler.jsonc with the tag of the Worker the
// build is attached to (WRANGLER_CI_MATCH_TAG). This prints both, and the Worker in the account that
// owns the expected tag. Only names and IDs are printed, never tokens. It never fails the build.
import { readFileSync } from 'node:fs';

const expectedTag = process.env.WRANGLER_CI_MATCH_TAG;
if (!expectedTag) {
    // Not running in Workers Builds
    process.exit(0);
}

const log = (...args) => console.log('[ci-diagnostics]', ...args);

// Values that are safe to print; for everything else only the variable's name is listed
const SAFE = [
    'WRANGLER_CI_MATCH_TAG',
    'WORKERS_CI',
    'WORKERS_CI_BRANCH',
    'WORKERS_CI_COMMIT_SHA',
    'WORKERS_CI_BUILD_UUID',
    'CLOUDFLARE_ACCOUNT_ID',
    'WRANGLER_LOG',
];
const names = Object.keys(process.env).filter((name) => /^(WRANGLER|CLOUDFLARE|WORKERS)/.test(name));
for (const name of names.sort()) {
    log(name, SAFE.includes(name) ? `= ${process.env[name]}` : '(set)');
}

const workerName = JSON.parse(
    readFileSync('wrangler.jsonc', 'utf8').replace(/^\s*\/\/.*$/gm, '')
).name;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
log(`wrangler.jsonc name: ${workerName}; expected tag: ${expectedTag}`);

async function api(path) {
    const resp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const body = await resp.json();
    if (!resp.ok || !body.success) {
        throw new Error(`${path}: ${resp.status} ${JSON.stringify(body.errors)}`);
    }
    return body.result;
}

if (!accountId || !token) {
    log('CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN is not set in the build, so the API cannot be queried');
    process.exit(0);
}

try {
    const worker = await api(`/workers/services/${workerName}`);
    log(`tag of the Worker named ${workerName}: ${worker.default_environment.script.tag}`);
} catch (err) {
    log('Could not look up the Worker by name:', err.message);
}

try {
    const scripts = await api('/workers/scripts');
    for (const script of scripts) {
        const mark = script.tag === expectedTag ? '  <-- expected tag' : '';
        log(`Worker in account: ${script.id} (tag ${script.tag})${mark}`);
    }
    if (!scripts.some((script) => script.tag === expectedTag)) {
        log('No Worker in this account has the expected tag');
    }
} catch (err) {
    log('Could not list Workers:', err.message);
}
