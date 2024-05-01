import { TrackSchema } from '@bitsongjs/metadata'
import pinataSDK from '@pinata/sdk'
import { nanoid } from 'nanoid'
import fs from 'node:fs'
import { useIpfsLink } from "~/utils"
import prisma from '~/utils/db'

export default defineEventHandler(async (event) => {
  const user = await ensureAuth(event)
  if (!user.isAdmin) {
    throw createError({
      message: 'Unauthorized',
      status: 401
    })
  }

  const id = getRouterParam(event, 'id')

  const nft = await prisma.nftview.findUnique({
    include: {
      user: true
    },
    where: {
      id
    }
  })

  if (!nft) throw createError('NFT not found')
  if (!nft.uri || !nft.uri.startsWith('ipfs://')) throw createError('NFT metadata not found')

  const mnft = await prisma.music_nfts.findUnique({
    where: {
      id: nft.id
    }
  })
  if (mnft) throw createError('NFT is already transcoded')

  // fetch metadata
  console.log(`Fetching metadata: ${useIpfsLink(nft.uri)}`)
  const rawMetadata = await $fetch(useIpfsLink(nft.uri))
  if (!rawMetadata) throw createError('Error fetching metadata')

  // validate metadata
  const metadata = TrackSchema.safeParse(rawMetadata)
  if (!metadata.success) throw createError('Invalid NFT metadata')

  // save metadata to storage
  await useStorage('mnft').setItem(`${nft.id}/metadata`, metadata.data)

  // fetch image
  console.log(`Fetching image: ${useIpfsLink(metadata.data.image)}`)
  const fetchedImage = await $fetch(useIpfsLink(metadata.data.image))
  if (!fetchedImage) throw createError('Error fetching image')

  // convert image to buffer
  const bufferImage = Buffer.from(await (fetchedImage as Blob).arrayBuffer())

  // create a sharp instance
  // const rawImage = await sharp(bufferImage).metadata()

  // save image to storage
  await useStorage('mnft').setItemRaw(`${nft.id}/image`, bufferImage)

  // fetch audio
  console.log(`Fetching audio: ${useIpfsLink(metadata.data.bitsong.audio)}`)
  const fetchedAudio = await $fetch(useIpfsLink(metadata.data.bitsong.audio))
  if (!fetchedAudio) throw createError('Error fetching audio')

  // convert audio to buffer
  const bufferAudio = Buffer.from(await (fetchedAudio as Blob).arrayBuffer())

  // save audio to storage
  await useStorage('mnft').setItemRaw(`${nft.id}/audio`, bufferAudio)

  // validate audio
  validateAudioData(await getMediaData('./storage/mnft/' + nft.id + '/audio'))

  /**
   * Transcoding
   */
  const pinata = new pinataSDK(useRuntimeConfig().pinata.apiKey, useRuntimeConfig().pinata.apiSecret);

  // 1. create audio preview
  // ex: ffmpeg -i audio.wav -ss 0 -t 15 preview.mp3
  const inputAudio = './storage/mnft/' + nft.id + '/audio'
  const previewOutputAudio = './storage/mnft/' + nft.id + '/audio-preview.mp3'
  const previewStartTime = metadata.data.bitsong.previewStartTime ?? 0
  const previewDuration = (metadata.data.bitsong.previewDuration ?? 0) / 1000

  const mediaData = await getMediaData(inputAudio)
  const { format_name, duration, size } = mediaData.format

  await Promise.all([
    generatePreview(inputAudio, previewOutputAudio, previewStartTime, previewDuration),
    //generateMp3_128k(inputAudio, './storage/mnft/' + nft.id + '/audio-128.mp3'),
  ])

  // open file preview stream
  const previewStream = fs.createReadStream(previewOutputAudio)
  const { IpfsHash } = await pinata.pinFileToIPFS(previewStream, { pinataMetadata: { name: `mnft_${nft.id}_audio-preview` } })

  await prisma.music_nfts.create({
    data: {
      id: nft.id,
      title: metadata.data.bitsong.title,
      titleLocale: metadata.data.bitsong.titleLocale,
      artwork: metadata.data.bitsong.artwork,
      audio: metadata.data.bitsong.audio,
      audio_preview: `ipfs://${IpfsHash}`,
      video: metadata.data.bitsong.video,
      country: metadata.data.bitsong.country,
      duration: duration ?? 0,
      genre: metadata.data.bitsong.genre,
      license: metadata.data.bitsong.license,
      cLine: metadata.data.bitsong.cLine,
      pLine: metadata.data.bitsong.pLine,
      explicit: metadata.data.bitsong.explicit,
      isrc: metadata.data.bitsong.isrc,
      iswc: metadata.data.bitsong.iswc,
      label: metadata.data.bitsong.label,
      liveRecording: metadata.data.bitsong.liveRecording,
      lyrics: metadata.data.bitsong.lyrics,
      lyricsLocale: metadata.data.bitsong.lyricsLocale,
      previewDuration: metadata.data.bitsong.previewDuration,
      previewStartTime: metadata.data.bitsong.previewStartTime,
      previousRelease: metadata.data.bitsong.previousRelease,
      version: metadata.data.bitsong.version,
    }
  })

  await prisma.music_nft_artists.createMany({
    data: metadata.data.bitsong.artists.map(artist => ({
      id: nanoid(12),
      nft_id: nft.id,
      address: artist.address,
      name: artist.name,
      role: artist.role,
    }))
  })

  if (metadata.data.bitsong.authors_publishers && metadata.data.bitsong.authors_publishers?.length > 0) {
    await prisma.music_nft_authors_publishers.createMany({
      data: metadata.data.bitsong.authors_publishers.map(author => ({
        id: nanoid(12),
        nft_id: nft.id,
        address: author.address,
        name: author.name,
        role: author.role,
      }))
    })
  }

  return {
    success: true
  }
})