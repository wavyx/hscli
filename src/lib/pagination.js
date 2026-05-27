/**
 * @template T
 * @param {AsyncGenerator<T>} generator
 * @param {number} [limit]
 * @returns {Promise<T[]>}
 */
export async function collectPages(generator, limit) {
  const results = []
  for await (const item of generator) {
    results.push(item)
    if (limit && results.length >= limit) break
  }
  return results
}
