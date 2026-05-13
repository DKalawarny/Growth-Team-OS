import IntegrationsSection from '../../components/settings/IntegrationsSection'

/**
 * IntegrationsSettings — third-party connections (QuickBooks today, more
 * later). The actual section component owns the per-integration state and
 * OAuth flows; this page is just the route wrapper.
 */
export default function IntegrationsSettings() {
  return (
    <div>
      <IntegrationsSection />
    </div>
  )
}
