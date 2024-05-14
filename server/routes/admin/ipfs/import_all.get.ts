import { Cluster } from '@nftstorage/ipfs-cluster'

export default defineEventHandler(async (event) => {
  const { clusterApi, clusterApiJwt } = useRuntimeConfig().ipfs

  const cluster = new Cluster(clusterApi, {
    headers: { Authorization: `Bearer ${clusterApiJwt}` }
  })

  const statuses = await cluster.statusAll({
    local: true
  })

  const cids = statuses.map((status) => {
    return {
      cid: status.cid,
      timestamp: status.peerMap["12D3KooWAttrSCzjep1o2HqBcZSE6GMWN6Q1L5Rd5UmdhahndHbG"].timestamp
    }
  })

  const defaultOwner = "imported"

  for (const cid of cids) {
    await prisma.storage_ipfs.upsert({
      where: {
        id: cid.cid
      },
      create: {
        id: cid.cid,
        created_at: cid.timestamp,
        owners: {
          connectOrCreate: {
            where: {
              ipfs_id_owner: {
                ipfs_id: cid.cid,
                owner: defaultOwner
              }
            },
            create: {
              owner: defaultOwner,
            }
          }
        }
      },
      update: {
        created_at: cid.timestamp,
        owners: {
          connectOrCreate: {
            where: {
              ipfs_id_owner: {
                ipfs_id: cid.cid,
                owner: defaultOwner
              }
            },
            create: {
              owner: defaultOwner,
            }
          }
        }
      },
    })
  }

  return {
    count: cids.length,
    results: cids
  }
})