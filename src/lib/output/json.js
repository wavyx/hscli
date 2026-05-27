/**
 * @param {unknown} data
 * @returns {string}
 */
export function formatJson(data) {
  return JSON.stringify(data, null, 2)
}
