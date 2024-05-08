import { tmpdir } from 'os';
import { join } from 'path';
import { mkdir, writeFile, rm, unlink } from 'fs/promises';
import { fileTypeFromBuffer } from 'file-type';
import { nanoid } from 'nanoid';
import prisma from '~/utils/db';

export default defineEventHandler(async (event) => {
  const user = await ensureAuth(event)

  const form = await readFormData(event)

  const files = form.getAll('audio') as File[]
  if (!files) {
    throw createError({ statusCode: 400, statusMessage: 'No audio file uploaded' })
  }

  for (const file of files) {
    consola.info(`Uploading ${file.name}, size: ${file.size} bytes`)

    const tmp = join(tmpdir(), user.userId)
    const tmpFilePath = join(tmp, file.name)

    try {
      const fileBuffer = Buffer.from(await file.arrayBuffer())

      await mkdir(tmp, { recursive: true })
      await writeFile(join(tmp, file.name), fileBuffer)

      const data = await getMediaData(tmpFilePath)
      validateAudioData(data, {
        maxDuration: 3 * 60 * 60, // 3 hours
        maxSize: 300 * 1024 * 1024, // 300 MB,
        allowedFormats: ['wav', 'mp3', 'flac', 'ogg']
      })

      // store to local IPFS
      const cid = await addFile(event, new Uint8Array(fileBuffer), file.name, { storeOnDb: false })
      consola.info(`Uploaded to IPFS: ${cid}`)

      const fileType = await fileTypeFromBuffer(fileBuffer);
      const { format_name, duration, size } = data.format

      await prisma.private_uploads.create({
        data: {
          id: nanoid(10),
          user_id: user.userId,
          status: 'Pending',
          name: file.name,
          duration,
          audio_cid: cid,
          mimetype: fileType?.mime,
          size: Number(size.toString()),
        }
      })

      consola.info(`Stored to database: ${file.name}`)
    } catch (e) {
      throw createError({ statusCode: 400, statusMessage: `Error uploading file: ${e.message}` })
    } finally {
      await unlink(tmpFilePath)
      await rm(tmp, { recursive: true })
    }
  }

  return {
    success: true
  }
})