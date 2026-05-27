/**
 * @param {string} message
 * @param {boolean} skipConfirm
 * @returns {Promise<boolean>}
 */
export async function confirmAction(message, skipConfirm) {
  if (skipConfirm) return true
  const { confirm } = await import('@inquirer/prompts')
  return confirm({ message })
}
