import createDebug from 'debug'

const debug = createDebug('hs:prerun')

export default async function prerun(options) {
  debug('prerun: %s', options.Command?.id)
}
