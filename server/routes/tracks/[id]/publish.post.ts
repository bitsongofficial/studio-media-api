import { toCountry, toExplicit, toLicense, toMarkdown, toTrackGenre, trackMetadata } from "@bitsongjs/metadata";
import prisma from '~/utils/db'

export default defineEventHandler(async (event) => {
  const { track, user } = await ensureUserTrack(event)

  if (!track.artwork && !track.audio) {
    throw createError({
      message: "Track has no audio or artwork",
      status: 400,
    })
  }

  if (track.artwork_ipfs_cid && track.audio_ipfs_cid && track.metadata_ipfs_cid) {
    throw createError({
      message: "Track already published",
      status: 400,
    })
  }

  try {
    const metadata = trackMetadata({
      id: track.id,
      title: track.title!,
      titleLocale: track.titleLocale!,
      description: toMarkdown(track.description!),
      artists: track.artists.map((artist) => ({
        name: artist.name,
        role: artist.role,
        address: artist.address,
      })),
      artwork: `ipfs://${track.artwork_ipfs_cid}`,
      audio: `ipfs://${track.audio_ipfs_cid}`,
      video: track.video_ipfs_cid ? `ipfs://${track.video_ipfs_cid}` : undefined,
      duration: track.duration!,
      license: toLicense(track.license!),
      genre: toTrackGenre(track.genre!),
      country: toCountry(track.country!),
      explicit: toExplicit(track.explicit!),
      liveRecording: track.liveRecording!,
      previousRelease: track.previousRelease!,
      previewStartTime: track.previewStartTime!,
      previewDuration: track.previewDuration!,
      authors_publishers: track.authors_publishers.map((author) => ({
        name: author.name,
        role: author.role,
        address: author.address,
      })),
      lyrics: track.lyrics ? toMarkdown(track.lyrics) : undefined,
      lyricsLocale: track.lyricsLocale ? track.lyricsLocale : undefined,
      version: track.version ? track.version : undefined,
    })

    const { cid: metadataCid } = await useIpfs().put(
      `track_metadata_${track.id}.json`,
      new Blob([JSON.stringify(metadata)], { type: 'application/json' }),
      user.address
    )

    await prisma?.tracks.update({
      where: {
        id: track.id,
        user_id: user.userId
      },
      data: {
        metadata_ipfs_cid: metadataCid,
      }
    })

    return {
      artwork: track.artwork_ipfs_cid,
      audio: track.audio_ipfs_cid,
      video: track.video_ipfs_cid,
      metadata: metadataCid,
    }
  } catch (err) {
    console.error(`Failed to publish track: ${err}`)
    throw createError({
      message: "Failed to publish track artwork",
      status: 500,
    })
  }
})