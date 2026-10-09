import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import Playbook from './Playbook'

// 9 Oct, Daniel: "whys it like this when click back through walk through with
// the lines". The fade wrapped the whole page, so the button that fixes it
// looked switched off. Only the old instructions may fade.
const render = props => renderToStaticMarkup(
  <HelmetProvider><MemoryRouter>
    <Playbook play={{ title: 'The old move', first: 'Do the old thing' }} index={1} {...props}>
      <p id="child">ask box</p>
    </Playbook>
  </MemoryRouter></HelmetProvider>,
)

describe('a superseded walkthrough', () => {
  const html = render({
    superseded: true,
    notice: <div className="wayout__stale"><button className="wayout__btn">Write the walkthrough for this move</button></div>,
  })
  const fadeAt = html.indexOf('wayout__superseded')

  it('fades the old instructions', () => {
    expect(fadeAt).toBeGreaterThan(-1)
    expect(html.indexOf('id="child"')).toBeGreaterThan(fadeAt)
  })

  it('keeps the way back, the notice and its button outside the fade', () => {
    expect(html.indexOf('The whole plan')).toBeLessThan(fadeAt)
    expect(html.indexOf('Write the walkthrough for this move')).toBeLessThan(fadeAt)
  })

  it('does not fade a current walkthrough', () => {
    expect(render({}).includes('wayout__superseded')).toBe(false)
  })
})
