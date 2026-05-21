import { db, customer, order } from '@imagineer/db';
import { resendEmail } from '@imagineer/providers';
import { type EmailPayload, createLogger } from '@imagineer/shared';
import { eq } from 'drizzle-orm';
import { createWorker } from '../queue.ts';

const log = createLogger('worker.email');

const TEMPLATES: Record<EmailPayload['template'], (data: Record<string, unknown>) => { subject: string; html: string }> = {
  magic_link: (d) => ({
    subject: 'Your Imagineer sign-in link',
    html: `<p>Click to sign in: <a href="${String(d.url)}">${String(d.url)}</a></p>`,
  }),
  order_received: (d) => ({
    subject: "We've received your order",
    html: `<p>Order ${String(d.orderId)} received. We'll begin printing shortly.</p>`,
  }),
  order_in_production: (d) => ({
    subject: 'Your Imagineer print is on the printer',
    html: `<p>Order ${String(d.orderId)} is being printed. Tracking: ${String(d.trackingNumber)}.</p>`,
  }),
  order_shipped: (d) => ({
    subject: 'Shipped — track your Imagineer order',
    html: `<p>Order ${String(d.orderId)} shipped. <a href="${String(d.trackingUrl)}">Track it</a>.</p>`,
  }),
  order_delivered: (d) => ({
    subject: 'Delivered — tell us how it turned out',
    html: `<p>Your Imagineer order ${String(d.orderId)} has been delivered.</p>`,
  }),
  reprint_scheduled: (d) => ({
    subject: "We're reprinting your order",
    html: `<p>A reprint of order ${String(d.orderId)} has been scheduled at no extra cost.</p>`,
  }),
};

export function startEmailConsumer(): () => Promise<void> {
  const w = createWorker<EmailPayload>(
    'email',
    async (job) => {
      const { template, to, data } = job.data;
      let recipient = to;
      if (!recipient && typeof data.orderId === 'string') {
        const o = await db.query.order.findFirst({ where: eq(order.id, data.orderId) });
        if (o) {
          const c = await db.query.customer.findFirst({ where: eq(customer.id, o.customerId) });
          if (c) recipient = c.email;
        }
      }
      if (!recipient) throw new Error(`email job has no recipient (template=${template})`);
      const rendered = TEMPLATES[template](data);
      await resendEmail.send({ to: recipient, ...rendered });
      log.info({ template, to: recipient }, 'email sent');
    },
    { concurrency: 16 },
  );
  return async () => {
    await w.close();
  };
}
