import type { H3Event } from 'h3'
import type { VerifiedFetchInit } from '@helia/verified-fetch'
import { AbortError } from '@libp2p/interface'
import { fileTypeFromBuffer, fileTypeFromStream, fileTypeFromBlob } from 'file-type'
import { fixedSize } from 'ipfs-unixfs-importer/chunker'
import { balanced } from 'ipfs-unixfs-importer/layout'
import { importBytes, importByteStream, importFile, ByteStream } from 'ipfs-unixfs-importer'
import type { ImporterOptions, ImportContent } from 'ipfs-unixfs-importer'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import prisma from './db'

// default kubo options
const defaultKuboOptions: ImporterOptions = {
  cidVersion: 0,
  rawLeaves: false,
  layout: balanced({
    maxChildrenPerNode: 174
  }),
  chunker: fixedSize({
    chunkSize: 262144 // 256KB
  })
}

interface AddFileOptions {
  storeOnDb: boolean
}

export async function addFile(event: H3Event, body: Uint8Array, name: string, options: AddFileOptions = { storeOnDb: true }): Promise<string> {
  const { cid, size } = await importFile({ path: name, content: body }, event.context.blockstore, defaultKuboOptions)
  const mimetype = (await fileTypeFromBuffer(body))?.mime

  const cidV0 = cid.toV0().toString()

  if (cidV0 === '' || cidV0 === undefined || cidV0 === 'undefined') {
    throw new Error('Error uploading file')
  }

  if (options.storeOnDb) {
    try {
      await prisma.storage_ipfs.upsert({
        create: {
          id: cidV0,
          owner: "",
          name,
          size: Number(size.toString()),
          mimetype
        },
        update: {},
        where: {
          id: cidV0
        },
      })
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error(`Prisma error: ${error.message}`)
      } else {
        throw new Error(`Error adding file to database: ${error.message}`)
      }
    }
  }

  return cidV0
}

// taken from https://github.com/ipfs/helia-verified-fetch/blob/main/packages/verified-fetch/src/utils/get-stream-from-async-iterable.ts
export async function getStreamFromAsyncIterable(
  iterator: AsyncIterable<Uint8Array>,
  options?: Pick<VerifiedFetchInit, 'onProgress' | 'signal'>
): Promise<{ stream: ReadableStream<Uint8Array>, firstChunk: Uint8Array }> {
  const reader = iterator[Symbol.asyncIterator]()
  const { value: firstChunk, done } = await reader.next()

  if (done === true) {
    throw new Error('No content found')
  }

  const stream = new ReadableStream({
    async start(controller) {
      // the initial value is already available
      //options?.onProgress?.(new CustomProgressEvent<void>('verified-fetch:request:progress:chunk'))
      controller.enqueue(firstChunk)
    },
    async pull(controller) {
      const { value, done } = await reader.next()
      if (options?.signal?.aborted === true) {
        controller.error(new AbortError(options.signal.reason ?? 'signal aborted by user'))
        controller.close()
        return
      }

      if (done === true) {
        if (value != null) {
          //options?.onProgress?.(new CustomProgressEvent<void>('verified-fetch:request:progress:chunk'))
          controller.enqueue(value)
        }
        controller.close()
        return
      }

      //options?.onProgress?.(new CustomProgressEvent<void>('verified-fetch:request:progress:chunk'))
      controller.enqueue(value)
    }
  })

  return {
    stream,
    firstChunk
  }
}