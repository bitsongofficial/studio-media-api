import { fileTypeFromBuffer } from "file-type"
import { z } from 'zod'
import { verifiedFetch } from '@helia/verified-fetch'
import { CID } from 'multiformats/cid'
import { join } from "@prisma/client/runtime/library"
import { createReadStream } from "fs"
import { fixedSize } from 'ipfs-unixfs-importer/chunker'
import { balanced } from 'ipfs-unixfs-importer/layout'

const schema = z.object({
  cid: z.string(),
})

export default defineEventHandler(async (event) => {
  const { cid: queryCid } = await getValidatedQuery(event, schema.parse)

  const providerUrl = "https://yellow-hilarious-jay-665.mypinata.cloud/ipfs/"

  console.log('try fetching:', `ipfs://${queryCid}`)
  const file = await $fetch(`${providerUrl}${queryCid}`)
  console.log('fetched')

  const buffer = Buffer.from(await (file as Blob).arrayBuffer())

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

  console.log('cid:', cid.toV0().toString())

  if (cid.toV0().toString() !== queryCid) {
    throw createError({
      statusMessage: 'CID mismatch',
      statusCode: 500
    })
  }

  const filetype = await fileTypeFromBuffer(buffer);

  await prisma.storage_ipfs.create({
    data: {
      id: queryCid,
      owner: "aaa",
      name: queryCid,
      size: buffer.byteLength,
      mimetype: filetype?.mime,
    }
  })

  return {
    id: queryCid,
  }
})