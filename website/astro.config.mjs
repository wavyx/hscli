// @ts-check
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

// https://astro.build/config
export default defineConfig({
  site: 'https://wavyx.github.io',
  base: '/hscli',
  integrations: [
    starlight({
      title: 'hscli',
      description: 'Command-line interface for Help Scout',
      customCss: ['./src/styles/helpscout.css'],
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/wavyx/hscli',
        },
      ],
      sidebar: [
        { label: 'Authentication', slug: 'authentication' },
        { label: 'Configuration', slug: 'configuration' },
        { label: 'Commands', slug: 'commands' },
        { label: 'API Reference', slug: 'api-reference' },
        { label: 'Backup & Data Portability', slug: 'backup' },
        { label: 'Beacon', slug: 'beacon' },
      ],
    }),
  ],
})
