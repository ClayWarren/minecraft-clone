import { describe, it, expect } from 'vitest'
import { add } from '../../src/test-precommit'

describe('add function', () => {
  it('should add two numbers correctly', () => {
    expect(add(2, 3)).toBe(5)
  })
})
