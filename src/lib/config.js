import Conf from 'conf'

const schema = {
  activeProfile: { type: 'string', default: 'default' },
  profiles: {
    type: 'object',
    default: {},
  },
}

/** @type {Conf | undefined} */
let _conf

export function getConf() {
  _conf ??= new Conf({ projectName: 'hscli', schema })
  return _conf
}

/**
 * @param {string} [profileFlag]
 * @returns {{ activeProfile: string, [key: string]: unknown }}
 */
export function loadConfig(profileFlag) {
  const conf = getConf()
  const activeProfile = profileFlag ?? conf.get('activeProfile')
  const profileData = conf.get(`profiles.${activeProfile}`) ?? {}
  return { activeProfile, ...profileData }
}

export function getActiveProfile() {
  return getConf().get('activeProfile')
}

/** @param {string} name */
export function setActiveProfile(name) {
  getConf().set('activeProfile', name)
}

/**
 * @param {string} profile
 * @param {string} key
 */
export function getProfileConfig(profile, key) {
  return getConf().get(`profiles.${profile}.${key}`)
}

/**
 * @param {string} profile
 * @param {string} key
 * @param {unknown} value
 */
export function setProfileConfig(profile, key, value) {
  getConf().set(`profiles.${profile}.${key}`, value)
}

/** @param {string} profile */
export function getProfileData(profile) {
  return getConf().get(`profiles.${profile}`) ?? {}
}

export function getAllProfiles() {
  return getConf().get('profiles')
}

/**
 * @param {string} profile
 * @param {string} key
 */
export function deleteProfileConfig(profile, key) {
  getConf().delete(`profiles.${profile}.${key}`)
}
