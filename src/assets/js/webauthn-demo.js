const {
    browserSupportsWebAuthn,
    startRegistration,
    startAuthentication,
    browserSupportsWebAuthnAutofill,
} = SimpleWebAuthnBrowser;

// In local development the site is served by Eleventy on its own port, while the API (a separate
// project) runs under `wrangler dev` on :8787. Everywhere else the API is expected on the same
// origin as the site.
const API_ORIGIN =
    location.hostname === 'localhost' && location.port !== '8787' ? 'http://localhost:8787' : '';
const API = `${API_ORIGIN}/api/v1`;

/**
 * Turn an API error body into something readable. Failures are either `{ error: string }` or a
 * map of field name to a list of messages.
 * @param {Record<string, string | string[]>} body
 * @returns {string}
 */
function formatApiError(body) {
    if (typeof body.error === 'string') {
        return body.error;
    }
    return Object.entries(body)
        .map(([field, messages]) => `${field}: ${[].concat(messages).join(', ')}`)
        .join('; ');
}

/**
 * POST JSON to the API and return the parsed body, throwing on a non-2xx response
 * @param {string} path
 * @param {unknown} body
 */
async function postJSON(path, body) {
    const resp = await fetch(`${API}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        // The session cookie has to travel with cross-origin requests in local development
        credentials: 'include',
    });
    const json = await resp.json();
    if (!resp.ok) {
        throw new Error(formatApiError(json));
    }
    return json;
}

document.addEventListener('alpine:init', () => {
    Alpine.data('webauthnDemo', () => ({
        async init() {
            // Make sure WebAuthn is available in the browser
            this.webauthnSupported = browserSupportsWebAuthn();
            if (!this.webauthnSupported) {
                return;
            }

            // Only offer algorithms the server can actually verify
            try {
                const resp = await fetch(`${API}/capabilities`, { credentials: 'include' });
                const { algorithms } = await resp.json();
                this.pubKeyAlgs = this.pubKeyAlgs.filter((alg) => algorithms.includes(alg.value));
                this.options.regPubKeyAlgs = this.options.regPubKeyAlgs.filter((alg) =>
                    algorithms.includes(alg)
                );
            } catch (err) {
                // Without capabilities every algorithm stays offered; the server still validates
                console.error('Could not load server capabilities:', err);
            } finally {
                // The algorithm list renders once this is set so it starts out in the right state
                this.capabilitiesLoaded = true;
            }

            // Read options from query params if set
            if (location.search) {
                this.showAdvancedSettings = true;
                this._readOptionsFromQuery(new URLSearchParams(location.search));
            }

            // Update query parameters when options change
            this.$watch('options', () => {
                const newParams = new URLSearchParams(this.options);
                window.history.replaceState({}, '', `${location.pathname}?${newParams}`);
            });

            // Restore the remembered username, if one exists
            this.username = this._getUsername();

            // Restart conditional UI when auth UV setting changes
            this.$watch('options.authUserVerification', () => {
                this._startConditionalUI();
            });

            this._startConditionalUI();
        },

        // Default state
        webauthnSupported: true,
        showAdvancedSettings: false,
        capabilitiesLoaded: false,
        formAction: 'registration',
        options: {
            // Registration
            regUserVerification: 'preferred',
            attestation: 'none',
            attachment: 'all',
            discoverableCredential: 'preferred',
            regPubKeyAlgs: ['ed25519', 'es256', 'rs256'], // See `pubKeyAlgs` for possible values
            regHints: [],
            // Authentication
            authUserVerification: 'preferred',
            authHints: [],
        },
        username: '',
        alert: {
            show: false,
            alertClass: 'alert alert-success',
            text: '',
        },
        // Possible values for options.regHints and options.authHints
        hintOpts: [
            { label: 'Security Key', value: 'security-key' },
            { label: 'Client Device', value: 'client-device' },
            { label: 'Hybrid', value: 'hybrid' },
        ],
        // Possible values for options.regPubKeyAlgs (narrowed to server support in `init()`)
        pubKeyAlgs: [
            { label: 'ML-DSA 44', value: 'mldsa44' },
            { label: 'ML-DSA 65', value: 'mldsa65' },
            { label: 'ML-DSA 87', value: 'mldsa87' },
            { label: 'Ed25519', value: 'ed25519' },
            { label: 'ES256', value: 'es256' },
            { label: 'RS256', value: 'rs256' },
        ],
        // Possible values for options.regUserVerification and options.authUserVerification
        userVerificationOpts: [
            { label: 'Discouraged', value: 'discouraged' },
            { label: 'Preferred', value: 'preferred' },
            { label: 'Required', value: 'required' },
        ],
        // Possible values for options.attestation
        attestations: [
            { label: 'None', value: 'none' },
            { label: 'Direct', value: 'direct' },
        ],
        // Possible values for options.attachment
        attachments: [
            { label: 'All Supported', value: 'all' },
            { label: 'Cross-Platform', value: 'cross_platform' },
            { label: 'Platform', value: 'platform' },
        ],
        discoverableCredentialOpts: [
            { label: 'Discouraged', value: 'discouraged' },
            { label: 'Preferred', value: 'preferred' },
            { label: 'Required', value: 'required' },
        ],

        // Event handlers
        toggleDrawer() {
            this.showAdvancedSettings = !this.showAdvancedSettings;
        },
        hideAlert() {
            this.alert.show = false;
        },
        showSuccessAlert(text) {
            this.alert.alertClass = 'alert alert-success';
            this.alert.text = text;
            this.alert.show = true;
        },
        showErrorAlert(text) {
            this.alert.alertClass = 'alert alert-danger';
            this.alert.text = text;
            this.alert.show = true;
        },
        handleClickRegister() {
            this.formAction = 'register';
        },
        handleClickAuthenticate() {
            this.formAction = 'authenticate';
        },
        async handleSubmit() {
            this.hideAlert();

            try {
                if (this.formAction === 'register') {
                    await this._startRegistration();
                } else {
                    await this._startAuthentication(false);
                }
            } catch (err) {
                this.showErrorAlert(err.message);
            }
        },
        resetSettings() {
            this._resetUsername();
            // Reload the page sans query params
            window.location.href = location.pathname;
        },
        /** @param {OrderedCheckboxList} listEl */
        initRegPubKeyAlgsList(listEl) {
            listEl.items = this.pubKeyAlgs;
            listEl.value = this.options.regPubKeyAlgs;
        },
        /** @param {CustomEvent<OrderChangeEventDetail>} event */
        handleRegPubKeyAlgsOrderChange(event) {
            this.options.regPubKeyAlgs = event.detail.value;
        },
        /** @param {OrderedCheckboxList} listEl */
        initRegHintsList(listEl) {
            listEl.items = this.hintOpts;
            listEl.value = this.options.regHints;
        },
        /** @param {CustomEvent<OrderChangeEventDetail>} event */
        handleRegHintsOrderChange(event) {
            this.options.regHints = event.detail.value;
        },
        /** @param {OrderedCheckboxList} listEl */
        initAuthHintsList(listEl) {
            listEl.items = this.hintOpts;
            listEl.value = this.options.authHints;
        },
        /** @param {CustomEvent<OrderChangeEventDetail>} event */
        handleAuthHintsOrderChange(event) {
            this.options.authHints = event.detail.value;
        },
        /**
         * @param {string[]} list
         * @returns {string}
         */
        formatListOrder(list) {
            return JSON.stringify(list).replace(/,/g, ', ');
        },
        /** @param {InputEvent} event */
        handleSaveUsername(event) {
            this._saveUsername(event.target.value);
        },
        // Tips & Tricks Modal
        openTipsTricks() {
            document.getElementById('advanced-settings-tips-tricks').showModal();
        },
        closeTipsTricks() {
            document.getElementById('advanced-settings-tips-tricks').close();
        },

        // Internal Methods
        /** @param {URLSearchParams} params */
        _readOptionsFromQuery(params) {
            const pick = (key, allowed, fallback) => {
                const value = params.get(key);
                return allowed.some((opt) => opt.value === value) ? value : fallback;
            };

            this.options.regUserVerification = pick(
                'regUserVerification',
                this.userVerificationOpts,
                this.options.regUserVerification
            );
            this.options.attestation = pick('attestation', this.attestations, this.options.attestation);
            this.options.attachment = pick('attachment', this.attachments, this.options.attachment);
            this.options.discoverableCredential = pick(
                'discoverableCredential',
                this.discoverableCredentialOpts,
                this.options.discoverableCredential
            );
            this.options.authUserVerification = pick(
                'authUserVerification',
                this.userVerificationOpts,
                this.options.authUserVerification
            );

            // Ordered lists; ignore anything that isn't an option we offer (e.g. an algorithm
            // the server doesn't support)
            const readList = (key, allowed) => {
                const value = params.get(key);
                if (value === null) {
                    return null;
                }
                const validValues = allowed.map((opt) => opt.value);
                return value.split(',').filter((item) => validValues.includes(item));
            };

            this.options.regPubKeyAlgs =
                readList('regPubKeyAlgs', this.pubKeyAlgs) ?? this.options.regPubKeyAlgs;
            this.options.regHints = readList('regHints', this.hintOpts) ?? this.options.regHints;
            this.options.authHints = readList('authHints', this.hintOpts) ?? this.options.authHints;
        },
        async _startRegistration() {
            this._syncUsernameInputState();

            const {
                regUserVerification,
                attestation,
                attachment,
                discoverableCredential,
                regHints,
                regPubKeyAlgs,
            } = this.options;

            if (!this.username) {
                this.showErrorAlert('Please enter a username to register');
                return;
            }

            const registrationOptionsJSON = await postJSON('/registration/options', {
                username: this.username,
                // e.g. 'preferred'
                userVerification: regUserVerification,
                // e.g. 'direct'
                attestation,
                // e.g. 'platform'
                attachment,
                // e.g. ['es256', 'rs256']
                algorithms: regPubKeyAlgs,
                // e.g. 'preferred'
                discoverableCredential,
                // e.g. ['security-key', 'hybrid']
                hints: regHints,
            });

            console.log('REGISTRATION OPTIONS');
            console.log(JSON.stringify(registrationOptionsJSON, null, 2));

            // Start WebAuthn registration
            const regResp = await startRegistration({ optionsJSON: registrationOptionsJSON });

            console.log('REGISTRATION RESPONSE');
            console.log(JSON.stringify(regResp, null, 2));

            try {
                await postJSON('/registration/verification', {
                    username: this.username,
                    response: regResp,
                });
                this.showSuccessAlert('Success! Now try to authenticate...');
            } catch (err) {
                this.showErrorAlert(`Registration failed: ${err.message}`);
            }
        },
        async _startAuthentication(startConditionalUI = false) {
            this._syncUsernameInputState();

            const { authUserVerification, authHints } = this.options;

            // We won't have a username for conditional UI
            const username = startConditionalUI ? undefined : this.username || undefined;

            let authenticationOptionsJSON;
            try {
                authenticationOptionsJSON = await postJSON('/authentication/options', {
                    username,
                    userVerification: authUserVerification,
                    hints: authHints,
                });
            } catch (err) {
                // Conditional UI is best-effort, so only surface errors for explicit attempts
                if (!startConditionalUI) {
                    this.showErrorAlert(err.message);
                }
                return;
            }

            console.log('AUTHENTICATION OPTIONS');
            console.log(JSON.stringify(authenticationOptionsJSON, null, 2));

            // Start WebAuthn authentication
            const authResp = await startAuthentication({
                optionsJSON: authenticationOptionsJSON,
                useBrowserAutofill: startConditionalUI,
            });

            console.log('AUTHENTICATION RESPONSE');
            console.log(JSON.stringify(authResp, null, 2));

            try {
                await postJSON('/authentication/verification', {
                    username: this.username || undefined,
                    response: authResp,
                });
                this.showSuccessAlert('Success! You are authenticated.');
            } catch (err) {
                this.showErrorAlert(`Authentication failed: ${err.message}`);
            }
        },
        async _startConditionalUI() {
            if (!(await browserSupportsWebAuthnAutofill())) {
                return;
            }

            try {
                await this._startAuthentication(true);
            } catch (err) {
                if (err.name === 'AbortError') {
                    console.log('Conditional UI request was aborted');
                } else {
                    console.error('Conditional UI error:', err);
                }
            }
        },
        /**
         * If the user navigates back to the page the input can still be populated, but Alpine
         * won't know this. This helps sync form state a bit.
         */
        _syncUsernameInputState() {
            const elemUsername = document.getElementById('input-username');
            if (elemUsername.value && !this.username) {
                this.username = elemUsername.value;
            }
        },
        /**
         * Retrieve the remembered username (if it exists)
         * @returns {string}
         */
        _getUsername() {
            try {
                return window.localStorage.getItem('savedUsername') ?? '';
            } catch {
                return '';
            }
        },
        /**
         * Remember the username so the user doesn't have to keep entering it
         * @param {string} newUsername
         */
        _saveUsername(newUsername) {
            try {
                window.localStorage.setItem('savedUsername', newUsername);
            } catch {
                // Storage can be unavailable; remembering the username is only a convenience
            }
        },
        /** Clear any remembered username */
        _resetUsername() {
            try {
                window.localStorage.removeItem('savedUsername');
            } catch {
                // See `_saveUsername()`
            }
        },
    }));
});
