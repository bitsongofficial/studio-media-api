import { CID } from 'multiformats/cid'
import { multiaddr } from '@multiformats/multiaddr'
import drain from 'it-drain'
import all from 'it-all'
import { z } from 'zod'
import { getStreamFromAsyncIterable } from '~/utils/helia'
import { fileTypeFromStream } from "file-type"

export default defineEventHandler(async (event) => {
  // const user = await ensureAuth(event)
  // if (!user.isAdmin) {
  //   throw createError({ statusCode: 403, statusMessage: `You are not authorized to perform this action` })
  // }
  const queryCid: string = getRouterParam(event, 'cid')
  const cid = CID.parse(queryCid)

  const { helia, fs } = event.context

  // console.log('dialing...')
  // await helia.libp2p.dial(multiaddr('/ip4/142.132.157.177/tcp/4001/p2p/12D3KooWKDSWRYh52EstzT2ooLBkCAQBbraHLqtPbFX8Qsi13gVN'))
  // console.log('dialed')

  const getBodyStream = async (offset?: number, length?: number): Promise<ReadableStream<Uint8Array>> => {
    const iter = fs.cat(cid, { offset, length })
    const { stream } = await getStreamFromAsyncIterable(iter)
    return stream
  }

  setResponseHeaders(event, {
    'Content-Length': 32555564,
    'Content-Type': 'audio/wav',
    'Accept-Ranges': 'bytes',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=864000', // 10 days
    "Server": "BitSong Media Server",
  })

  return sendStream(event, await getBodyStream())

  if (await helia.blockstore.has(cid)) {
    console.log('has cid')
  } else {
    console.log('no cid')
  }

  // try {
  //   console.log('adding pin...')
  //   await drain(helia.pins.add(cid))
  // } catch (e) {
  //   console.error(e)
  // }

  console.log('ls pins...')
  let cids: string[] = []

  for await (const pin of helia.pins.ls()) {
    cids.push(pin.cid.toV0().toString())
  }

  //const a = await helia.pins.add()

  return {
    status: 'ok',
    cids
  }
})