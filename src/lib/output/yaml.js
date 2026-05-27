import yaml from 'js-yaml'

/**
 * @param {unknown} data
 * @returns {string}
 */
export function formatYaml(data) {
  return yaml.dump(data, { lineWidth: -1 }).trimEnd()
}
