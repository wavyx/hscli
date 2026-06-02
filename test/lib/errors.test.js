import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  CliError,
  AuthRequiredError,
  ConfigError,
  RateLimitError,
  ServiceUnavailableError,
  ApiError,
  handleError,
} from '../../src/lib/errors.js'

describe('CliError', () => {
  it('sets message and default exitCode', () => {
    const err = new CliError('something broke')
    expect(err.message).toBe('something broke')
    expect(err.exitCode).toBe(1)
    expect(err).toBeInstanceOf(Error)
  })

  it('accepts a custom exitCode', () => {
    const err = new CliError('custom', { exitCode: 42 })
    expect(err.exitCode).toBe(42)
  })

  it('accepts a cause option', () => {
    const cause = new Error('root cause')
    const err = new CliError('wrapper', { cause })
    expect(err.cause).toBe(cause)
  })
})

describe('AuthRequiredError', () => {
  it('has exitCode 77 and correct message', () => {
    const err = new AuthRequiredError()
    expect(err.exitCode).toBe(77)
    expect(err.message).toBe('Not authenticated. Run: hscli auth login')
    expect(err).toBeInstanceOf(CliError)
  })
})

describe('ConfigError', () => {
  it('has exitCode 78 and preserves message', () => {
    const err = new ConfigError('bad config')
    expect(err.exitCode).toBe(78)
    expect(err.message).toBe('bad config')
    expect(err).toBeInstanceOf(CliError)
  })
})

describe('RateLimitError', () => {
  it('has exitCode 75 and stores retryAfter', () => {
    const err = new RateLimitError(30)
    expect(err.exitCode).toBe(75)
    expect(err.retryAfter).toBe(30)
    expect(err.message).toBe('Rate limited. Retry after 30s')
    expect(err).toBeInstanceOf(CliError)
  })
})

describe('ServiceUnavailableError', () => {
  it('has exitCode 69 and fixed message', () => {
    const err = new ServiceUnavailableError()
    expect(err.exitCode).toBe(69)
    expect(err.message).toBe('Help Scout API is unavailable')
    expect(err).toBeInstanceOf(CliError)
  })
})

