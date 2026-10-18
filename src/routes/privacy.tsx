import { createFileRoute } from '@tanstack/react-router';
import { seo } from '../lib/seo';
import React from 'react';
import { SHOP_NAME, SHOP_ADDRESS, SHOP_PHONE_DISPLAY, SHOP_HOURS_DISPLAY } from '../lib/shop';

export const Route = createFileRoute('/privacy')({
  head: () => seo({ title: 'Privacy Policy - Amir Fast Food', description: 'Privacy Policy for Amir Fast Food: how customer order data is handled.', path: '/privacy' }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 w-full">
      <div className="bg-card border border-border rounded-3xl p-8 sm:p-12 shadow-2xl">
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8 text-sm">Last updated: October 2026</p>
        
        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. Information We Collect</h2>
            <p className="mb-2">We collect only the information necessary to prepare and deliver your orders:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm">
              <li><strong>Contact Information:</strong> Your name, phone number, delivery address, and optional email address.</li>
              <li><strong>Order Details:</strong> Items and options selected, order notes, payment method (Cash on Delivery or manual online transfer), Transaction ID (for manual transfers), order timestamp, and status history.</li>
              <li><strong>Device Coordinates:</strong> Approximate latitude and longitude only if you explicitly choose to tap "Use my current location" to assist with address entry and delivery distance calculation.</li>
              <li><strong>Delivery Dispatch:</strong> Rider name and phone number assigned by restaurant staff to your delivery.</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. How We Use Your Information</h2>
            <p>Your information is used solely to prepare food orders in our kitchen, calculate delivery distance, dispatch orders to your address, provide live tracking updates, and communicate with you about your order if needed.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. Payment Information</h2>
            <p>We do not operate an automated credit card payment gateway and do not collect or store credit card numbers. Payment is made via Cash on Delivery (COD) or manual transfer through EasyPaisa / JazzCash, where you submit a Transaction ID (TID) to confirm payment.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. Service Providers & Third Parties</h2>
            <p className="mb-2">We never sell, rent, or trade your personal information. We utilize trusted infrastructure providers to operate the service:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm">
              <li><strong>Supabase:</strong> Encrypted cloud database for storing order records and push subscription endpoints.</li>
              <li><strong>Vercel:</strong> Cloud application hosting and serverless functions.</li>
              <li><strong>Groq:</strong> Language model inference for our optional automated assistant (AmirBot).</li>
              <li><strong>OpenStreetMap:</strong> Nominatim API for geocoding and map tile embed on our Locations page (zero tracking cookies).</li>
              <li><strong>Gmail SMTP:</strong> Dispatches receipt emails when an email address is provided.</li>
              <li><strong>Web Push Service:</strong> Browser push services for delivering order status notifications when permission is granted.</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">5. Browser Storage & Cookies</h2>
            <p className="mb-2">We do not use advertising or tracking cookies. We utilize standard client-side storage for functionality:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm">
              <li><strong>localStorage:</strong> Stores your active shopping cart, cached contact details (name, phone, address) to speed up checkout, theme preference (light/dark), and recent order IDs for tracking.</li>
              <li><strong>sessionStorage:</strong> Stores conversation messages with AmirBot for the duration of your session.</li>
              <li><strong>Service Worker Cache:</strong> Caches application assets for offline capability and fast loading.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">6. Data Retention & Your Rights</h2>
            <p>We keep order records only as long as necessary to fulfill orders, operate the restaurant, and satisfy accounting obligations. You may contact us at any time to verify, update, or request deletion of your information.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">7. Security</h2>
            <p>All communication between your browser and our servers is encrypted using HTTPS. Administrative order management features are restricted to authorized restaurant staff via PIN authentication.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">8. Contact Us</h2>
            <p>For questions regarding your privacy, contact {SHOP_NAME} at {SHOP_PHONE_DISPLAY} or visit our branch at {SHOP_ADDRESS}. Operational hours: {SHOP_HOURS_DISPLAY}.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
