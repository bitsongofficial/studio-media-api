import { ImportCandidate, create } from 'kubo-rpc-client'
import pinataSDK from '@pinata/sdk'
import prisma from './db'

export const useIpfsLink = (cid: string | undefined): string => {
  if (!cid) return ''

  const url = useRuntimeConfig().ipfs.gateway

  if (cid.startsWith('ipfs://')) {
    const newCid = cid.replace('ipfs://', '')
    return url.replace('{cid}', newCid)
  }

  return url.replace('{cid}', cid);
}

interface PutOptions {
  pin?: boolean
  storeOnDb?: boolean
}

export function useIpfs() {
  const ipfsApi = create({
    url: useRuntimeConfig().ipfs.api,
  })

  const ipfs = {
    async put(filename: string, body: ImportCandidate, owner: string, opts: PutOptions = {
      pin: true,
      storeOnDb: true
    }) {
      consola.info('Uploading to IPFS...')
      const { cid, size } = await ipfsApi.add(body, {
        pin: false,
        wrapWithDirectory: false,
      })

      const cidV0 = cid.toV0().toString()

      if (opts.pin) {
        await this.pin(cidV0)
      }

      if (opts.storeOnDb) {
        await prisma.storage_ipfs.upsert({
          where: {
            id: cidV0
          },
          create: {
            id: cidV0,
            name: filename,
            size,
            owners: {
              create: {
                owner
              }
            }
          },
          update: {},
        })
      }

      const { apiKey, apiSecret, enable } = useRuntimeConfig().pinata

      if (enable) {
        consola.info('Uploading to Pinata...')

        const pinata = new pinataSDK(apiKey, apiSecret);
        const { IpfsHash } = await pinata.pinFileToIPFS(body, { pinataMetadata: { name: cidV0 } })

        if (cidV0 !== IpfsHash) {
          throw new Error('Error pinning file, cid mismatch')
        }
      }

      return { cid: cidV0, size, }
    },
    async pin(cid: string) {
      const { pinningServer, pinningJwt } = useRuntimeConfig().ipfs
      return await $fetch(`${pinningServer}/pins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${pinningJwt}`
        },
        body: {
          cid
        }
      })
    },
  }

  return ipfs
}