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
