import { env } from '@imagineer/config';
import { Resend } from 'resend';
import type { EmailProvider } from './interface.ts';

let client: Resend | undefined;
function getClient(): Resend {
  if (!client) client = new Resend(env.RESEND_API_KEY);
  return client;
}

export const resendEmail: EmailProvider = {
  async send(msg) {
    const r = await getClient().emails.send({
      from: env.EMAIL_FROM,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      ...(msg.text ? { text: msg.text } : {}),
    });
    if (r.error) throw new Error(`resend send: ${r.error.message}`);
    return { id: r.data?.id ?? 'unknown' };
  },
};
