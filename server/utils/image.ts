import sharp from 'sharp';
import { Metadata } from 'sharp'

const imageOptions = {
  'avatar': {
    min: { width: 400, height: 400, size: 50 },
    max: { width: 1200, height: 1200, size: 15 * 1024 * 1024 },
    formats: ['jpeg', 'jpg', 'png'],
  },
  'cover': {
    min: { width: 1374, height: 300, size: 50 },
    max: { width: 4122, height: 900, size: 30 * 1024 * 1024 },
    formats: ['jpeg', 'jpg', 'png'],
  }
}

export async function getImageMetadata(image: Buffer
  | ArrayBuffer
  | Uint8Array
  | Uint8ClampedArray
  | Int8Array
  | Uint16Array
  | Int16Array
  | Uint32Array
  | Int32Array
  | Float32Array
  | Float64Array
  | string): Promise<Metadata> {
  return await sharp(image).metadata()
}

export async function validateImage(
  image: Buffer
    | ArrayBuffer
    | Uint8Array
    | Uint8ClampedArray
    | Int8Array
    | Uint16Array
    | Int16Array
    | Uint32Array
    | Int32Array
    | Float32Array
    | Float64Array
    | string,
  type: 'avatar' | 'cover'
): Promise<void> {
  const { width, height, format, size } = await getImageMetadata(image)
  const { max, min, formats } = imageOptions[type]

  if (width < min.width || height < min.height) {
    throw new Error(
      `Image is too small. Minimum dimensions are ${min.width}x${min.height}`
    )
  }

  if (width > max.width || height > max.height) {
    throw new Error(
      `Image is too large. Maximum dimensions are ${max.width}x${max.height}`
    )
  }

  if (size > max.size) {
    throw new Error(
      `Image is too large. Maximum size is ${max.size / 1024 / 1024}MB`
    )
  }

  if (size === min.size) {
    throw new Error('Image is empty')
  }

  if (!formats.includes(format)) {
    throw new Error(`Invalid image format. Supported formats are ${formats.join(', ')}`)
  }

  return Promise.resolve()
}