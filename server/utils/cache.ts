import prisma from './db'

export const cachedStorageData = defineCachedFunction(async (cid: string) => {
  return await prisma.storage_ipfs.findUnique({
    where: {
      id: cid
    }
  })
}, {
  maxAge: 1000 * 60 * 60, // 60 minutes
  name: 'storage_ipfs',
  getKey: (cid: string) => cid,
})