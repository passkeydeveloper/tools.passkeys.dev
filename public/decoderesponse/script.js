import { log } from '../assets/js/common.js';

// Create an instance of our fancy text editor
const flask = new CodeFlask("#jsonEditor", { language: "json", lineNumbers: false});
const flaskTextarea = document.querySelector("#jsonEditor textarea");
const logOutputElem = document.querySelector('#logOutput');

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
  // Clear the debug output
  logOutputElem.classList.add('d-none');

  // Try to parse the code
  try {
    decodeResponse(code);
  } catch (err) {
    // Don't show an error if nothing's been pasted in
    if (code.length > 0) {
      logError("This JSON couldn't be parsed, is it valid?");
    }
  }
});

/**
 * @param {string} code The WebAuthn response being parsed
 * @returns void
*/
function decodeResponse(code) {
  console.log(JSON.parse(code, null, 2));
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
