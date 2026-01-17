import { log } from '../assets/js/common.js';
import { decodeRegistrationCredential } from './decodeRegistrationCredential.js';
import { decodeAuthenticationCredential } from './decodeAuthenticationCredential.js';
import "json-viewer";

// Create an instance of our fancy text editor
const flask = new CodeFlask("#jsonEditor", { language: "json", lineNumbers: false });
const flaskTextarea = document.querySelector("#jsonEditor textarea");
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

// DEBUG - Registration
setTimeout(() => {
  flask.updateCode(`{
  "id": "0PjLmk8beadc6I1u5bMrZv6rg0JlTfkp",
  "rawId": "0PjLmk8beadc6I1u5bMrZv6rg0JlTfkp",
  "response": {
    "attestationObject": "o2NmbXRkbm9uZWdhdHRTdG10oGhhdXRoRGF0YVicdKbqkhPJnC90siSSsyDPQCYqlMGpUKA5fyklC2CEHvBdAAAAALraVWanqkAfvZZFYZpVEg0AGND4y5pPG3mnXOiNbuWzK2b-q4NCZU35KaUBAgMmIAEhWCBqFugix1y1gg-sUzr8JhsvI-b8Dc5lAUSqlLL4vKTcziJYIE-InBmgUVIpTbCN2D_h5UYzWhA7wJlP0a5CAYdSkb4Q",
    "clientDataJSON": "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwiY2hhbGxlbmdlIjoiMVVlLWZCZXkyR3p3QXQteU9LRWROUUloYXV1Vmw1QkRFcy1lLWZqUEdfTlBmU2ZIT0YwQUJ0LWQ1SG1UaWJhSV82SkZ1cHQ1bmp3dmNxWTVNSmpNdGciLCJvcmlnaW4iOiJodHRwczovL3dlYmF1dGhuLmlvIiwiY3Jvc3NPcmlnaW4iOmZhbHNlfQ",
    "transports": [
      "internal",
      "hybrid"
    ],
    "publicKeyAlgorithm": -7,
    "publicKey": "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEahboIsdctYIPrFM6_CYbLyPm_A3OZQFEqpSy-Lyk3M5PiJwZoFFSKU2wjdg_4eVGM1oQO8CZT9GuQgGHUpG-EA",
    "authenticatorData": "dKbqkhPJnC90siSSsyDPQCYqlMGpUKA5fyklC2CEHvBdAAAAALraVWanqkAfvZZFYZpVEg0AGND4y5pPG3mnXOiNbuWzK2b-q4NCZU35KaUBAgMmIAEhWCBqFugix1y1gg-sUzr8JhsvI-b8Dc5lAUSqlLL4vKTcziJYIE-InBmgUVIpTbCN2D_h5UYzWhA7wJlP0a5CAYdSkb4Q"
  },
  "type": "public-key",
  "clientExtensionResults": {
    "credProps": {
      "rk": true
    }
  },
  "authenticatorAttachment": "platform"
}`);
}, 10);

function resetUI() {
  // Clear the debug output
  logOutputElem.classList.add('d-none');
  parsedOutputElem.classList.add('d-none');
}

/**
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
 * @param {string} code The WebAuthn response being parsed
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
      showDecodedOutput("Registration", decoded);
    } catch (err) {
      console.error(err);
      throw new Error(`There was an error when parsing this registration credential (see console for more info): ${err}`);
    }
  } else if (isAuthenticationCredential(credential)) {
    try {
      const decoded = decodeAuthenticationCredential(credential);
      showDecodedOutput("Authentication", decoded);
    } catch (err) {
      throw new Error(`There was an error when parsing this authentication credential (see console for more info): ${err}`);
    }
  } else {
    throw new Error('This JSON is unrecognizable as a valid WebAuthn response')
  }
}

/**
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
