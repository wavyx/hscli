export const RESOURCES = [
  {
    name: 'users',
    path: '/v2/users',
    key: 'users',
    layout: 'per-item',
    dir: 'account/users',
  },
  {
    name: 'teams',
    path: '/v2/teams',
    key: 'teams',
    layout: 'per-item',
    dir: 'account/teams',
  },
  {
    name: 'mailboxes',
    path: '/v2/mailboxes',
    key: 'mailboxes',
    layout: 'mailbox',
  },
  {
    name: 'tags',
    path: '/v2/tags',
    key: 'tags',
    layout: 'single-file',
    file: 'tags.json',
  },
  {
    name: 'workflows',
    path: '/v2/workflows',
    key: 'workflows',
    layout: 'single-file',
    file: 'workflows.json',
  },
  {
    name: 'webhooks',
    path: '/v2/webhooks',
    key: 'webhooks',
    layout: 'single-file',
    file: 'webhooks.json',
  },
  {
    name: 'customers',
    path: '/v2/customers',
    key: 'customers',
    layout: 'per-item',
    dir: 'customers',
  },
  {
    name: 'conversations',
    path: '/v2/conversations',
    key: 'conversations',
    layout: 'per-item',
    dir: 'conversations',
    embeds: ['threads'],
    statusAll: true,
  },
]

/**
 * @param {{include?:string[], exclude?:string[]}} opts
 */
export function filterResources({ include, exclude } = {}) {
  let r = RESOURCES
  if (include?.length) r = r.filter((x) => include.includes(x.name))
  if (exclude?.length) r = r.filter((x) => !exclude.includes(x.name))
  return r
}
