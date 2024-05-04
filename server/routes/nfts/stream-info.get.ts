import { TrackSchema } from '@bitsongjs/metadata'
import { getBs721TrackInfo } from '~/utils/bitsong'
import { z } from 'zod'

interface StreamInfoResponse {
  id: string
  title: string
  artist: string
  cover: string
  sources: {
    audio: string
    video?: string
  }
}

const schema = z.object({
  ids: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, schema.parse)

  const records = await getBs721TrackInfo(query.ids.split(',') as string[])

  return records.map((record) => {
    return {
      id: record.id,
      title: record.name,
      artist: record.bitsong.artists.map((artist) => artist.name).join(', '),
      cover: record.image,
      sources: {
        audio: record.bitsong.audio,
        video: record.bitsong.video || record.animation_url,
      }
    }
  })
})