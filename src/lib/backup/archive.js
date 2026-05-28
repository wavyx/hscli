import { basename, dirname } from 'node:path'
import { c as tarCreate } from 'tar'

/**
 * Create a gzipped tar archive of a directory.
 * @param {string} dir absolute path to directory to archive
 * @returns {Promise<string>} path to created .tar.gz
 */
export async function compressDir(dir) {
  const out = `${dir}.tar.gz`
  await tarCreate(
    { gzip: true, file: out, cwd: dirname(dir) },
    [basename(dir)],
  )
  return out
}
