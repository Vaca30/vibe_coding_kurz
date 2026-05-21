import { env } from '@imagineer/config';
import { s3Storage } from '@imagineer/providers';
import { NextResponse } from 'next/server';

// POST /api/uploads/image
// Issue a presigned PUT URL for the customer to upload a reference image
// directly to R2/MinIO. We never proxy the bytes through our app.

export async function POST() {
  const id = crypto.randomUUID();
  const key = `uploads/${id}.bin`;
  const uploadUrl = await s3Storage.signedPutUrl({
    bucket: env.S3_BUCKET_UPLOADS,
    key,
    contentType: 'application/octet-stream',
    ttlSec: 600,
  });
  return NextResponse.json({
    imageUri: key,
    uploadUrl,
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
  });
}
