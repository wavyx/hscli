// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import remarkGfm from 'remark-gfm';
import { unified } from '@astrojs/markdown-remark';

// hscli — Astro + Starlight config for GitHub Pages (project site)
// Live URL: https://wavyx.github.io/hscli  ->  site + base below.
export default defineConfig({
  site: 'https://wavyx.github.io',
  base: '/hscli',

  // GFM tables/strikethrough in .mdx, and disable smartypants so code
  // examples keep literal `--flags` and straight quotes (no em-dash/curly).
  // Astro 6.4 moved these onto markdown.processor: unified({...}); the old
  // top-level markdown.{smartypants,remarkPlugins} are deprecated (removed in 8.0).
  markdown: { processor: unified({ smartypants: false, remarkPlugins: [remarkGfm] }) },

  integrations: [
    starlight({
      title: 'hscli',
      description: 'A fast, scriptable CLI for Help Scout — terminals, CI, and AI agents.',

      // Custom cobalt/coral wordmark mark (see src/assets/hscli-mark.svg).
      // replacesTitle:false keeps the "hscli" wordmark next to the mark.
      logo: { src: './src/assets/hscli-mark.svg', replacesTitle: false },

      // Custom chrome: mockup top-nav header + brand footer (reuse Starlight
      // Search/SocialIcons/ThemeSelect/Pagination internally).
      components: {
        Header: './src/components/Header.astro',
        Footer: './src/components/Footer.astro',
      },

      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/wavyx/hscli' },
      ],

      // Theme + homepage styles. Order matters: tokens first, then home.
      customCss: [
        './src/styles/custom.css',
        './src/styles/home.css',
      ],

      // Terminal-style code blocks. Single dark theme so code stays dark
      // in BOTH light and dark site modes (matches the design).
      expressiveCode: {
        themes: ['github-dark'],
        styleOverrides: {
          borderRadius: '10px',
          borderColor: '#1e2e38',
          codeFontFamily:
            "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
          codeFontSize: '0.85rem',
          frames: {
            editorActiveTabIndicatorTopColor: '#1c8de0',
            terminalTitlebarDotsForeground: '#7e94a2',
            terminalBackground: '#0a141b',
            editorBackground: '#0a141b',
          },
        },
      },

      sidebar: [
        {
          label: 'Get started',
          items: [
            { label: 'Overview', slug: 'guides/overview' },
            { label: 'Installation', slug: 'guides/installation' },
            { label: 'Authentication', slug: 'guides/authentication' },
            { label: 'Configuration', slug: 'guides/configuration' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Conversations', slug: 'guides/conversations' },
            { label: 'Customers', slug: 'guides/customers' },
            { label: 'Reporting', slug: 'guides/reporting' },
            { label: 'Backups & restore', slug: 'guides/backups' },
            { label: 'Mailboxes', slug: 'guides/mailboxes' },
            { label: 'Tags & team', slug: 'guides/tags-and-team' },
            { label: 'Beacon', slug: 'guides/beacon' },
          ],
        },
        {
          label: 'Automation',
          items: [
            { label: 'Output & filtering', slug: 'automation/output' },
            { label: 'Exit codes', slug: 'automation/exit-codes' },
            { label: 'Using with agents', slug: 'automation/agents' },
            { label: 'CI pipelines', slug: 'automation/ci' },
            { label: 'Webhooks & workflows', slug: 'automation/webhooks' },
          ],
        },
        {
          label: 'Reference',
          items: [{ autogenerate: { directory: 'reference' } }],
        },
      ],
    }),
  ],
});
