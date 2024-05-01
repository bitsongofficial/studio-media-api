export const useIpfsLink = (cid: string | undefined): string => {
  if (!cid) return ''

  const url = useRuntimeConfig().ipfs.gateway
  console.log('IPFS URL:', url)
  if (cid.startsWith('ipfs://')) {
    const newCid = cid.replace('ipfs://', '')
    return url.replace('{cid}', newCid)
  }

  return url.replace('{cid}', cid);
}