describe('ApiError', () => {
  it('extracts message from body.message', () => {
    const err = new ApiError(422, { message: 'Validation failed' }, '/v2/test')
    expect(err.message).toBe('Help Scout API 422: Validation failed')
    expect(err.statusCode).toBe(422)
    expect(err.path).toBe('/v2/test')
    expect(err.body).toEqual({ message: 'Validation failed' })
  })

  it('extracts message from OAuth error_description field', () => {
    const body = {
      error: 'invalid_client',
      error_description: 'Client authentication failed',
    }
    const err = new ApiError(401, body, '/v2/oauth2/token')
    expect(err.message).toBe('Help Scout API 401: Client authentication failed')
  })

  it('falls back to error field when no error_description', () => {
    const body = { error: 'invalid_grant' }
    const err = new ApiError(400, body, '/v2/oauth2/token')
    expect(err.message).toBe('Help Scout API 400: invalid_grant')
  })

  it('extracts message from _embedded.errors', () => {
    const body = { _embedded: { errors: [{ message: 'field is required' }] } }
    const err = new ApiError(422, body, '/v2/test')
    expect(err.message).toBe('Help Scout API 422: field is required')
  })

  it('falls back to generic message when body has no message', () => {
    const err = new ApiError(500, {}, '/v2/test')
    expect(err.message).toBe('Help Scout API 500: API error 500')
  })

  it('maps 422 to exitCode 65', () => {
    const err = new ApiError(422, { message: 'bad' }, '/v2/x')
    expect(err.exitCode).toBe(65)
  })

  it('maps 403 to exitCode 77', () => {
    const err = new ApiError(403, { message: 'forbidden' }, '/v2/x')
    expect(err.exitCode).toBe(77)
  })

  it('maps 401 to exitCode 77', () => {
    const err = new ApiError(401, { message: 'unauthorized' }, '/v2/x')
    expect(err.exitCode).toBe(77)
  })

  it('maps 5xx to exitCode 69', () => {
    const err = new ApiError(503, { message: 'unavailable' }, '/v2/x')
    expect(err.exitCode).toBe(69)
  })

  it('defaults exitCode to 1 for other status codes', () => {
    const err = new ApiError(400, { message: 'bad request' }, '/v2/x')
    expect(err.exitCode).toBe(1)
  })

  it('stores logRef from body', () => {
    const body = { message: 'error', logRef: 'abc-123' }
    const err = new ApiError(500, body, '/v2/x')
    expect(err.logRef).toBe('abc-123')
  })

  it('sets logRef to undefined when body has no logRef', () => {
    const err = new ApiError(500, { message: 'error' }, '/v2/x')
    expect(err.logRef).toBeUndefined()
  })

  describe('.fromResponse', () => {
    it('parses JSON body and creates ApiError', () => {
      const text = JSON.stringify({ message: 'not found' })
      const err = ApiError.fromResponse(404, text, '/v2/thing')
      expect(err).toBeInstanceOf(ApiError)
      expect(err.statusCode).toBe(404)
      expect(err.body).toEqual({ message: 'not found' })
      expect(err.message).toBe('Help Scout API 404: not found')
    })

    it('handles non-JSON text body gracefully', () => {
      const err = ApiError.fromResponse(502, 'Bad Gateway', '/v2/thing')
      expect(err).toBeInstanceOf(ApiError)
      expect(err.statusCode).toBe(502)
      expect(err.body).toEqual({ message: 'Bad Gateway' })
      expect(err.message).toBe('Help Scout API 502: Bad Gateway')
    })

    it('maps status codes to correct exit codes', () => {
      expect(ApiError.fromResponse(422, '{}', '/x').exitCode).toBe(65)
      expect(ApiError.fromResponse(403, '{}', '/x').exitCode).toBe(77)
      expect(ApiError.fromResponse(500, '{}', '/x').exitCode).toBe(69)
    })

    it('extracts logRef from parsed JSON body', () => {
      const text = JSON.stringify({ message: 'err', logRef: 'ref-456' })
      const err = ApiError.fromResponse(500, text, '/v2/x')
      expect(err.logRef).toBe('ref-456')
    })
  })
})

