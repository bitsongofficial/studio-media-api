import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Prisma } from "@prisma/client";

export default defineEventHandler(async (event) => {
  const { track } = await ensureUserTrack(event)
  const url = event.node.req.headers.host
  if (!url) throw createError({ status: 500, message: "Missing host" })

  //const url = useSiteConfig(event).url
  return await withPrivateSignedUrls(track, url)
})

type TrackWithSignedUrls = Prisma.tracksGetPayload<{
  include: {
    artists: true,
    authors_publishers: true,
    marketplace: true,
    royalties_info: true,
  }
}>

async function withPrivateSignedUrls(track: TrackWithSignedUrls, baseUrl: string): Promise<TrackWithSignedUrls> {
  let artwork, audio, video;

  if (baseUrl.startsWith('media')) {
    baseUrl = `https://${baseUrl}`
  }

  if (track.artwork) {
    artwork = await getSignedUrl(
      getS3Client(),
      new GetObjectCommand({
        Bucket: useRuntimeConfig().s3.bucket,
        Key: `${track.artwork}`,
      }),
      {
        expiresIn: 1 * 60 * 60, // 1 hour
      },
    )
  } else {
    artwork = `${baseUrl}/images/default.png`
  }

  if (track.audio) {
    audio = await getSignedUrl(
      getS3Client(),
      new GetObjectCommand({
        Bucket: useRuntimeConfig().s3.bucket,
        Key: `${track.audio}`,
      }),
      {
        expiresIn: 1 * 60 * 60, // 1 hour
      },
    )
  }

  if (track.video) {
    video = await getSignedUrl(
      getS3Client(),
      new GetObjectCommand({
        Bucket: useRuntimeConfig().s3.bucket,
        Key: `${track.video}`,
      }),
      {
        expiresIn: 1 * 60 * 60, // 1 hour
      },
    )
  }

  return {
    ...track,
    artwork: artwork || null,
    audio: audio || null,
    video: video || null,
  }
}