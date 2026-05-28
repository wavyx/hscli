// Beacon loader snippet from Help Scout docs (minified, unchanged across embeds)
const LOADER = `!function(e,t,n){function a(){var e=t.getElementsByTagName("script")[0],n=t.createElement("script");n.type="text/javascript",n.async=!0,n.src="https://beacon-v2.helpscout.net",e.parentNode.insertBefore(n,e)}if(e.Beacon=n=function(t,n,a){e.Beacon.readyQueue.push({method:t,options:n,data:a})},n.readyQueue=[],"complete"===t.readyState)return a();e.attachEvent?e.attachEvent("onload",a):e.addEventListener("load",a,!1)}(window,document,window.Beacon||function(){});`

/**
 * Build the <script> embed block for a Beacon, with optional configuration.
 *
 * @param {object} opts
 * @param {string} opts.beaconId required
 * @param {string} [opts.color]      hex color
 * @param {'left'|'right'} [opts.position]
 * @param {'icon'|'text'|'iconAndText'|'manual'} [opts.style]
 * @param {string} [opts.text]       button text
 * @param {'message'|'beacon'|'search'|'buoy'|'question'} [opts.iconImage]
 */
export function embedSnippet({
  beaconId,
  color,
  position,
  style,
  text,
  iconImage,
} = {}) {
  if (!beaconId) throw new Error('embedSnippet: beaconId required')

  const display = {}
  if (position) display.position = position
  if (style) display.style = style
  if (text) display.text = text
  if (iconImage) display.iconImage = iconImage

  const config = {}
  if (color) config.color = color
  if (Object.keys(display).length) config.display = display

  const lines = [
    '<script type="text/javascript">',
    `  ${LOADER}`,
    '</script>',
    '<script type="text/javascript">',
    `  window.Beacon('init', '${beaconId}');`,
  ]
  if (Object.keys(config).length) {
    lines.push(
      `  window.Beacon('config', ${JSON.stringify(config, null, 2).replace(/\n/g, '\n  ')});`,
    )
  }
  lines.push('</script>')
  return lines.join('\n')
}

/**
 * Build a server-side identify snippet for the given stack with HMAC signing.
 *
 * @param {object} opts
 * @param {string} opts.beaconId required (only used in HTML template part)
 * @param {string} opts.secret   required (placeholder — never inline the real secret)
 * @param {'node'|'rails'|'php'|'django'|'python'} [opts.stack='node']
 */
export function identifySnippet({ beaconId, secret, stack = 'node' } = {}) {
  if (!beaconId) throw new Error('identifySnippet: beaconId required')
  if (!secret) throw new Error('identifySnippet: secret required')
  const template = TEMPLATES[stack]
  if (!template) {
    throw new Error(
      `identifySnippet: unknown stack '${stack}'. Valid: ${Object.keys(TEMPLATES).join(', ')}`,
    )
  }
  return template({ beaconId, secret })
}

export const SUPPORTED_STACKS = ['node', 'rails', 'php', 'django', 'python']

const TEMPLATES = {
  node: ({ beaconId, secret }) => `// Server-side (Node.js / Express)
import crypto from 'node:crypto'

const BEACON_ID = '${beaconId}'
const BEACON_SECRET = process.env.BEACON_SECRET // set to: ${secret}

function beaconSignature(email) {
  return crypto.createHmac('sha256', BEACON_SECRET).update(email).digest('hex')
}

// In your HTML template (e.g. EJS / Handlebars):
//   <script>
//     window.Beacon('identify', {
//       name: '<%= currentUser.name %>',
//       email: '<%= currentUser.email %>',
//       signature: '<%= beaconSignature(currentUser.email) %>',
//     })
//   </script>`,
  rails: ({
    beaconId,
    secret,
  }) => `<%# Rails ERB template — set BEACON_SECRET in env (currently: ${secret}) %>
<script>
  window.Beacon('init', '${beaconId}')
  window.Beacon('identify', {
    name: "<%= escape_javascript(current_user.name).html_safe %>",
    email: "<%= current_user.email %>",
    signature: "<%= OpenSSL::HMAC.hexdigest('sha256', ENV['BEACON_SECRET'], current_user.email) %>",
  })
</script>`,
  php: ({ beaconId, secret }) => `<?php
  // Set in env: BEACON_SECRET=${secret}
  $secret = getenv('BEACON_SECRET');
  $email = $currentUser->email;
  $signature = hash_hmac('sha256', $email, $secret);
?>
<script>
  window.Beacon('init', '${beaconId}');
  window.Beacon('identify', {
    name: <?php echo json_encode($currentUser->name); ?>,
    email: <?php echo json_encode($email); ?>,
    signature: <?php echo json_encode($signature); ?>,
  })
</script>`,
  django: ({
    beaconId,
    secret,
  }) => `# Django view — set BEACON_SECRET in env (currently: ${secret})
import hmac
import hashlib
import os

def add_beacon_context(request):
    secret = os.environ['BEACON_SECRET'].encode()
    email = request.user.email
    signature = hmac.new(secret, email.encode(), hashlib.sha256).hexdigest()
    return {
        'beacon_id': '${beaconId}',
        'beacon_email': email,
        'beacon_name': request.user.get_full_name(),
        'beacon_signature': signature,
    }

# In your template:
#   <script>
#     window.Beacon('init', '{{ beacon_id }}')
#     window.Beacon('identify', {
#       name: '{{ beacon_name|escapejs }}',
#       email: '{{ beacon_email }}',
#       signature: '{{ beacon_signature }}',
#     })
#   </script>`,
  python: ({
    beaconId,
    secret,
  }) => `# Generic Python — set BEACON_SECRET in env (currently: ${secret})
import hmac
import hashlib
import os

BEACON_ID = '${beaconId}'

def beacon_signature(email: str) -> str:
    secret = os.environ['BEACON_SECRET'].encode()
    return hmac.new(secret, email.encode(), hashlib.sha256).hexdigest()

# In your HTML template, render:
#   <script>
#     window.Beacon('init', '{beacon_id}')
#     window.Beacon('identify', {{
#       name: '{name}',
#       email: '{email}',
#       signature: '{signature}',
#     }})
#   </script>
# Pass: beacon_id=BEACON_ID, signature=beacon_signature(user.email)`,
}
