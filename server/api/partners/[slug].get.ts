import {
  getPartnerCampaignBySlug,
  getPartnerCampaignPublicPayload,
  getUserRedemptionForCampaign,
  normalizePartnerCampaignSlug
} from '../../utils/partner-campaigns'
import { getServerSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, message: 'Campaign slug is required' })
  }

  const session = await getServerSession(event)
  const payload = await getPartnerCampaignPublicPayload(slug, session?.user?.id)
  if (!payload) {
    throw createError({ statusCode: 404, message: 'Partner campaign not found' })
  }

  let userState: {
    authenticated: boolean
    alreadyRedeemed: boolean
    redemptionEndsAt: string | null
  } = {
    authenticated: false,
    alreadyRedeemed: false,
    redemptionEndsAt: null
  }

  if (session?.user?.id) {
    const campaign = await getPartnerCampaignBySlug(slug)
    const redemption = campaign
      ? await getUserRedemptionForCampaign(session.user.id, campaign.id)
      : null
    userState = {
      authenticated: true,
      alreadyRedeemed: Boolean(redemption),
      redemptionEndsAt: redemption?.endsAt.toISOString() ?? null
    }
  }

  return {
    campaign: payload.campaign,
    userState,
    slug: normalizePartnerCampaignSlug(slug)
  }
})
