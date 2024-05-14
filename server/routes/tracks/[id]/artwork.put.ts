import prisma from '~/utils/db'
import { createReadStream } from 'fs'
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdir, writeFile, rm } from 'fs/promises';
import sharp from 'sharp';
import { validateImageTrack } from '~/utils';
import pinataSDK from '@pinata/sdk'

export default defineEventHandler(async (event) => {
  const { user, track } = await ensureUserTrack(event)

  const form = await readFormData(event)
  const imageForm = form.get('image')
  if (!imageForm || imageForm === 'undefined') {
    throw createError({ statusCode: 400, statusMessage: 'No image file uploaded' })
  }

  const imageFile = imageForm as File
  const imageBuffer = Buffer.from(await imageFile.arrayBuffer())

  const tmp = join(tmpdir(), user.userId)
  const tmpFilePath = join(tmp, imageFile.name)

  await mkdir(tmp, { recursive: true })
  await writeFile(join(tmp, imageFile.name), imageBuffer)

  try {
    const imageMetadata = await sharp(tmpFilePath).metadata()
    validateImageTrack(imageMetadata)

    // store to local IPFS
    const { cid } = await useIpfs().put(imageFile.name, createReadStream(tmpFilePath), user.address)

    const { path, contenType } = await storeTrackImageToS3({
      userId: user.userId,
      id: track.id,
      filepath: tmpFilePath,
      filename: imageFile.name,
    })

    return await prisma.tracks.update({
      where: {
        id: track.id,
        user_id: user.userId
      },
      data: {
        artwork: path,
        artwork_ipfs_cid: cid,
      },
      select: {
        id: true,
      }
    })
  } catch (e) {
    consola.error(e)
    throw createError({
      statusMessage: `Error uploading artwork, ${(e as Error).message}`,
      statusCode: 500
    })
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
})