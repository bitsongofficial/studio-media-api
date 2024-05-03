import { v4 as uuidv4 } from 'uuid';
import { getMediaData, validateAudioData, readForm } from '~/utils';
import prisma from '~/utils/db'
import { createReadStream } from 'fs';

export default defineEventHandler(async (event) => {
  const user = await ensureAuth(event)
  if (!user.canUpload) throw createError({ status: 403, message: "Unauthorized" })

  const { files } = await readForm(event, {
    maxFileSize: 300 * 1024 * 1024, // 300M
    maxFieldsSize: 0,
    maxFields: 0,
    maxFiles: 1,
    keepExtensions: true,
  })

  const _file = Array.isArray(files.audio) ? files.audio[0] : files.audio
  if (!_file || _file.originalFilename === null || _file.mimetype === null) {
    throw createError({
      message: 'No file',
      status: 400
    })
  }

  try {
    const audio = await getMediaData(_file.filepath)
    const { format_name, duration, size } = audio.format
    validateAudioData(audio)

    const id = uuidv4()
    const newFilename = `audio.${format_name}`

    const { contenType, path } = await storeTrackToS3({
      userId: user.userId,
      id,
      filepath: _file.filepath,
      filename: newFilename,
    })

    /**
     * TODO: implement IPFS storage
     *  
     */
    const cid = await event.context.fs.addFile({
      content: createReadStream(_file.filepath),
      path: _file.filepath,
    })

    if (cid.toString() === '') {
      throw createError({
        statusMessage: 'Error uploading file',
        statusCode: 500
      })
    }

    await prisma.storage_ipfs.create({
      data: {
        id: cid.toString(),
        owner: user.address,
        name: _file.filepath,
        size: size,
        mimetype: contenType,
      }
    })
    /////////////////

    const newTrack = await prisma.tracks.create({
      data: {
        id,
        user_id: user.userId,
        audio: path,
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
    console.error((e as Error).message)

    throw createError({
      message: `Error processing file ${(e as Error).message}`,
      status: 500
    })
  }
})