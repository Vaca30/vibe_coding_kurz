// Reads the x-session-id header sent by the client. The header is the
// browser-side persistent id from `lib/session.ts`. We trust it for binding
// anonymous generation jobs together until the user signs in.

export function readSessionId(req: Request): string {
  const fromHeader = req.headers.get('x-session-id');
  if (fromHeader && fromHeader.length >= 8) return fromHeader;
  return 'anon';
}
