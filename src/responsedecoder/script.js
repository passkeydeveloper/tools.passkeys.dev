import { log } from '../assets/js/common.js';
import { decodeRegistrationCredential } from './decodeRegistrationCredential.js';
import { decodeAuthenticationCredential } from './decodeAuthenticationCredential.js';
import 'json-viewer';

// Create an instance of our fancy text editor
const flask = new CodeFlask('#jsonEditor', {
  language: 'json',
  lineNumbers: false,
});
/** @type {HTMLTextAreaElement} */
const flaskTextarea = document.querySelector('#jsonEditor textarea');
const logOutputElem = document.getElementById('logOutput');
const parsedOutputElem = document.getElementById('parsedOutput');
const parsedTitleElem = document.getElementById('parsedTitle');
const parsedJSONElem = document.getElementById('parsedJSON');

// Map of type/ceremony/flow selections to sample data files.
// Device-bound passkeys are only available via the "Security Key" flow, and
// synced passkeys are only available via "Local Credential Manager" or
// "Nearby Device" flows, so the "flow" options are filtered based on "type".
const SAMPLE_DATA = {
  'dbp|create|securitykey': 'dbp-yubikey-create.json',
  'dbp|get|securitykey': 'dbp-yubikey-get.json',
  'synced|create|localmanager': 'sp-gpm-create.json',
  'synced|get|localmanager': 'sp-gpm-get.json',
  'synced|create|nearby': 'sp-ap-create.json',
  'synced|get|nearby': 'sp-ap-get.json',
};

const FLOWS_BY_TYPE = {
  dbp: ['securitykey'],
  synced: ['localmanager', 'nearby'],
};

const sampleTypeElem = document.getElementById('sampleType');
const sampleCeremonyElem = document.getElementById('sampleCeremony');
const sampleFlowElem = document.getElementById('sampleFlow');
const loadSampleBtnElem = document.getElementById('loadSampleBtn');

function getSampleKey() {
  return `${sampleTypeElem.value}|${sampleCeremonyElem.value}|${sampleFlowElem.value}`;
}

function updateSampleControls() {
  // Grey out flow options that aren't available for the selected type
  const availableFlows = FLOWS_BY_TYPE[sampleTypeElem.value];
  for (const option of sampleFlowElem.options) {
    option.disabled = !availableFlows.includes(option.value);
  }

  // If the currently-selected flow just became unavailable, jump to the first available one
  if (sampleFlowElem.options[sampleFlowElem.selectedIndex].disabled) {
    sampleFlowElem.value = availableFlows[0];
  }

  loadSampleBtnElem.disabled = !(getSampleKey() in SAMPLE_DATA);
}

sampleTypeElem.addEventListener('change', updateSampleControls);
sampleCeremonyElem.addEventListener('change', updateSampleControls);
sampleFlowElem.addEventListener('change', updateSampleControls);
updateSampleControls();

loadSampleBtnElem.addEventListener('click', async () => {
  const filename = SAMPLE_DATA[getSampleKey()];
  if (!filename) {
    return;
  }

  try {
    const response = await fetch(`./sample-data/${filename}`);
    if (!response.ok) {
      throw new Error(`Sample data file returned ${response.status}`);
    }
    const sampleText = await response.text();

    // Load the raw text into the editor first so it's there to tweak even if
    // it turns out not to be valid/parseable JSON
    flask.updateCode(sampleText);

    // Pretty-print it if possible, same as what happens on paste
    try {
      flask.updateCode(JSON.stringify(JSON.parse(sampleText), null, 2));
    } catch (err) {
      // Leave the raw text as-is
    }
  } catch (err) {
    logError(`Couldn't load sample data (see console for more info): ${err}`);
  }
});

// Set a placeholder to help communicate the shape of the JSON that should be pasted in
flaskTextarea.placeholder = `{
  "id": "...",
  "rawId": "...",
  "response": {
    ...
  },
  "type": "public-key"
}`;

// Set up clicking on the text area selecting all the text for immediate pasting
flaskTextarea.addEventListener('focus', () => {
  flaskTextarea.select();
});

/**
 * Take a pasted JSON response and try to prettify it
 */
flaskTextarea.addEventListener('paste', (event) => {
  try {
    const pasted = event.clipboardData.getData("text");
    const pastedJSON = JSON.parse(pasted);
    const prettifiedJSON = JSON.stringify(pastedJSON, null, 2);
    flask.updateCode(prettifiedJSON);

    // Prevent the original content from being appended to the prettified JSON
    event.preventDefault();
  } catch (err) {
    // Allow the textarea to behave as usual
  }
});

// Attempt to parse whatever was just pasted in
flask.onUpdate((code) => {
  resetUI();

  if (code.length === 0) {
    return;
  }

  // Try to parse the code
  try {
    decodeResponse(code);
  } catch (err) {
    logError(err);
  }
});

function resetUI() {
  // Clear the debug output
  logOutputElem.classList.add('d-none');
  parsedOutputElem.classList.add('d-none');
}

/**
 * Populate the relevant UI with the decoded response
 *
 * @param {"Registration" | "Authentication"} responseType
 * @param {object} decodedResponse
 */
function showDecodedOutput(responseType, decodedResponse) {
  // Set the output title
  parsedTitleElem.innerText = `WebAuthn ${responseType} Response (Parsed)`;

  // Render the decoded response
  parsedJSONElem.data = decodedResponse;

  // Show the output
  parsedOutputElem.classList.remove('d-none');
}

/**
 * @param {string} rawCredential The WebAuthn response being parsed
 * @returns void
 */
function decodeResponse(rawCredential) {
  let credential;
  try {
    credential = JSON.parse(rawCredential);
  } catch (err) {
    throw new Error("This JSON couldn't be parsed, is it valid?");
  }

  const { response } = credential;
  if (!response) {
    throw new Error('The "response" property is missing from this JSON');
  }

  if (isRegistrationCredential(credential)) {
    try {
      const decoded = decodeRegistrationCredential(credential);
      showDecodedOutput('Registration', decoded);
    } catch (err) {
      console.error(err);
      throw new Error(
        `There was an error when parsing this registration credential (see console for more info): ${err}`,
      );
    }
  } else if (isAuthenticationCredential(credential)) {
    try {
      const decoded = decodeAuthenticationCredential(credential);
      showDecodedOutput('Authentication', decoded);
    } catch (err) {
      throw new Error(
        `There was an error when parsing this authentication credential (see console for more info): ${err}`,
      );
    }
  } else {
    throw new Error('This JSON is unrecognizable as a valid WebAuthn response');
  }
}

/**
 * Visually help the user understand what went wrong
 *
 * @param {string} message
 */
function logError(message) {
  logOutputElem.classList.remove('d-none');
  log({
    outputElem: logOutputElem,
    message,
    type: 'error',
    overwrite: true,
  });
}

function isRegistrationCredential(credential) {
  return !!(credential.response?.attestationObject);
}

function isAuthenticationCredential(credential) {
  return !!(credential.response?.authenticatorData);
}
