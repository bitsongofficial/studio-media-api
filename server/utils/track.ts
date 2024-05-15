import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import prisma from "./db"

export function useTrack() {
  async function del(id: string) {
    const track = await prisma.tracks.findUnique({
      include: {
        artists: true,
        authors_publishers: true,
        royalties_info: true,
        marketplace: true,
        user: true
      },
      where: { id }
    })

    if (!track) {
      throw new Error('Track not found')
    }

    const s3Client = getS3Client()
    const bucket = useRuntimeConfig().awsS3BucketTracks

    // 1. delete audio from storage
    try {
      if (track.audio) {
        console.log('deleting audio from s3', track.audio)

        await s3Client.send(new DeleteObjectCommand({
          Bucket: bucket,
          Key: track.audio
        }))
        console.log('audio deleted from s3')

        await useIpfs().del(track.audio, track.user.address)
        console.log('audio deleted from ipfs')
      }
    } catch (error) {
      throw new Error('Error deleting audio from s3')
    }

    // 2. delete artwork from s3
    try {
      if (track.artwork) {
        console.log('deleting artwork from s3', track.artwork)

        await s3Client.send(new DeleteObjectCommand({
          Bucket: bucket,
          Key: track.artwork
        }))
        console.log('artwork deleted from s3')

        await useIpfs().del(track.artwork, track.user.address)
        console.log('artwork deleted from ipfs')
      }
    } catch (error) {
      console.error('Error deleting artwork from s3', error)
      throw new Error('Error deleting artwork from s3')
    }

    // 3. delete video from s3
    try {
      if (track.video) {
        console.log('deleting video from s3', track.video)

        await s3Client.send(new DeleteObjectCommand({
          Bucket: bucket,
          Key: track.video
        }))
        console.log('video deleted from s3')

        await useIpfs().del(track.video, track.user.address)
        console.log('video deleted from ipfs')
      }
    } catch (error) {
      console.error('Error deleting video from s3', error)
      throw new Error('Error deleting video from s3')
    }

    // 4. remove artists from db
    try {
      if (track.artists) {
        await prisma.track_artists.deleteMany({
          where: {
            track_id: track.id
          }
        })
      }
    } catch (error) {
      console.error('Error deleting artists from db', error)
      throw new Error('Error deleting artists from db')
    }

    // 5. remove authors_publishers from db
    try {
      if (track.authors_publishers) {
        await prisma.track_authors_publishers.deleteMany({
          where: {
            track_id: track.id
          }
        })
      }
    } catch (error) {
      console.error('Error deleting authors_publishers from db', error)
      throw new Error('Error deleting authors_publishers from db')
    }

    // 6. remove royalties_info from db
    try {
      if (track.royalties_info) {
        await prisma.track_royalties_info.deleteMany({
          where: {
            track_id: track.id
          }
        })
      }
    } catch (error) {
      console.error('Error deleting royalties_info from db', error)
      throw new Error('Error deleting royalties_info from db')
    }

    // 7. remove marketplace from db
    try {
      if (track.marketplace) {
        await prisma.track_marketplace.deleteMany({
          where: {
            track_id: track.id
          }
        })
      }
    } catch (error) {
      console.error('Error deleting marketplace from db', error)
      throw new Error('Error deleting marketplace from db')
    }

    // 8. remove track from db
    try {
      await prisma.tracks.delete({
        where: {
          id: track.id
        }
      })
    } catch (error) {
      console.error('Error deleting track from db', error)
      throw new Error('Error deleting track from db')
    }
  }

  return {
    del
  }
}