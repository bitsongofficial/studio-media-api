import { z } from 'zod'
import prisma from '~/utils/db'

const schema = z.object({
  id: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  const user = await ensureAuth(event)
  const query = await getValidatedQuery(event, schema.parse)

  const tracks = await prisma.private_uploads.findMany({
    where: {
      NOT: {
        id: query.id.replace('private:', '')
      },
      AND: {
        user_id: user.userId
      }
    },
    take: 50
  })

  return tracks.map((track) => {
    return {
      id: `private:${track.id}`,
      title: track.name,
      artist: "",
      cover: track.artwork_cid,
      sources: {
        audio: track.audio_cid,
      }
    }
  })
})