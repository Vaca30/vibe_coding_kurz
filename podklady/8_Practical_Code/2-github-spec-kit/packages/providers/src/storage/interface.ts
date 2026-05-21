export interface StorageProvider {
  signedPutUrl(args: { bucket: string; key: string; contentType: string; ttlSec?: number }): Promise<string>;
  signedGetUrl(args: { bucket: string; key: string; ttlSec?: number }): Promise<string>;
  publicUrl(args: { bucket: string; key: string }): string;
  putObject(args: { bucket: string; key: string; body: Uint8Array; contentType: string }): Promise<void>;
  fetchObject(args: { bucket: string; key: string }): Promise<Uint8Array>;
}
