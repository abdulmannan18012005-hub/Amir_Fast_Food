import { createFileRoute } from '@tanstack/react-router';
import { seo } from '../lib/seo';
import React from 'react';
import { 
  SHOP_NAME, 
  SHOP_ADDRESS, 
  SHOP_PHONE_DISPLAY, 
  SHOP_PHONE_LOCAL,
  SHOP_HOURS_DISPLAY,
  SHOP_DELIVERY_RADIUS_FREE_KM,
  SHOP_DELIVERY_FEE_PER_KM,
  SHOP_DELIVERY_MAX_KM,
  SHOP_COD_THRESHOLD,
  SHOP_COD_FEE,
  SHOP_ESTIMATED_DELIVERY_TIME,
  SHOP_CANCELLATION_POLICY,
  SHOP_PAYMENT_METHODS,
  SHOP_PAYMENT_VERIFICATION_NOTE
} from '../lib/shop';

export const Route = createFileRoute('/terms')({
  head: () => seo({ title: 'Terms of Service - Amir Fast Food', description: 'Terms of Service and ordering policies for Amir Fast Food in Lahore.', path: '/terms' }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 w-full">
      <div className="bg-card border border-border rounded-3xl p-8 sm:p-12 shadow-2xl">
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">Terms of Service</h1>
        <p className="text-muted-foreground mb-8 text-sm">Last updated: October 2026</p>
        
        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. Operational Hours & Service Area</h2>
            <p className="mb-2"><strong>Hours:</strong> {SHOP_HOURS_DISPLAY} (Pakistan Standard Time). Orders are accepted during opening hours only.</p>
            <p><strong>Service Area:</strong> Online delivery orders are accepted within a maximum radius of {SHOP_DELIVERY_MAX_KM} km from our location at {SHOP_ADDRESS}. Orders outside this distance cannot be fulfilled.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. Pricing & Menu Items</h2>
            <p>All prices are listed in Pakistani Rupees (PKR) and include applicable sales taxes. Menu item availability and prices are subject to change without prior notice. The total calculated at checkout is authoritative and final.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. Delivery Fees & Payment Methods</h2>
            <p className="mb-2"><strong>Accepted Payment Methods:</strong> {SHOP_PAYMENT_METHODS}.</p>
            <p className="text-sm mb-2">{SHOP_PAYMENT_VERIFICATION_NOTE} Each Transaction ID can be used for one order only.</p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm">
              <li><strong>Free Delivery Area:</strong> Delivery is free within a {SHOP_DELIVERY_RADIUS_FREE_KM} km radius from our restaurant.</li>
              <li><strong>Distance Fee:</strong> Deliveries beyond {SHOP_DELIVERY_RADIUS_FREE_KM} km incur an additional PKR {SHOP_DELIVERY_FEE_PER_KM} per extra kilometer up to {SHOP_DELIVERY_MAX_KM} km.</li>
              <li><strong>Cash on Delivery (COD) Fee:</strong> A PKR {SHOP_COD_FEE} fee applies to COD orders when the subtotal is under PKR {SHOP_COD_THRESHOLD}. COD fee is waived for orders of PKR {SHOP_COD_THRESHOLD} or more, and for all online transfers.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. Estimated Delivery Time</h2>
            <p>{SHOP_ESTIMATED_DELIVERY_TIME}. Delivery times are estimates and may vary depending on weather, traffic, and order volume.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">5. Order Tracking & Push Notifications</h2>
            <p>Upon completing checkout, you will receive an order confirmation and permanent link to track your order status live. You may optionally enable browser push notifications to receive real-time updates as your food moves through preparation and delivery.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">6. Cancellation & Refund Policy</h2>
            <p className="mb-2">{SHOP_CANCELLATION_POLICY}</p>
            <p>The restaurant reserves the right to cancel an order if items become unavailable, or if the address is unreachable or outside our delivery area. In such cases, the cancellation reason will appear in the order tracker, and online payments will be refunded promptly.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">7. Missing or Incorrect Items</h2>
            <p>If any item in your delivered order is missing or incorrect, please contact us immediately on {SHOP_PHONE_LOCAL}. We review each situation and arrange an appropriate replacement or correction.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">8. Automated Assistant (AmirBot)</h2>
            <p>AmirBot can help you build the cart and fill your details, but an order is placed only when you press "Confirm &amp; place order". Its answers may be wrong and checkout totals are authoritative.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">9. General Terms & Updates</h2>
            <p>We may update these terms periodically to reflect service or operational adjustments. Continued use of the website following changes constitutes acceptance of the updated terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">10. Contact Us</h2>
            <p>For inquiries, support, or feedback, contact {SHOP_NAME} at {SHOP_PHONE_DISPLAY} or visit our location at {SHOP_ADDRESS}.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
