import { vi } from 'vitest'

// Mock WebSocket for server tests
global.WebSocket = vi.fn().mockImplementation(() => ({
  readyState: 1, // OPEN
  send: vi.fn(),
  close: vi.fn(),
  on: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
})) as any

// Mock WebSocketServer
vi.mock('ws', () => ({
  WebSocketServer: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn()
  })),
  WebSocket: global.WebSocket
}))

// Mock file system operations
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn()
}))

// Mock path operations
vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
  resolve: vi.fn((...args) => args.join('/'))
}))

// Global test utilities
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn()
}
