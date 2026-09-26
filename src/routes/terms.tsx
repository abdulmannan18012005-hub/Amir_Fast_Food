import { createFileRoute } from '@tanstack/react-router';
import React from 'react';

export const Route = createFileRoute('/terms')({
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 w-full">
      <div className="bg-card border border-border rounded-3xl p-8 sm:p-12 shadow-2xl">
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-6">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: October 2026</p>
        
        <div className="space-y-8 text-muted-foreground">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. Introduction</h2>
            <p>Welcome to Amir Fast Food. By using our website and placing orders, you agree to these terms. Please read them carefully.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. Ordering & Payment</h2>
            <p>All orders are subject to availability and confirmation of the order price. We offer Cash on Delivery (COD) and secure online payment methods. For COD orders, a nominal fee may apply for orders under a certain threshold.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. Delivery Policy</h2>
            <p>We strive to deliver your food piping hot within 30-45 minutes. Delivery times may vary depending on traffic, weather conditions, and order volume. Delivery is currently available within designated zones in Lahore.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. Refunds & Cancellations</h2>
            <p>Orders can only be cancelled within 5 minutes of placement. Once preparation begins, cancellations are not permitted. If there is a missing or incorrect item in your order, please contact our support team within 30 minutes of delivery.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
