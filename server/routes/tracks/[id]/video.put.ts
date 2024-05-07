import prisma from '~/utils/db'
import { createReadStream } from 'fs'
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdir, writeFile, rmdir, unlink } from 'fs/promises';
import pinataSDK from '@pinata/sdk'

export default defineEventHandler(async (event) => {
  const { user, track } = await ensureUserTrack(event)

  const form = await readFormData(event)
  const videoForm = form.get('video')
  if (!videoForm || videoForm === 'undefined') {
    throw createError({ statusCode: 400, statusMessage: 'No video file uploaded' })
  }

  const videoFile = videoForm as File
  const videoBuffer = Buffer.from(await videoFile.arrayBuffer())

  const tmp = join(tmpdir(), user.userId)
  const tmpFilePath = join(tmp, videoFile.name)

  await mkdir(tmp, { recursive: true })
  await writeFile(join(tmp, videoFile.name), videoBuffer)

  try {
    const videoData = await getMediaData(tmpFilePath)
    // TODO: validate video data ???

    // store to local IPFS
    const cid = await addFile(event, new Uint8Array(videoBuffer), videoFile.name)

    // pin to remote IPFS 
    const pinata = new pinataSDK(useRuntimeConfig().pinata.apiKey, useRuntimeConfig().pinata.apiSecret);
    const { IpfsHash } = await pinata.pinFileToIPFS(createReadStream(tmpFilePath), { pinataMetadata: { name: videoFile.name } })

    if (cid !== IpfsHash) {
      throw createError({ statusCode: 500, statusMessage: 'Error pinning file' })
    }

    const { format_name, duration, size, bit_rate } = videoData.format

    const { contenType, path } = await storeTrackVideoToS3({
      userId: user.userId,
      id: track.id,
      filepath: tmpFilePath,
      filename: videoFile.name,
    })

    const trackRecord = await prisma.tracks.update({
      where: {
        id: track.id,
        user_id: user.userId,
      },
      data: {
        video: path,
        video_mime_type: contenType,
        video_format: format_name,
        video_duration: Math.round(duration! * 1000),
        video_bit_rate: bit_rate,
        video_size: size,
      }
    })

    return trackRecord
  } catch (e) {
    consola.error(e)
    throw createError({
      statusMessage: `Error uploading video, ${(e as Error).message}`,
      statusCode: 500
    })
  } finally {
    await unlink(tmpFilePath)
    await rmdir(tmp)
  }
})