import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import prisma from '~/utils/db'
import { createReadStream } from 'fs'

export default defineEventHandler(async (event) => {
  const user = await ensureAuth(event)
  const id = getRouterParam(event, 'id')

  const _track = await prisma.tracks.findUnique({
    where: {
      id: id!,
      user_id: user.userId
    }
  })

  if (!_track) {
    throw createError({
      message: 'Track not found',
      status: 404
    })
  }

  const { files } = await readForm(event, {
    maxFileSize: 300 * 1024 * 1024, // 300MB
    maxFieldsSize: 0,
    maxFields: 0,
    maxFiles: 1,
    keepExtensions: true,
  })

  const _file = Array.isArray(files.video) ? files.video[0] : files.video
  if (!_file || _file.originalFilename === null || _file.mimetype === null) {
    throw createError({
      message: 'No file',
      status: 400
    })
  }

  if (!_file.mimetype.startsWith('video/')) {
    throw createError({
      message: 'No video file',
      status: 400
    })
  }

  try {
    const videoData = await getMediaData(_file.filepath)
    const { format_name, duration, size, bit_rate } = videoData.format

    const fileExtension = _file.originalFilename.split('.').pop()
    const newFilename = `video.${fileExtension}`

    const { contenType, path } = await storeTrackVideoToS3({
      userId: user.userId,
      id: id!,
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

    try {
      await prisma.storage_ipfs.create({
        data: {
          id: cid.toString(),
          owner: user.address,
          name: _file.filepath,
          size: size,
          mimetype: contenType,
        }
      })
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError) {
        console.error(`Prisma error: ${e.message}`)
      } else {
        console.error(`Something went wrong: ${e}`)
      }
    }

    const track = await prisma.tracks.update({
      where: {
        id: id!,
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

    return track
  } catch (e) {
    console.log(e)
    throw createError({
      message: 'Error uploading file',
      status: 500
    })
  }
})