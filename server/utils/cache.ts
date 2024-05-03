export const cachedStorageData = defineCachedFunction(async (cid: string) => {
  return await prisma.storage_ipfs.findUnique({
    where: {
      id: cid
    }
  })
}, {
  maxAge: 7 * 24 * 60 * 60, // 7 days
  name: 'storage_ipfs',
  getKey: (cid: string) => cid,
})