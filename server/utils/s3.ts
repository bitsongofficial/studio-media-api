import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { fileTypeFromBuffer } from 'file-type';
import * as fs from 'fs';

export const getS3Client = () => {
  const { accessKeyId, secretAccessKey, region } = useRuntimeConfig().s3;

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

type BaseStoreToS3Args = {
  userId: string;
  id: string;
  filepath: string;
  filename: string;
};

type StoreTrackToS3Args = BaseStoreToS3Args
type StoreTrackImageToS3Args = BaseStoreToS3Args
type StoreTrackVideoToS3Args = BaseStoreToS3Args

type StoreFileResponse = {
  path: string;
  contenType: string;
}

export async function storeTrackToS3(data: StoreTrackToS3Args): Promise<StoreFileResponse> {
  const file = fs.readFileSync(data.filepath)
  const fileType = await fileTypeFromBuffer(file);
  if (!fileType) {
    throw new Error('File type not detected');
  }

  const fileName = `${data.userId}/tracks/original/${data.id}/${data.filename}`;

  await getS3Client().send(new PutObjectCommand({
    Body: file,
    Bucket: useRuntimeConfig().s3.bucket,
    Key: fileName,
    ContentType: fileType.mime,
  }));

  return {
    path: fileName,
    contenType: fileType.mime,
  }
}

export async function storeTrackImageToS3(data: StoreTrackImageToS3Args): Promise<StoreFileResponse> {
  const file = fs.readFileSync(data.filepath)
  const fileType = await fileTypeFromBuffer(file);
  if (!fileType) {
    throw new Error('File type not detected');
  }

  const fileName = `${data.userId}/tracks/original/${data.id}/${data.filename}`;

  await getS3Client().send(new PutObjectCommand({
    Body: file,
    Bucket: useRuntimeConfig().s3.bucket,
    Key: fileName,
    ContentType: fileType.mime,
  }));

  return {
    path: fileName,
    contenType: fileType.mime,
  }
}

export async function storeTrackVideoToS3(data: StoreTrackVideoToS3Args): Promise<StoreFileResponse> {
  const file = fs.readFileSync(data.filepath)
  const fileType = await fileTypeFromBuffer(file);
  if (!fileType) {
    throw new Error('File type not detected');
  }

  const fileName = `${data.userId}/tracks/original/${data.id}/${data.filename}`;

  await getS3Client().send(new PutObjectCommand({
    Body: file,
    Bucket: useRuntimeConfig().s3.bucket,
    Key: fileName,
    ContentType: fileType.mime,
  }));

  return {
    path: fileName,
    contenType: fileType.mime,
  }
}