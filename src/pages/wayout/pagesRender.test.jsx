import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import Enter from './Enter'
import Account from './Account'
import WayoutNotFound from './NotFound'
import { UnstuckTerms, UnstuckPrivacy } from './Legal'

/**
 * 🔴 3 Oct: a stray brace closed Enter() early and every line after it ran
 * outside the component — "params is not defined", the sign-in page replaced by
 * the error screen. The build passed and lint passed; only rendering it showed
 * it. So every page here is rendered once, and must render its own content.
 */
const render = (el, path = '/') => renderToStaticMarkup(
  <HelmetProvider><MemoryRouter initialEntries={[path]}>{el}</MemoryRouter></HelmetProvider>,
)

describe('Unstuck Map pages render', () => {
  it('sign in, with the email-link option', () => {
    const html = render(<Enter />, '/enter?in=1')
    expect(html).toContain('type="email"')
    expect(html).toContain('sign-in link')
  })
  it('create account', () => expect(render(<Enter />, '/enter')).toContain('Create my account'))
  it('your data', () => {
    const html = render(<Account />)
    expect(html).toContain('Download my data')
    expect(html).toContain('Delete my account')
  })
  it('not found', () => expect(render(<WayoutNotFound />)).toContain('is not here'))
  it('terms and privacy', () => {
    expect(render(<UnstuckTerms />)).toContain('not legal, financial, tax')
    expect(render(<UnstuckPrivacy />)).toContain('Who handles it for us')
  })
})
