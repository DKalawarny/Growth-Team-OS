import { describe, it, expect } from 'vitest'
import { parseModelJson } from './parseModelJson'

/**
 * The test that would have caught both bugs before Daniel hit them.
 *
 * ⭐ The first case is the whole point: callClaude({json:true}) hands back a
 * STRING. Two generators assumed an object and threw on every response,
 * including good ones, and neither had been run.
 */
describe('parsing what the model actually returns', () => {
  it('parses the STRING that callClaude hands back', () => {
    expect(parseModelJson('{"headline":"Out in twelve months"}').headline)
      .toBe('Out in twelve months')
  })

  it('passes an already-parsed object straight through', () => {
    const o = { headline: 'x' }
    expect(parseModelJson(o)).toBe(o)
  })

  it('names TRUNCATION rather than blaming the parser', () => {
    // The commonest real failure: the token ceiling cut it off mid-object.
    expect(() => parseModelJson('{"title":"Pressure wash","words":{"script":"Hi Dav'))
      .toThrow(/cut off/i)
  })

  it('says unreadable only when it really is', () => {
    expect(() => parseModelJson('not json at all }')).toThrow(/unreadable/i)
  })

  it('treats empty as empty, not as unreadable', () => {
    expect(() => parseModelJson('   ')).toThrow(/empty/i)
    expect(() => parseModelJson(null)).toThrow(/empty/i)
  })

  it('names which artifact failed, so the message is useful on screen', () => {
    expect(() => parseModelJson('', 'The plan')).toThrow(/^The plan/)
  })
})
