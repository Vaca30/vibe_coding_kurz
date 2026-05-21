import { db, order, address, shipment, appendEvent } from '@imagineer/db';
import { transition } from '@imagineer/domain';
import { shippoShipping } from '@imagineer/providers';
import { type FulfillmentHandoffPayload, createLogger } from '@imagineer/shared';
import { eq } from 'drizzle-orm';
import { createWorker, queues } from '../queue.ts';

const log = createLogger('worker.fulfillment');

export function startFulfillmentConsumer(): () => Promise<void> {
  const w = createWorker<FulfillmentHandoffPayload>(
    'fulfillment-handoff',
    async (job) => {
      const { orderId } = job.data;
      log.info({ orderId }, 'fulfillment handoff');
      const o = await db.query.order.findFirst({ where: eq(order.id, orderId) });
      if (!o) throw new Error(`order ${orderId} missing`);

      const addr = await db.query.address.findFirst({ where: eq(address.id, o.addressId) });
      if (!addr) throw new Error(`address ${o.addressId} missing`);

      const label = await shippoShipping.createLabel({
        to: {
          recipientName: addr.recipientName,
          street1: addr.street1,
          ...(addr.street2 ? { street2: addr.street2 } : {}),
          city: addr.city,
          state: addr.state,
          postalCode: addr.postalCode,
        },
        from: {
          recipientName: 'Imagineer',
          street1: '1 Print Way',
          city: 'Brooklyn',
          state: 'NY',
          postalCode: '11201',
        },
        weightGrams: 200,
        serviceLevel: 'usps_ground_advantage',
      });

      await db.insert(shipment).values({
        orderId,
        carrier: label.carrier,
        serviceLevel: label.serviceLevel,
        trackingNumber: label.trackingNumber,
        trackingUrl: label.trackingUrl,
        labelUri: label.labelUrl,
      });

      const next = transition(o.status, { type: 'production_started' });
      if (!next.ok) throw next.error;
      await db
        .update(order)
        .set({ status: next.value, productionStartedAt: new Date() })
        .where(eq(order.id, orderId));

      await appendEvent(orderId, 'production_started', { trackingNumber: label.trackingNumber }, 'system');

      await queues.email.add('email', {
        template: 'order_in_production',
        to: '', // filled by email consumer from order's customer
        data: { orderId, trackingNumber: label.trackingNumber, trackingUrl: label.trackingUrl },
      });
    },
    { concurrency: 4 },
  );
  return async () => {
    await w.close();
  };
}
