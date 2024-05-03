import { CID } from 'multiformats/cid'
import { cachedStorageData } from '~/utils/cache'
import { getStreamFromAsyncIterable } from '~/utils/helia'
import rangeParser from 'range-parser'

export default eventHandler(async (event) => {
  const cid: string = getRouterParam(event, 'cid')
  const { fs } = event.context

  let type: string | undefined

  try {
    console.log('fetching from helia...')
    if (fs === undefined) throw new Error('fs is undefined')

    const data = await cachedStorageData(cid)
    if (data === null) throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
    })

    const getBodyStream = async (offset?: number, length?: number): Promise<ReadableStream<Uint8Array>> => {
      const iter = fs.cat(CID.parse(cid), { offset, length })
      const { stream } = await getStreamFromAsyncIterable(iter)
      return stream
    }

    setResponseHeaders(event, {
      //'Date': new Date().toUTCString(),
      'Content-Type': data.mimetype,
      //'Content-Length': data.size.toString(),
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=864000', // 10 days
      //'ETag': `"${data.id}"`,
      //"Strict-Transport-Security": "max-age=15724800; includeSubDomains;",
      //"Vary": "Accept-Encoding",
      //"Access-Control-Allow-Headers": "Content-Type, Range, User-Agent, X-Requested-With",
      //"Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      //"Access-Control-Expose-Headers": "Content-Length, Content-Range, X-Chunked-Output, X-Stream-Output",
      "Server": "BitSong Media Server",
    })

    const headers = getHeaders(event)
    if (headers.range) {
      const range = rangeParser(data.size, headers.range)

      if (range === -1 || !(Array.isArray(range) && range.length)) {
        console.log('---> Serving full file')

        return sendStream(event, await getBodyStream())
      }

      const start = range[0].start
      const end = range[0].end

      setResponseStatus(event, 206)
      setResponseHeader(event, 'Content-Range', `bytes ${start}-${end}/${data.size}`)
      setResponseHeader(event, 'Content-Length', (end - start + 1).toString())

      // TODO: must include range?
      // setResponseHeader(event, 'ETag', `"${data.id}-${start}-${end}"`)

      console.log(`---> Serving range ${start}-${end}/${data.size}`)

      return sendStream(event, await getBodyStream(start, end - start + 1))
    }

    setResponseHeader(event, 'Content-Length', data.size.toString())

    // for await (const chunk of fs.cat(CID.parse(cid))) {
    //   event.node.res.write(Buffer.from(chunk))
    // }

    console.log('---> Serving full file')

    return sendStream(event, await getBodyStream())
  } catch (e) {
    console.error('error fetching from helia:', e)
  }
  // finally {
  //   console.log('close stream')
  //   //event.node.res.end()
  // }
})