import { v4 as uuidv4 } from 'uuid';
import { getMediaData, validateAudioData } from '~/utils';
import prisma from '~/utils/db'
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdir, writeFile, unlink, rm } from 'fs/promises';
import pinataSDK from '@pinata/sdk'
import { createReadStream } from 'fs'

export default defineEventHandler(async (event) => {
  const user = await ensureAuth(event)
  if (!user.canUpload) {
    throw createError({ statusCode: 403, statusMessage: "Unauthorized" })
  }

  const form = await readFormData(event)
  const audioForm = form.get('audio')
  if (!audioForm || audioForm === 'undefined') {
    throw createError({ statusCode: 400, statusMessage: 'No audio file uploaded' })
  }

  const audioFile = audioForm as File
  const audioBuffer = Buffer.from(await audioFile.arrayBuffer())

  const tmpDir = join(tmpdir(), user.userId)
  const tmpFilePath = join(tmpDir, audioFile.name)

  await mkdir(tmpDir, { recursive: true })
  await writeFile(join(tmpDir, audioFile.name), audioBuffer)

  try {
    const audioData = await getMediaData(tmpFilePath)
    validateAudioData(audioData)

    const trackId = uuidv4()

    // store to local IPFS
    const { cid } = await useIpfs().put(audioFile.name, createReadStream(tmpFilePath), user.address)

    const { contenType, path } = await storeTrackToS3({
      userId: user.userId,
      id: trackId,
      filepath: tmpFilePath,
      filename: audioFile.name,
    })

    const { format_name, duration, size } = audioData.format
    const newTrack = await prisma.tracks.create({
      data: {
        id: trackId,
        user_id: user.userId,
        audio: path,
        audio_ipfs_cid: cid,
        audio_mime_type: contenType,
        format: format_name,
        duration: Math.round(duration! * 1000),
        size: size,
      }
    })

    return {
      id: newTrack.id
    }
  } catch (e) {
    consola.error(e)
    throw createError({
      statusMessage: `Error uploading audio file, ${(e as Error).message}`,
      statusCode: 500
    })
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})