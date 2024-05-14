import prisma from "~/utils/db"
import { z } from "zod"

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1)
})

export default defineEventHandler(async (event) => {
  const user = await ensureAuth(event)

  try {
    const { ids } = await readValidatedBody(event, schema.parse)

    for (const id of ids) {
      const data = await prisma.private_uploads.findFirst({
        where: {
          AND: {
            id,
            user_id: user.userId
          }
        }
      })

      if (data === null) {
        throw createError({ statusCode: 404, statusMessage: `File not found: ${id}` })
      }

      await useIpfs().del(data.audio_cid, user.address)

      await prisma.private_uploads.delete({
        where: {
          id
        }
      })
    }
  } catch (e) {
    consola.error(e)
    throw createError({ statusCode: 400, statusMessage: `Error deleting files` })
  }

  return {
    success: true
  }
})