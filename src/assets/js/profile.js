const API = '/api/v1';

/**
 * Call the API and return the parsed body, throwing on a non-2xx response
 * @param {string} path
 * @param {RequestInit} [init]
 */
async function api(path, init = {}) {
    const resp = await fetch(`${API}${path}`, { credentials: 'include', ...init });
    const json = await resp.json();
    if (!resp.ok) {
        throw Object.assign(new Error(json.error ?? 'Request failed'), { status: resp.status });
    }
    return json;
}

/**
 * Ellipsize the middle of long credential IDs
 * @param {string} id
 * @returns {string}
 */
function truncateId(id) {
    const divider = '...';
    const keep = 12;
    if (id.length <= divider.length + keep * 2) {
        return id;
    }
    return `${id.slice(0, keep)}${divider}${id.slice(-keep)}`;
}

/**
 * Render transports like a JSON array, with a space after each comma
 * @param {string[] | null} transports
 * @returns {string}
 */
function transportsToUIString(transports) {
    return `[${(transports ?? []).map((transport) => `"${transport}"`).join(', ')}]`;
}

document.addEventListener('alpine:init', () => {
    Alpine.data('profile', () => ({
        loading: true,
        username: '',
        credentials: [],
        errorText: '',
        async init() {
            try {
                const session = await api('/session');
                if (!session.username) {
                    // Not signed in, so there's nothing to show
                    window.location.replace('/');
                    return;
                }
                this.username = session.username;
                await this._loadCredentials();
            } catch (err) {
                this.errorText = `Could not load credentials: ${err.message}`;
            }
            this.loading = false;
        },
        async _loadCredentials() {
            const { credentials } = await api('/credentials');
            this.credentials = credentials;
        },
        truncateId,
        transportsToUIString,
        /**
         * @param {{ deviceType: string, isDiscoverable: boolean | null, backedUp: boolean }} cred
         * @returns {string}
         */
        describe(cred) {
            const kind = cred.deviceType === 'multiDevice' ? 'synced' : 'device-bound';
            if (cred.isDiscoverable === null) {
                return `${kind} credential of unknown discoverability`;
            }
            return `${kind} ${cred.isDiscoverable ? 'passkey' : 'non-discoverable credential'}`;
        },
        /** @param {{ id: string }} cred */
        async remove(cred) {
            this.errorText = '';
            try {
                await api(`/credentials/${encodeURIComponent(cred.id)}`, { method: 'DELETE' });
                await this._loadCredentials();
            } catch (err) {
                this.errorText = `Could not delete credential: ${err.message}`;
            }
        },
        async logout() {
            try {
                await api('/logout', { method: 'POST' });
            } catch (err) {
                this.errorText = `Could not sign out: ${err.message}`;
                return;
            }
            window.location.href = '/';
        },
    }));
});
