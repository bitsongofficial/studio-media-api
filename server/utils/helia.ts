// taken from https://github.com/ipfs/helia-verified-fetch/blob/main/packages/verified-fetch/src/utils/get-stream-from-async-iterable.ts

import type { VerifiedFetchInit } from '@helia/verified-fetch'
import { AbortError, type ComponentLogger } from '@libp2p/interface'

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