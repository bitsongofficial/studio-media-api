import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import prisma from '~/utils/db'

export default defineEventHandler(async (event) => {
  const user = await ensureAuth(event)
  if (!user.canUpload) throw createError({ status: 403, message: "Unauthorized" })

  const tracks = await prisma.tracks.findMany({
    where: {
      user_id: user.userId
    },
    select: {
      id: true,
      title: true,
      artwork: true,
      status: true,
    },
    take: 10,
    orderBy: {
      created_at: 'desc'
    }
  })

  const url = event.node.req.headers.host
  if (!url) throw createError({ status: 500, message: "Missing host" })

  return await withPrivateSignedUrls(tracks, url)
})

export async function withPrivateSignedUrls(tracks: {
  id: string;
  title: string | null;
  artwork: string | null;
}[], baseUrl: string): Promise<{
  id: string;
  title: string | null;
  artwork: string | null;
}[] | null> {
  return Promise.all(tracks.map(async (track) => {
    if (baseUrl.startsWith('media')) {
      baseUrl = `https://${baseUrl}`
    }

    if (!track.artwork) return {
      ...track,
      artwork: `${baseUrl}/images/default.png`
    }

    const url = await getSignedUrl(
      getS3Client(),
      new GetObjectCommand({
        Bucket: useRuntimeConfig().s3.bucket,
        Key: `${track.artwork}`,
      }),
      {
        expiresIn: 1 * 60 * 60, // 1 hour
      },
    )

    return {
      ...track,
      artwork: url
    }
  }))
}