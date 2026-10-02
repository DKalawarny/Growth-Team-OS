import { describe, it, expect } from 'vitest'
import { readReplyJson, soundsLikeCrisis } from './replyJson'

const obj = { reply: 'Call 988 now.', changes_plan: false, what_changed: null, stalling: false, crisis: true }

describe('readReplyJson', () => {
  it('plain JSON', () => expect(readReplyJson(JSON.stringify(obj)).crisis).toBe(true))
  it('fenced JSON', () => expect(readReplyJson('```json\n' + JSON.stringify(obj) + '\n```').crisis).toBe(true))
  it('🔴 the 2 Oct shape: prose, then fenced JSON', () => {
    const o = readReplyJson('Jess, putting the plan down.\n\nCall 988.\n\n```json\n' + JSON.stringify(obj, null, 2) + '\n```')
    expect(o.crisis).toBe(true); expect(o.reply).toBe('Call 988 now.')
  })
  it('🔴 the 2 Oct shape: prose, then bare JSON', () => {
    expect(readReplyJson('Jess, that word stopped everything.\n\n' + JSON.stringify(obj)).crisis).toBe(true)
  })
  it('prose only: never shows a code block', () => {
    expect(readReplyJson('Just words. ```json {broken').reply).toBe('Just words.')
  })
  it('braces inside the reply text do not break it', () => {
    expect(readReplyJson('x ' + JSON.stringify({ ...obj, reply: 'a {b} c' })).reply).toBe('a {b} c')
  })
})

describe('soundsLikeCrisis — both ways', () => {
  it('catches the ways people actually say it', () => {
    for (const t of ['lol i should just kms', 'maybe ill just unalive myself', 'they would be better off without me',
      'i dont want to wake up tomorrow', 'honestly done with it all', 'cant do this anymore', 'tired of existing',
      'I am scared to go home', 'he hits me when he drinks', 'thinking about suicide', 'I want to end it', 'kms', 'gonna kms tbh'])
      expect(soundsLikeCrisis(t), t).toBe(true)
  })
  it('does not fire on ordinary hardship or ordinary words', () => {
    for (const t of ['got canned today, gonna be on pogey till spring', 'I want to end my lease early', 'done with the night shift',
      'the market hits me with fees', 'skint till payday', 'I want to quit tomorrow', 'kilometres (kms) to work', 'ending the car loan', 'drove 40 kms to the site', 'it is 12kms away'])
      expect(soundsLikeCrisis(t), t).toBe(false)
  })
})
