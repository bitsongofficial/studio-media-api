import { z } from 'zod'
import { fileTypeFromBuffer } from "file-type"
import { fixedSize } from 'ipfs-unixfs-importer/chunker'
import { balanced } from 'ipfs-unixfs-importer/layout'
import prisma from '~/utils/db'

const schema = z.object({
  cid: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  // const user = await ensureAuth(event)
  // if (!user.isAdmin) {
  //   throw createError({ statusCode: 403, statusMessage: `You are not authorized to perform this action` })
  // }

  const { cid: queryCid } = await getValidatedQuery(event, schema.parse)

  const providerUrl = "https://yellow-hilarious-jay-665.mypinata.cloud/ipfs/"

  let file: unknown
  let buffer: Buffer
  let fileType: string

  try {
    consola.info(`Fetching ${providerUrl}${queryCid}`)
    file = await $fetch(`${providerUrl}${queryCid}`)
    consola.info(`Fetched ${providerUrl}${queryCid}`)
  } catch (error) {
    consola.error(`Error fetching ${providerUrl}${queryCid}: ${error.message}`)
    throw createError({
      statusMessage: `Error fetching ${providerUrl}${queryCid}: ${error.message}`,
      statusCode: 500
    })
  }

  if (file instanceof Blob) {
    buffer = Buffer.from(await file.arrayBuffer())
    fileType = (await fileTypeFromBuffer(buffer)).mime
  } else if (typeof file === 'object' || Array.isArray(file)) {
    buffer = Buffer.from(JSON.stringify(file))
    fileType = 'application/json'
  } else {
    throw createError({
      statusMessage: `cannot convert file to buffer: ${queryCid}`,
      statusCode: 500
    })
  }

  if (!fileType) {
    throw createError({
      statusMessage: `cannot determine filetype: ${queryCid}`,
      statusCode: 500
    })
  }

  const cid = await event.context.fs.addBytes(buffer, {
    // default kubo options
    cidVersion: 0,
    rawLeaves: false,
    layout: balanced({
      maxChildrenPerNode: 174
    }),
    chunker: fixedSize({
      chunkSize: 262144
    })
  })

  if (cid.toString() === '') {
    throw createError({
      statusMessage: 'Error uploading file',
      statusCode: 500
    })
  }

  if (cid.toV0().toString() !== queryCid) {
    consola.error(`CID mismatch: ${queryCid} !== ${cid.toV0().toString()}`)
    // throw createError({
    //   statusMessage: 'CID mismatch',
    //   statusCode: 500
    // })
  }

  consola.info(`Successfully imported ${queryCid}`)

  try {
    await prisma.storage_ipfs.create({
      data: {
        id: queryCid,
        owner: "pinata-import",
        name: queryCid,
        size: buffer.byteLength,
        mimetype: fileType,
      }
    })
  } catch (error) {
    consola.error(`Error adding file to database: ${error.message}`)
  }

  return {
    message: 'Successfully imported'
  }
})