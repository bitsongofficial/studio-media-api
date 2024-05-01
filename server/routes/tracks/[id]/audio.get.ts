import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export default defineEventHandler(async (event) => {
  const { track } = await ensureUserTrack(event)

  const url = await getSignedUrl(
    getS3Client(),
    new GetObjectCommand({
      Bucket: useRuntimeConfig().s3.bucket,
      Key: `${track.audio}`,
    }),
    {
      expiresIn: 1 * 60 * 60, // 1 hour
    },
  )

  return sendRedirect(event, url)
})