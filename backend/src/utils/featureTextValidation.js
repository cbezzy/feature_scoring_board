/** Keep in sync with frontend LONG_TEXT_FIELD_MAX_CHARS (FeatureEditor.jsx). */
const LONG_TEXT_FIELD_MAX_CHARS = 65535;

const LONG_TEXT_KEYS = ["summary", "pros", "cons", "decisionNotes"];

/**
 * @param {Record<string, unknown>} body
 * @returns {string | null} error message or null if ok
 */
function longTextFieldsTooLongError(body) {
  if (!body || typeof body !== "object") return null;
  for (const key of LONG_TEXT_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
    const raw = body[key];
    const len = raw == null ? 0 : String(raw).length;
    if (len > LONG_TEXT_FIELD_MAX_CHARS) {
      return `${key} exceeds maximum length of ${LONG_TEXT_FIELD_MAX_CHARS.toLocaleString()} characters`;
    }
  }
  return null;
}

module.exports = {
  LONG_TEXT_FIELD_MAX_CHARS,
  longTextFieldsTooLongError,
};
