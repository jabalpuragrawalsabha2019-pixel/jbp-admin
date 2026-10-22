/**
 * Contact Request API for mobile app
 *
 * GET  — ?profileId=...   list contact requests for a profile (owner view)
 * POST — { profileId, requesterProfileId, usePersonalProfile, personalDetails }  create request
 * PATCH  — { id, status }  requester can withdraw, owner can accept/reject
 */
import { NextRequest } from 'next/server'
import { corsOptions, json } from '@/lib/server/http'
import { requireUser } from '@/lib/server/auth'
import { getServiceSupabase } from '@/lib/server/supabaseAdmin'

export async function OPTIONS() {
  return corsOptions()
}

export async function GET(request: NextRequest) {
  const user = await requireUser(request)
  if (!user) return json({ error: 'Unauthorized' }, 401)

  try {
    const url = new URL(request.url)
    const profileId = url.searchParams.get('profileId')

    const admin = getServiceSupabase()

    let query = admin
      .from('contact_requests')
      .select(`
        *,
        requester:users!contact_requests_requester_id_fkey (id, full_name, phone, email),
        requester_profile:matrimonial_profiles!contact_requests_requester_profile_id_fkey (id, candidate_name, gender, city, gotra)
      `)
      .order('created_at', { ascending: false })

    if (profileId) {
      // Owner viewing requests for their profile. Verify ownership first:
      // without this check any authenticated member could read another
      // family's requests (including requester phone/email) by passing an
      // arbitrary profileId.
      const { data: ownedProfile, error: ownedError } = await admin
        .from('matrimonial_profiles')
        .select('id')
        .eq('id', profileId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (ownedError) return json({ error: ownedError.message }, 500)
      if (!ownedProfile) return json({ error: 'Forbidden' }, 403)

      query = query.eq('profile_id', profileId)
    } else {
      // Requester viewing their own sent requests
      query = query.eq('requester_id', user.id)
    }

    const { data, error } = await query

    if (error) return json({ error: error.message }, 500)
    return json({ data: data || [] })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request)
  if (!user) return json({ error: 'Unauthorized' }, 401)

  try {
    // Only verified members can send contact requests
    const admin = getServiceSupabase()
    const { data: userProfile } = await admin
      .from('users')
      .select('is_verified')
      .eq('id', user.id)
      .single()

    if (!userProfile?.is_verified) {
      return json({ error: 'Only verified members can send contact requests' }, 403)
    }

    const body = await request.json()
    const {
      profileId,
      requesterProfileId,
      usePersonalProfile,
      personalName,
      personalPhone,
      personalEmail,
      personalGotra,
      personalCity,
    } = body

    if (!profileId) return json({ error: 'profileId is required' }, 400)

    // Verify the profile exists and is approved
    const { data: targetProfile, error: profileError } = await admin
      .from('matrimonial_profiles')
      .select('id, user_id, status, candidate_name, hide_phone')
      .eq('id', profileId)
      .single()

    if (profileError || !targetProfile) {
      return json({ error: 'Profile not found' }, 404)
    }

    if (targetProfile.status !== 'approved') {
      return json({ error: 'Contact requests can only be sent for approved profiles' }, 400)
    }

    // Can't send request to own profile
    if (targetProfile.user_id === user.id) {
      return json({ error: 'Cannot send contact request to your own profile' }, 400)
    }

    // If using a requester profile, verify it belongs to the user
    if (requesterProfileId) {
      const { data: reqProfile, error: reqProfileError } = await admin
        .from('matrimonial_profiles')
        .select('id, user_id')
        .eq('id', requesterProfileId)
        .single()

      if (reqProfileError || !reqProfile || reqProfile.user_id !== user.id) {
        return json({ error: 'Invalid requester profile' }, 400)
      }
    }

    if (!requesterProfileId && !usePersonalProfile) {
      return json(
        { error: 'Choose one of your profiles or provide personal details' },
        400,
      )
    }

    // Validate personal profile fields if usePersonalProfile is true
    if (usePersonalProfile) {
      if (!personalName || !personalPhone || !personalEmail) {
        return json({ error: 'Personal name, phone, and email are required when using personal profile' }, 400)
      }
    }

    // Create the contact request
    const { data, error } = await admin
      .from('contact_requests')
      .insert({
        profile_id: profileId,
        requester_id: user.id,
        requester_profile_id: requesterProfileId || null,
        use_personal_profile: usePersonalProfile || false,
        personal_name: personalName || null,
        personal_phone: personalPhone || null,
        personal_email: personalEmail || null,
        personal_gotra: personalGotra || null,
        personal_city: personalCity || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return json({ error: 'A contact request already exists for this profile' }, 409)
      }
      return json({ error: error.message }, 500)
    }

    // Create notification for profile owner
    await admin.from('notifications').insert({
      user_id: targetProfile.user_id,
      type: 'contact_request',
      title: 'New Contact Request',
      body: `You have a new contact request for "${targetProfile.candidate_name || 'your profile'}"`,
      data: { contactRequestId: data.id, profileId: targetProfile.id },
    })

    return json({ data })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}

export async function PATCH(request: NextRequest) {
  const user = await requireUser(request)
  if (!user) return json({ error: 'Unauthorized' }, 401)

  try {
    const body = await request.json()
    const id = body.id as string
    const status = body.status as string

    if (!id || !['accepted', 'rejected', 'withdrawn'].includes(status)) {
      return json({ error: 'id and valid status (accepted|rejected|withdrawn) required' }, 400)
    }

    const admin = getServiceSupabase()

    // Get the contact request
    const { data: request_data, error: reqError } = await admin
      .from('contact_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (reqError || !request_data) {
      return json({ error: 'Contact request not found' }, 404)
    }

    // Authorization: requester can withdraw, profile owner can accept/reject
    const isRequester = request_data.requester_id === user.id
    const isProfileOwner = await admin
      .from('matrimonial_profiles')
      .select('user_id')
      .eq('id', request_data.profile_id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => !!data)

    if (status === 'withdrawn' && !isRequester) {
      return json({ error: 'Only the requester can withdraw a request' }, 403)
    }

    if (['accepted', 'rejected'].includes(status) && !isProfileOwner) {
      return json({ error: 'Only the profile owner can accept or reject' }, 403)
    }

    if (request_data.status !== 'pending') {
      return json({ error: 'Can only update pending requests' }, 400)
    }

    const { error } = await admin
      .from('contact_requests')
      .update({ status })
      .eq('id', id)

    if (error) return json({ error: error.message }, 500)

    // Notify the other party.
    const otherPartyId = isRequester
      ? (await admin.from('matrimonial_profiles').select('user_id').eq('id', request_data.profile_id).single()).data?.user_id
      : request_data.requester_id

    if (otherPartyId) {
      const statusText = status === 'accepted' ? 'accepted' : status === 'rejected' ? 'rejected' : 'withdrawn'
      await admin.from('notifications').insert({
        user_id: otherPartyId,
        type: 'contact_request_update',
        title: 'Contact Request Update',
        body: `Your contact request was ${statusText}`,
        data: { contactRequestId: id, status },
      })
    }

    return json({ success: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Server error' }, 500)
  }
}