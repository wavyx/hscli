import { getConf } from './config.js'

export function getAliases() {
  return getConf().get('aliases') ?? {}
}

/**
 * @param {string} name
 * @returns {string | undefined}
 */
export function getAlias(name) {
  return getAliases()[name]
}

/**
 * @param {string} name
 * @param {string} command
 */
export function setAlias(name, command) {
  getConf().set(`aliases.${name}`, command)
}

/**
 * @param {string} name
 */
export function unsetAlias(name) {
  getConf().delete(`aliases.${name}`)
}
