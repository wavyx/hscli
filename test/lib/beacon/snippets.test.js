import {
  embedSnippet,
  identifySnippet,
  SUPPORTED_STACKS,
} from '../../../src/lib/beacon/snippets.js'

describe('beacon/snippets', () => {
  describe('embedSnippet', () => {
    it('requires beaconId', () => {
      expect(() => embedSnippet({})).toThrow(/beaconId required/)
    })

    it('emits basic init block', () => {
      const s = embedSnippet({ beaconId: 'abc-123' })
      expect(s).toContain("window.Beacon('init', 'abc-123')")
      expect(s).toContain('beacon-v2.helpscout.net')
      expect(s).not.toContain("window.Beacon('config'")
    })

    it('includes color in config when provided', () => {
      const s = embedSnippet({ beaconId: 'id', color: '#5b21b6' })
      expect(s).toContain("'config'")
      expect(s).toContain('#5b21b6')
    })

    it('includes display block with position/style/text/iconImage', () => {
      const s = embedSnippet({
        beaconId: 'id',
        position: 'right',
        style: 'iconAndText',
        text: 'Help',
        iconImage: 'buoy',
      })
      expect(s).toContain('display')
      expect(s).toContain('right')
      expect(s).toContain('iconAndText')
      expect(s).toContain('Help')
      expect(s).toContain('buoy')
    })
  })

  describe('identifySnippet', () => {
    it('requires beaconId and secret', () => {
      expect(() => identifySnippet({ secret: 'x' })).toThrow(
        /beaconId required/,
      )
      expect(() => identifySnippet({ beaconId: 'x' })).toThrow(
        /secret required/,
      )
    })

    it('rejects unknown stack', () => {
      expect(() =>
        identifySnippet({ beaconId: 'b', secret: 's', stack: 'cobol' }),
      ).toThrow(/unknown stack/)
    })

    it('defaults stack to node', () => {
      const s = identifySnippet({ beaconId: 'b', secret: 's' })
      expect(s).toContain('crypto')
      expect(s).toContain('Node.js')
    })

    it('node template references crypto and Beacon identify', () => {
      const s = identifySnippet({ beaconId: 'b1', secret: 'sk', stack: 'node' })
      expect(s).toContain('createHmac')
      expect(s).toContain('b1')
      expect(s).toContain('sk')
    })

    it('rails template uses OpenSSL::HMAC', () => {
      const s = identifySnippet({ beaconId: 'b', secret: 's', stack: 'rails' })
      expect(s).toContain('OpenSSL::HMAC.hexdigest')
      expect(s).toContain('escape_javascript')
    })

    it('php template uses hash_hmac', () => {
      const s = identifySnippet({ beaconId: 'b', secret: 's', stack: 'php' })
      expect(s).toContain('hash_hmac')
      expect(s).toContain('<?php')
    })

    it('django template uses hmac module', () => {
      const s = identifySnippet({
        beaconId: 'b',
        secret: 's',
        stack: 'django',
      })
      expect(s).toContain('import hmac')
      expect(s).toContain('Django view')
    })

    it('python template uses hmac module', () => {
      const s = identifySnippet({
        beaconId: 'b',
        secret: 's',
        stack: 'python',
      })
      expect(s).toContain('import hmac')
      expect(s).toContain('Generic Python')
    })

    it('SUPPORTED_STACKS lists all supported', () => {
      expect(SUPPORTED_STACKS).toEqual([
        'node',
        'rails',
        'php',
        'django',
        'python',
      ])
    })
  })
})