describe('handleError', () => {
  let stderrSpy

  afterEach(() => {
    if (stderrSpy) stderrSpy.mockRestore()
  })

  it('delegates to cmd.error with err.message and exitCode for plain CliError', () => {
    const cmd = {
      flags: {},
      error: vi.fn(),
      exit: vi.fn(),
    }
    const err = new CliError('something broke', { exitCode: 5 })

    handleError(err, cmd)

    expect(cmd.error).toHaveBeenCalledWith('something broke', { exit: 5 })
  })

  it('defaults to exit code 70 when err has no exitCode', () => {
    const cmd = {
      flags: {},
      error: vi.fn(),
      exit: vi.fn(),
    }
    const err = new Error('unknown')

    handleError(err, cmd)

    expect(cmd.error).toHaveBeenCalledWith('unknown', { exit: 70 })
  })

  it('writes JSON error to stderr when --output json', () => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const cmd = {
      flags: { output: 'json' },
      error: vi.fn(),
      exit: vi.fn((code) => {
        throw new Error(`exit ${code}`)
      }),
    }
    const err = new ApiError(404, { message: 'Not found' }, '/v2/x')

    expect(() => handleError(err, cmd)).toThrow('exit 1')

    const output = stderrSpy.mock.calls[0][0]
    const parsed = JSON.parse(output)
    expect(parsed.error).toBe('ApiError')
    expect(parsed.message).toBe('Help Scout API 404: Not found')
    expect(parsed.statusCode).toBe(404)
    expect(parsed.path).toBe('/v2/x')
    expect(parsed.exitCode).toBe(1)
    expect(parsed.body).toBeUndefined() // not included without --verbose
  })

  it('JSON error includes logRef when present', () => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const cmd = {
      flags: { output: 'json' },
      error: vi.fn(),
      exit: vi.fn((code) => {
        throw new Error(`exit ${code}`)
      }),
    }
    const err = new ApiError(
      500,
      { message: 'Server error', logRef: 'log-789' },
      '/v2/x',
    )

    expect(() => handleError(err, cmd)).toThrow('exit 69')

    const output = stderrSpy.mock.calls[0][0]
    const parsed = JSON.parse(output)
    expect(parsed.logRef).toBe('log-789')
  })

  it('JSON error includes body when --verbose', () => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const cmd = {
      flags: { output: 'json', verbose: true },
      error: vi.fn(),
      exit: vi.fn((code) => {
        throw new Error(`exit ${code}`)
      }),
    }
    const err = new ApiError(
      422,
      { message: 'Validation', errors: [{ field: 'x' }] },
      '/v2/x',
    )

    expect(() => handleError(err, cmd)).toThrow('exit 65')

    const output = stderrSpy.mock.calls[0][0]
    const parsed = JSON.parse(output)
    expect(parsed.body).toEqual({
      message: 'Validation',
      errors: [{ field: 'x' }],
    })
  })

  it('JSON error for non-ApiError omits statusCode/path/body', () => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const cmd = {
      flags: { output: 'json' },
      error: vi.fn(),
      exit: vi.fn((code) => {
        throw new Error(`exit ${code}`)
      }),
    }
    const err = new ConfigError('bad config')

    expect(() => handleError(err, cmd)).toThrow('exit 78')

    const output = stderrSpy.mock.calls[0][0]
    const parsed = JSON.parse(output)
    expect(parsed.error).toBe('ConfigError')
    expect(parsed.message).toBe('bad config')
    expect(parsed.exitCode).toBe(78)
    expect(parsed.statusCode).toBeUndefined()
    expect(parsed.path).toBeUndefined()
    expect(parsed.body).toBeUndefined()
  })

  it('writes verbose request/response details to stderr for ApiError', () => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const cmd = {
      flags: { verbose: true },
      error: vi.fn(),
      exit: vi.fn(),
    }
    const err = new ApiError(
      500,
      { message: 'oops', logRef: 'ref-9' },
      '/v2/things',
    )

    handleError(err, cmd)

    const writes = stderrSpy.mock.calls.map((c) => c[0]).join('')
    expect(writes).toContain('Request path: /v2/things')
    expect(writes).toContain('Status code:  500')
    expect(writes).toContain('Log ref:      ref-9')
    expect(writes).toContain('Response body:')
    expect(writes).toContain('"message": "oops"')
    expect(cmd.error).toHaveBeenCalledWith(err.message, { exit: 69 })
  })

  it('verbose ApiError with falsy body omits Response body section', () => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const cmd = {
      flags: { verbose: true },
      error: vi.fn(),
      exit: vi.fn(),
    }
    const err = new ApiError(500, { message: 'x' }, '/v2/x')
    err.body = null

    handleError(err, cmd)

    const writes = stderrSpy.mock.calls.map((c) => c[0]).join('')
    expect(writes).not.toContain('Response body:')
  })

  it('verbose ApiError without logRef omits the log ref line', () => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const cmd = {
      flags: { verbose: true },
      error: vi.fn(),
      exit: vi.fn(),
    }
    const err = new ApiError(404, { message: 'gone' }, '/v2/missing')

    handleError(err, cmd)

    const writes = stderrSpy.mock.calls.map((c) => c[0]).join('')
    expect(writes).toContain('Request path: /v2/missing')
    expect(writes).toContain('Status code:  404')
    expect(writes).not.toContain('Log ref:')
  })

  it('verbose flag has no effect on non-ApiError', () => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const cmd = {
      flags: { verbose: true },
      error: vi.fn(),
      exit: vi.fn(),
    }
    const err = new ConfigError('bad')

    handleError(err, cmd)

    expect(stderrSpy).not.toHaveBeenCalled()
    expect(cmd.error).toHaveBeenCalledWith('bad', { exit: 78 })
  })

  it('handles missing cmd.flags by defaulting to plain error', () => {
    const cmd = {
      error: vi.fn(),
      exit: vi.fn(),
    }
    const err = new CliError('oh no', { exitCode: 3 })

    handleError(err, cmd)

    expect(cmd.error).toHaveBeenCalledWith('oh no', { exit: 3 })
  })
})
