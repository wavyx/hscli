export class CliError extends Error {
  /** @param {string} message @param {{exitCode?: number, cause?: Error}} [options] */
  constructor(message, { exitCode = 1, cause } = {}) {
    super(message, { cause })
    this.exitCode = exitCode
  }
}

export class AuthRequiredError extends CliError {
  constructor() {
    super('Not authenticated. Run: hs auth login', { exitCode: 77 })
  }
}

export class ConfigError extends CliError {
  /** @param {string} message */
  constructor(message) {
    super(message, { exitCode: 78 })
  }
}

export class RateLimitError extends CliError {
  /** @param {number} retryAfter */
  constructor(retryAfter) {
    super(`Rate limited. Retry after ${retryAfter}s`, { exitCode: 75 })
    this.retryAfter = retryAfter
  }
}

export class ServiceUnavailableError extends CliError {
  constructor() {
    super('Help Scout API is unavailable', { exitCode: 69 })
  }
}

export class ApiError extends CliError {
  /**
   * @param {number} statusCode
   * @param {object} body
   * @param {string} path
   */
  constructor(statusCode, body, path) {
    const message =
      body?.error_description ||
      body?.message ||
      body?._embedded?.errors?.[0]?.message ||
      body?.error ||
      `API error ${statusCode}`

    const exitCode =
      statusCode === 422
        ? 65
        : statusCode === 403 || statusCode === 401
          ? 77
          : statusCode >= 500
            ? 69
            : 1

    super(`Help Scout API ${statusCode}: ${message}`, { exitCode })
    this.statusCode = statusCode
    this.path = path
    this.body = body
    this.logRef = body?.logRef
  }

  /**
   * @param {number} statusCode
   * @param {string} text
   * @param {string} path
   */
  static fromResponse(statusCode, text, path) {
    let body
    try {
      body = JSON.parse(text)
    } catch {
      body = { message: text }
    }
    return new ApiError(statusCode, body, path)
  }
}

/**
 * @param {Error} err
 * @param {import('@oclif/core').Command} cmd
 */
export function handleError(err, cmd) {
  const exitCode = err.exitCode ?? 70
  cmd.error(err.message, { exit: exitCode })
}
