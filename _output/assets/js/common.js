/**
 * Output an error message
 *
 * @param {{
 *   outputElem: HTMLDivElement,
 *   message: string,
 *   type: ("info"|"warn"|"error"|"success"),
 *   overwrite: boolean,
 * }} opts opts:
 * - `outputElem` - Where to visually display the log message
 * - `message` - The log message being captured
 * - `type` - The level of the log message. Defaults to `"info"`
 * - `overwrite` - Replace all existing log messages in outputElem. Defaults to `false`
 */
export function log(opts) {
  const { outputElem, message, type = "info", overwrite = false } = opts;

  const line = document.createElement('div');
  let colorClass = "text-body";
  if (type === "warn") colorClass = "text-warning";
  if (type === "error") colorClass = "text-danger";
  if (type === "success") colorClass = "text-success";

  line.className = `mb-1 ${colorClass}`;
  line.innerText = message;

  if (overwrite) {
    outputElem.replaceChildren(line);
  } else {
    outputElem.appendChild(line);
  }

  console.log(`[${type}] ${message}`);
}
