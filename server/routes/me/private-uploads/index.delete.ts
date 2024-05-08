import prisma from "~/utils/db"
import { z } from "zod"

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1)
})

export default defineEventHandler(async (event) => {
  const user = await ensureAuth(event)

  try {
    const { ids } = await readValidatedBody(event, schema.parse)

    // const tracks = await prisma.private_uploads.findMany({
    //   where: {
    //     AND: {
    //       id: {
    //         in: ids
    //       },
    //       user_id: user.userId
    //     }
    //   }
    // })

    // 1. TODO: Remove from helia
    // for await (const key of event.context.blockstore.deleteMany(tracks.map(t => CID.parse(t.audio_cid)))) {
    //   console.log(`deleted content with key ${key}`)
    //   await event.context.datastore.delete(new Key(key.toString()))
    // }
    // for await (const key of event.context.datastore.delete()
    //   console.log(`deleted content with key ${key}`)
    // }
    // 2. Remove from pinning service

    await prisma.private_uploads.deleteMany({
      where: {
        AND: {
          id: {
            in: ids
          },
          user_id: user.userId
        }
      }
    })
  } catch (e) {
    consola.error(e)
    throw createError({ statusCode: 400, statusMessage: `Error deleting files` })
  }

  return {
    success: true
  }
})