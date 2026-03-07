const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  log: isDevelopment ? console.log : () => {},
  warn: isDevelopment ? console.warn : () => {},
  error: console.error,
  debug: isDevelopment ? console.debug : () => {},
}
