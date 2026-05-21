import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@imagineer/config';
import type { StorageProvider } from './interface.ts';

let client: S3Client | undefined;

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
      forcePathStyle: true, // required for MinIO; no-op on R2
    });
  }
  return client;
}

export const s3Storage: StorageProvider = {
  async signedPutUrl({ bucket, key, contentType, ttlSec = 600 }) {
    const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
    return getSignedUrl(getClient(), cmd, { expiresIn: ttlSec });
  },
  async signedGetUrl({ bucket, key, ttlSec = 600 }) {
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(getClient(), cmd, { expiresIn: ttlSec });
  },
  publicUrl({ bucket, key }) {
    return `${env.S3_PUBLIC_BASE_URL}/${bucket}/${key}`;
  },
  async putObject({ bucket, key, body, contentType }) {
    await getClient().send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
    );
  },
  async fetchObject({ bucket, key }) {
    const r = await getClient().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!r.Body) throw new Error(`empty body for s3://${bucket}/${key}`);
    return new Uint8Array(await r.Body.transformToByteArray());
  },
};
