import { useAuth } from '../../hooks/useAuth'
import TeamSection          from '../../components/settings/TeamSection'
import AdvisorAccessSection from '../../components/settings/AdvisorAccessSection'

/**
 * TeamSettings — everyone with access to this workspace.
 *
 * Two cards:
 *   1. Team — staff members who can be assigned tasks on the Work Board.
 *      These are people INSIDE the business.
 *   2. Advisor access — read-only invites for coaches, accountants, mentors.
 *      These are people OUTSIDE the business who need visibility.
 *
 * Combined under one tab because they're the same mental model from the
 * owner's perspective: "who can see and act in my workspace."
 */
export default function TeamSettings() {
  const { profile, company } = useAuth()

  // Welcome email needs the owner's display name and company name. Fall back
  // to email-prefix / "your team" so the message still renders if a profile
  // is missing the optional fields.
  const ownerName   = profile?.full_name || profile?.name || profile?.email?.split('@')[0] || 'Your manager'
  const companyName = company?.name || 'the team'

  return (
    <div className="space-y-4">
      <TeamSection
        companyId={profile?.company_id}
        companyName={companyName}
        ownerName={ownerName}
      />
      <AdvisorAccessSection companyId={profile?.company_id} userId={profile?.id} />
    </div>
  )
}
