//import { getStreamFromAsyncIterable } from '~/utils/helia'
import prisma from '~/utils/db';

export default eventHandler(async (event) => {
  //const user = await ensureAuth(event)
  // const cid: string = getRouterParam(event, 'cid')
  // const { fs } = event.context

  // try {
  //   console.log('fetching from helia...')
  //   if (fs === undefined) throw new Error('fs is undefined')

  //   const data = await prisma.private_uploads.findFirst({
  //     where: {
  //       AND: {
  //         audio_cid: cid,
  //         //user_id: user.userId
  //       }
  //     }
  //   })
  //   if (data === null) throw createError({
  //     statusCode: 404,
  //     statusMessage: 'Not Found',
  //   })

  //   const getBodyStream = async (offset?: number, length?: number): Promise<ReadableStream<Uint8Array>> => {
  //     const iter = fs.cat(CID.parse(cid), { offset, length })
  //     const { stream } = await getStreamFromAsyncIterable(iter)
  //     return stream
  //   }

  //   setResponseHeaders(event, {
  //     'Content-Type': data.mimetype,
  //     'Accept-Ranges': 'bytes',
  //     'Access-Control-Allow-Origin': '*',
  //     'Cache-Control': 'public, max-age=3600', // 1h
  //     "Server": "BitSong Media Server",
  //   })

  //   const headers = getHeaders(event)
  //   if (headers.range) {
  //     const range = rangeParser(data.size, headers.range)

  //     if (range === -1 || !(Array.isArray(range) && range.length)) {
  //       console.log('---> Serving full file')

  //       return sendStream(event, await getBodyStream())
  //     }

  //     const start = range[0].start
  //     const end = range[0].end

  //     setResponseStatus(event, 206)
  //     setResponseHeader(event, 'Content-Range', `bytes ${start}-${end}/${data.size}`)
  //     setResponseHeader(event, 'Content-Length', (end - start + 1).toString())

  //     console.log(`---> Serving range ${start}-${end}/${data.size}`)

  //     return sendStream(event, await getBodyStream(start, end - start + 1))
  //   }

  //   setResponseHeader(event, 'Content-Length', data.size.toString())

  //   console.log('---> Serving full file')

  //   return sendStream(event, await getBodyStream())
  // } catch (e) {
  //   console.error('error fetching from helia:', e)
  // }
})