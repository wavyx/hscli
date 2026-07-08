import { dump } from 'js-yaml'

/**
 * @param {unknown} data
 * @returns {string}
 */
export function formatYaml(data) {
  return dump(data, { lineWidth: -1 }).trimEnd()
}
