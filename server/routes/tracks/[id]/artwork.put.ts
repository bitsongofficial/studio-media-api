import prisma from '~/utils/db'
import { createReadStream } from 'fs'
import fs from 'fs'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

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
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFieldsSize: 0,
    maxFields: 0,
    maxFiles: 1,
    keepExtensions: true,
  })

  const _file = Array.isArray(files.image) ? files.image[0] : files.image
  if (!_file || _file.originalFilename === null || _file.mimetype === null) {
    throw createError({
      message: 'No file',
      status: 400
    })
  }

  if (!_file.mimetype.startsWith('image/jp')) {
    throw createError({
      message: 'No image file',
      status: 400
    })
  }

  try {
    const fileExtension = _file.originalFilename.split('.').pop()
    const newFilename = `artwork.${fileExtension}`

    // TODO: add validation
    // - file format jpg
    // - square aspect ratio
    // - 72dpi
    // - RGB
    // - min 3000x3000px
    // - max 15000x15000px

    const { path, contenType } = await storeTrackImageToS3({
      userId: user.userId,
      id: id!,
      filepath: _file.filepath,
      filename: newFilename,
    })

    // get file size
    const stat = await fs.promises.stat(_file.filepath)

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
          size: stat.size,
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

    return await prisma.tracks.update({
      where: {
        id: id!,
        user_id: user.userId
      },
      data: {
        artwork: path
      },
      select: {
        id: true,
      }
    })
  } catch (e) {
    throw createError({
      message: 'Error uploading file',
      status: 500
    })
  }
})