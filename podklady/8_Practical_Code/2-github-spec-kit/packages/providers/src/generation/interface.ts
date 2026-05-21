export type ProviderJobStatus =
  | { state: 'queued' | 'running' }
  | { state: 'succeeded'; glbUrl: string; thumbnailUrl: string }
  | { state: 'failed'; reason: string };

export interface GenerationResult {
  providerJobId: string;
}

export interface GenerationProvider {
  readonly id: 'meshy' | 'tripo';
  submit(input: { kind: 'text'; prompt: string } | { kind: 'image'; imageUrl: string; hint?: string }): Promise<GenerationResult>;
  poll(providerJobId: string): Promise<ProviderJobStatus>;
}
