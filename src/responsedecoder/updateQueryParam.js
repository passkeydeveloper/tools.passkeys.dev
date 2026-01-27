import { encodeBase64Url } from 'tiny-encodings';

/**
 * Set the given query parameter to the base64url-encoded value
 *
 * @param {string} param
 * @param {string} newValue
 * @returns {void}
 */
export function updateQueryParam(param, newValue) {
  const searchParams = new URLSearchParams(window.location.search);

  if (newValue.length < 1) {
    // Clear query parameter if there's no value to preserve
    searchParams.delete(param);
    const newPathQuery = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState(null, '', newPathQuery);
  } else {
    // Set query parameter with new value
    searchParams.set(param, encodeBase64Url(newValue));
    const newPathQuery = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState(null, '', newPathQuery);
  }
}
