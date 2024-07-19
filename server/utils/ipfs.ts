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
        try {
          // await prisma.storage_ipfs.upsert({
          //   where: {
          //     id: cidV0
          //   },
          //   create: {
          //     id: cidV0,
          //     name: filename,
          //     size,
          //     owners: {
          //       create: {
          //         owner
          //       }
          //     }
          //   },
          //   update: {
          //     owners: {
          //       create: {
          //         owner
          //       }
          //     }
          //   },
          // })
          await prisma.storage_ipfs.upsert({
            where: {
              id: cidV0
            },
            create: {
              id: cidV0,
              name: filename,
              size,
              owners: {}
            },
            update: {}
          })

          const existingOwner = await prisma.storage_ipfs.findFirst({
            where: {
              id: cidV0,
              owners: {
                some: {
                  owner: owner
                }
              }
            },
            include: {
              owners: true
            }
          });

          if (!existingOwner.owners.some(o => o.owner === owner)) {
            await prisma.storage_ipfs.update({
              where: {
                id: cidV0
              },
              data: {
                owners: {
                  create: { owner }
                }
              }
            });
          }
        } catch (e) {
          consola.error(`Cid: ${cidV0}, Owner: ${owner}`)
          consola.error(`Error storing on DB: ${e.message}`)
          throw new Error('Error storing on DB')
        }
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
    async del(cid: string, owner: string) {
      // Query the DB to see if there are any other owners
      const record = await prisma.storage_ipfs.findUnique({
        where: {
          id: cid
        },
        include: {
          owners: true
        }
      })

      // If the record is not found, throw an error
      if (!record) {
        throw new Error('Record not found')
      }

      // If there are no other owners, delete the record from the DB (storage_ipfs and storage_ipfs_owners) and unpin from IPFS
      if (record.owners.length === 1) {
        await prisma.storage_ipfs_owners.delete({
          where: {
            ipfs_id_owner: {
              ipfs_id: cid,
              owner
            }
          }
        })

        await prisma.storage_ipfs.delete({
          where: {
            id: cid
          }
        })

        const { pinningServer, pinningJwt } = useRuntimeConfig().ipfs
        return await $fetch(`${pinningServer}/pins/${cid}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${pinningJwt}`
          }
        })
      }
      // If there are other owners, remove the owner from the storage_ipfs_owners table
      else {
        await prisma.storage_ipfs_owners.delete({
          where: {
            ipfs_id_owner: {
              ipfs_id: cid,
              owner
            }
          }
        })
      }

      return true
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