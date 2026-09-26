import { createFileRoute } from '@tanstack/react-router';
import React from 'react';

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 w-full">
      <div className="bg-card border border-border rounded-3xl p-8 sm:p-12 shadow-2xl">
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-6">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: October 2026</p>
        
        <div className="space-y-8 text-muted-foreground">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Data Collection</h2>
            <p>We collect essential information to process your orders, including your name, phone number, email address, and delivery address. This data is strictly used for fulfilling your order and improving our services.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Payment Security</h2>
            <p>Your payment details are processed through secure, encrypted gateways. Amir Fast Food does not store your credit card or wallet credentials on our servers.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Data Sharing</h2>
            <p>We do not sell your personal data to third parties. We only share necessary details (like your address and phone number) with our delivery partners to ensure your food reaches you.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Cookies</h2>
            <p>We use local storage and cookies to remember your cart items, preferences, and to keep you logged in for a seamless ordering experience.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
