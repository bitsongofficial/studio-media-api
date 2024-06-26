import { H3Event } from 'h3'
import ffmpeg, { FfprobeData } from 'fluent-ffmpeg'
import prisma from './db'
import * as stream from "stream";

export async function ensureUserTrack(event: H3Event) {
  const user = await ensureAuth(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      message: 'No id',
      status: 400
    })
  }

  const track = await prisma.tracks.findUnique({
    where: {
      id,
      user_id: user.userId,
    },
    include: {
      artists: true,
      authors_publishers: true,
      marketplace: true,
      royalties_info: true,
    }
  })

  if (!track) {
    throw createError({
      message: 'No track found',
      status: 404
    })
  }

  return {
    user,
    track
  }
}

export function getMediaData(filePath: string | stream.Readable): Promise<FfprobeData> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(filePath)
      .ffprobe((err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
  });
}

export function generatePreview(inputPath: string, outputPath: string, start: number, end: number) {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputPath)
      .setStartTime(start)
      .setDuration(end)
      .output(outputPath)
      .on('end', function () {
        console.log('audio-preview.mp3 created')
        resolve(true)
      })
      .on('error', function (err) {
        console.log('Error: ' + err.message)
        reject(err)
      })
      .run()
  })
}

export function generateMp3_128k(inputPath: string, outputPath: string) {
  new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputPath)
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .output(outputPath)
      .on('end', function () {
        console.log('audio-128.mp3 created')
        resolve(true)
      })
      .on('error', function (err) {
        console.log('Error: ' + err.message)
        reject(err)
      })
      .run()
  })
}

export function validateAudioData(data: FfprobeData) {
  const { format_name, duration, size } = data.format

  if (!format_name || !duration || !size) {
    throw createError({
      message: 'No valid audio file',
      status: 400
    })
  }

  if (format_name !== 'wav' && format_name !== 'mp3') {
    throw createError({
      message: 'Invalid audio format',
      status: 400
    })
  }

  if (duration > 600) {
    throw createError({
      message: 'Audio file too long, max 10 minutes',
      status: 400
    })
  }

  if (size > 300 * 1024 * 1024) {
    throw createError({
      message: 'Audio file too large, max 300MB',
      status: 400
    })
  }
}