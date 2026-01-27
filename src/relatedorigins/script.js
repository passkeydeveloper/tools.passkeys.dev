
document.addEventListener('DOMContentLoaded', () => {
    const validateBtn = document.getElementById('validateBtn');
    const resultsDiv = document.getElementById('results');
    const logOutput = document.getElementById('logOutput');
    const validLabelCountEl = document.getElementById('validLabelCount');
    const totalLabelCountEl = document.getElementById('totalLabelCount');
    const statusIndicator = document.getElementById('statusIndicator');
    const flask = new CodeFlask('#jsonEditor', { language: 'json', lineNumbers: true });
    flask.updateCode(`{
  "origins": []
}`);

    const flaskTextarea = document.querySelector('#jsonEditor textarea');
    if (flaskTextarea) {
        flaskTextarea.addEventListener('blur', () => {
            const val = flask.getCode().trim();
            if (!val) return;
            try {
                const parsed = JSON.parse(val);
                flask.updateCode(JSON.stringify(parsed, null, 2));
            } catch (e) {
                // Ignore parse errors on blur
            }
        });
    }

    const loadValidBtn = document.getElementById('loadValidBtn');
    const loadInvalidBtn = document.getElementById('loadInvalidBtn');

    const exampleOrigins = [
        "https://example.ca",
        "https://example.com.mx",
        "https://example.co.uk",
        "https://example.de",
        "https://example.es",
        "https://example.it",
        "https://myexample.org",
        "https://twoexample.com",
        "https://myshoppingexample.com",
        "https://justanexample.com",
        "https://justanexample.dev",
        "https://howaboutanotherexample.com",
        "https://example.net",
        "https://example.dev"

    ];

    const rpIdInput = document.getElementById('rpId');
    const locationMsg = document.getElementById('wellKnownLocationMsg');

    function updateLocationMsg() {
        const val = rpIdInput.value.trim();
        if (val) {
            locationMsg.innerHTML = `This emulates a JSON document hosted at:<br><span class="badge bg-light text-dark border font-monospace mt-1">https://${val}/.well-known/webauthn</span>`;
            locationMsg.classList.remove('d-none');
        } else {
            locationMsg.classList.add('d-none');
        }
    }

    rpIdInput.addEventListener('input', () => {
        validateRpId();
        updateLocationMsg();
    });

    function validateRpId() {
        const val = rpIdInput.value.trim();
        const feedbackEl = document.getElementById('rpIdFeedback');
        let isValid = true;
        let msg = "";

        if (val.includes("://")) {
            isValid = false;
            msg = "Do not include the scheme (e.g. https://).";
        } else if (val.includes("/")) {
            isValid = false;
            msg = "Do not include paths.";
        } else if (val.includes(":") || val.includes("?") || val.includes("#")) {
            isValid = false;
            msg = "RP ID must be a valid domain name.";
        }

        if (!isValid) {
            rpIdInput.classList.add('is-invalid');
            if (feedbackEl) feedbackEl.textContent = msg;
        } else {
            rpIdInput.classList.remove('is-invalid');
        }
        return isValid;
    }

    if (loadValidBtn && loadInvalidBtn) {
        loadValidBtn.addEventListener('click', () => {
            rpIdInput.value = "example.com";
            rpIdInput.classList.remove('is-invalid'); // Clear error
            document.getElementById('callingOrigin').value = "https://myexample.org";
            flask.updateCode(JSON.stringify({ origins: exampleOrigins }, null, 2));
            resultsDiv.className = 'card mb-5 d-none'; // Reset results
            updateLocationMsg();
        });

        const loadValidCcTldBtn = document.getElementById('loadValidCcTldBtn');
        if (loadValidCcTldBtn) {
            loadValidCcTldBtn.addEventListener('click', () => {
                rpIdInput.value = "example.com";
                rpIdInput.classList.remove('is-invalid');
                document.getElementById('callingOrigin').value = "https://example.es";
                flask.updateCode(JSON.stringify({ origins: exampleOrigins }, null, 2));
                resultsDiv.className = 'card mb-5 d-none';
                updateLocationMsg();
            });
        }

        loadInvalidBtn.addEventListener('click', () => {
            rpIdInput.value = "example.com";
            rpIdInput.classList.remove('is-invalid'); // Clear error
            document.getElementById('callingOrigin').value = "https://howaboutanotherexample.com";
            flask.updateCode(JSON.stringify({ origins: exampleOrigins }, null, 2));
            resultsDiv.className = 'card mb-5 d-none'; // Reset results
            updateLocationMsg();
        });

        const loadMissingBtn = document.getElementById('loadMissingBtn');
        if (loadMissingBtn) {
            loadMissingBtn.addEventListener('click', () => {
                rpIdInput.value = "example.com";
                rpIdInput.classList.remove('is-invalid'); // Clear error
                document.getElementById('callingOrigin').value = "https://example.org";
                flask.updateCode(JSON.stringify({ origins: exampleOrigins }, null, 2));
                resultsDiv.className = 'card mb-5 d-none'; // Reset results
                updateLocationMsg();
            });
        }
    }

    const prettifyBtn = document.getElementById('prettifyBtn');
    prettifyBtn.addEventListener('click', () => {
        const val = flask.getCode().trim();
        if (!val) return;
        try {
            const parsed = JSON.parse(val);
            flask.updateCode(JSON.stringify(parsed, null, 2));
        } catch (e) {
            // Provide feedback if JSON is invalid
            alert("Invalid JSON: " + e.message);
        }
    });


    validateBtn.addEventListener('click', async () => {
        // Clear previous results
        logOutput.innerHTML = '';
        resultsDiv.classList.remove('d-none');
        setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100);
        statusIndicator.className = 'alert alert-info fw-bold';
        statusIndicator.innerText = 'Validating...';

        const rpId = document.getElementById('rpId').value.trim();
        const callingOrigin = document.getElementById('callingOrigin').value.trim();
        const jsonInput = flask.getCode().trim();

        if (!callingOrigin) {
            log("Error: Calling Origin is required.", "error");
            updateStatus(false, "Missing inputs");
            return;
        }

        // 1. Check Standard WebAuthn Match FIRST
        try {
            const callingUrl = new URL(callingOrigin);
            if (rpId) {
                const callingHostname = callingUrl.hostname;
                log(`Checking traditional RP ID < > origin match: Hostname='${callingHostname}' vs RP ID='${rpId}'`);

                if (callingHostname === rpId || callingHostname.endsWith("." + rpId)) {
                    // SUCCESS - Standard Match
                    updateStatus(true, "Origin Allowed");
                    log(`SUCCESS: Origin ${callingUrl.origin} matches RP ID ${rpId} via standard WebAuthn rules (subdomain or exact match).`, "success");
                    log(`Reason: Normal valid origin (without ROR).`, "success");
                    validLabelCountEl.innerText = "-";
                    totalLabelCountEl.innerText = "-";
                    return; // Skip JSON processing
                } else {
                    log(`Standard match failed: '${callingHostname}' does not end with '.${rpId}' and is not equal.`);
                }
            } else {
                log("No RP ID provided, skipping standard match check.", "warn");
            }
        } catch (e) {
            log("Invalid Calling Origin URL: " + e.message, "error");
            updateStatus(false, "Invalid Origin URL");
            return;
        }

        // 2. If Standard Match failed, proceed to Related Origins Check
        if (!jsonInput) {
            log("Error: JSON Source is required for Related Origins validation (since standard match failed).", "error");
            updateStatus(false, "Missing JSON");
            return;
        }

        let wellKnownData = null;

        try {
            wellKnownData = JSON.parse(jsonInput);
        } catch (e) {
            log("Error parsing JSON input: " + e.message, "error");
            updateStatus(false, "Invalid JSON");
            return;
        }

        if (!wellKnownData || !Array.isArray(wellKnownData.origins)) {
            log("Invalid well-known format: 'origins' array missing or invalid", "error");
            updateStatus(false, "Invalid Format");
            return;
        }

        validate(wellKnownData.origins, callingOrigin);
    });

    function log(message, type = "info") {
        const line = document.createElement('div');
        let colorClass = "text-body";
        if (type === "warn") colorClass = "text-warning";
        if (type === "error") colorClass = "text-danger";
        if (type === "success") colorClass = "text-success";

        line.className = `mb-1 ${colorClass}`;
        line.innerText = message;
        logOutput.appendChild(line);
        console.log(`[${type}] ${message}`);
    }

    function updateStatus(valid, text) {
        if (valid) {
            statusIndicator.className = 'alert alert-success fw-bold';
            statusIndicator.innerText = "VALID";
        } else {
            statusIndicator.className = 'alert alert-danger fw-bold';
            statusIndicator.innerText = "INVALID: " + text;
        }
    }

    function validate(origins, callingOriginInput) {
        const allUniqueLabels = new Set();
        const validLabels = new Set();

        let matchFound = false;
        let foundButSkipped = false;
        let foundInOrigins = false; // Just checks if string match exists at all

        // Normalize calling origin
        let callingUrl;
        try {
            callingUrl = new URL(callingOriginInput);
        } catch (e) {
            log(`Invalid calling origin URL: ${callingOriginInput}`, "error");
            updateStatus(false, "Invalid Origin URL");
            return;
        }

        const targetOrigin = callingUrl.origin;
        const rpId = rpIdInput.value.trim();
        log(`Calling origin: ${targetOrigin}`);

        // Check standard WebAuthn RP ID matching rules (without Related Origins)
        // Rule: The RP ID must be a registrable domain suffix of the client's origin's effective domain.
        try {
            const callingHostname = callingUrl.hostname;
            log(`Checking standard WebAuthn match: Hostname='${callingHostname}' vs RP ID='${rpId}'`);
            // Simple check: is RP ID exact match or a suffix?
            // Note: This is an approximation. Real browsers use PSL. 
            // If RP ID is "example.com", calling origin "https://sub.example.com" is valid.
            // If RP ID is "example.com", calling origin "https://example.com" is valid.

            // We use PSL to verify they share the same eTLD+1 if we want to be strict,
            // but standard WebAuthn matching is: 
            // 1. RP ID is a valid domain string.
            // 2. The origin's effective domain ends with RP ID.
            // 3. The match is on a dot boundary or exact match.

            if (rpId) {
                if (callingHostname === rpId || callingHostname.endsWith("." + rpId)) {
                    updateStatus(true, "Origin Allowed");
                    log(`SUCCESS: Origin ${targetOrigin} matches RP ID ${rpId} via standard WebAuthn rules (subdomain or exact match).`);
                    log(`Reason: Normal valid origin (without ROR).`);

                    // We still calculate labels for display purposes, but we can exit or flag it?
                    // User request implies this is a valid state.
                    // We should probably proceed to count labels just for info, but ensure status is VALID.

                    // Actually, if it's a standard match, ROR JSON validation isn't strictly *required* for success, 
                    // but the tool is a "Related Origins Validator".
                    // However, if the user asks for this, they likely want to see that it's allowed *regardless* of the JSON content?
                    // Or maybe check JSON anyway?

                    // "The reason should be given 'Normal valid origin (without ROR)'" implies we stop there?
                    // Let's return early to be clear this bypasses ROR layout.
                    // But we need to fill the "Label Count" badges with something or reset them?
                    validLabelCountEl.innerText = "-";
                    totalLabelCountEl.innerText = "-";
                    return;
                } else {
                    log(`Standard match failed: '${callingHostname}' does not end with '.${rpId}' and is not equal.`);
                }
            }
        } catch (e) {
            log("Error checking standard RP ID match: " + e.message, "warn");
        }

        for (const originStr of origins) {
            let originUrl;
            try {
                originUrl = new URL(originStr);
            } catch (e) {
                log(`Skipping invalid origin URL in list: ${originStr}`, "warn");
                continue;
            }

            // Check literal string match (normalized by URL)
            if (originUrl.origin === targetOrigin) {
                foundInOrigins = true;
            }

            const hostname = originUrl.hostname;
            const parsed = psl.parse(hostname);
            // User correction: Label is the registrable name part (e.g. "example" from "example.com"), not the full eTLD+1.
            // psl 1.9.0 might not support 'sl', so we fallback to calculating it from domain and tld.
            let label = parsed.sl;
            if (!label && parsed.domain && parsed.tld) {
                label = parsed.domain.slice(0, -(parsed.tld.length + 1));
            }
            if (!label) {
                // If label cannot be determined, skip.
                continue;
            }

            // Track ALL unique labels for the total count
            allUniqueLabels.add(label);

            log(`Processing origin '${originStr}': Hostname='${hostname}', Parsed Label='${label}' (Total labels: ${allUniqueLabels.size})`);

            // Track "Valid" labels (the first 5 unique ones)
            if (validLabels.size < 5) {
                validLabels.add(label);
            }

            // Check for match validity based on SPEC
            // A match is valid if the origin string matches AND its label is in the allowed 'validLabels' set.
            if (originUrl.origin === targetOrigin) {
                if (validLabels.has(label)) {
                    matchFound = true;
                } else {
                    foundButSkipped = true;
                }
            }
        }

        log("--- Analysis ---");
        log(`Total unique labels found: ${allUniqueLabels.size}`);
        log(`Valid labels (max 5): ${validLabels.size}`);

        validLabelCountEl.innerText = validLabels.size;
        totalLabelCountEl.innerText = allUniqueLabels.size;

        if (matchFound) {
            updateStatus(true, "Origin Allowed");
            log(`SUCCESS: Origin ${targetOrigin} matches a valid label.`, "success");
        } else if (foundButSkipped) {
            updateStatus(false, "Label Limit Exceeded");
            log(`FAILURE: Origin ${targetOrigin} found, but its label was skipped (limit 5 distinct labels).`, "error");
        } else if (foundInOrigins) {
            updateStatus(false, "Origin Found but Invalid Label");
            log(`FAILURE: Origin found in list, but could not determine valid eTLD+1 label.`, "error");
        } else {
            updateStatus(false, "Origin Not Found");
            log(`FAILURE: Origin ${targetOrigin} not found in valid set.`, "error");
        }
    }
});
