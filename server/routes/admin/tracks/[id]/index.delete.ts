import { useTrack } from "~/utils/track"
import { z } from 'zod'

const schema = z.object({
  id: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  const user = await ensureAuth(event)
  if (!user.isAdmin) {
    throw createError({
      statusMessage: 'Unauthorized',
      statusCode: 401
    })
  }

  const { id: trackId } = await getValidatedRouterParams(event, schema.parse)

  try {
    await useTrack().del(trackId)
  } catch (error) {
    console.error('Error deleting track', error)
    throw createError({ statusMessage: 'Error deleting track', statusCode: 500 })
  }

  return {
    success: true
  }
})