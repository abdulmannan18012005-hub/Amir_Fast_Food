import { createFileRoute } from '@tanstack/react-router';
import React from 'react';

export const Route = createFileRoute('/locations')({
  component: LocationsPage,
});

function LocationsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">Our Locations</h1>
        <p className="text-muted-foreground mt-4 text-lg">Visit our flagship branch in Lahore, Pakistan.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center bg-card rounded-3xl p-8 border border-border shadow-2xl">
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Amir Fast Food (Main Flagship Branch)</h2>
            <p className="text-primary font-semibold mt-2">Dine-In, Takeaway Counter, and Express Delivery</p>
          </div>
          
          <div className="space-y-4 text-muted-foreground">
            <div className="flex items-start gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <div>
                <p className="font-medium text-foreground">Amir Fast Food</p>
                <p>Post Office Mansoora, Anwar Market, Peco Road, Kakazai, Lahore, 54000</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div>
                <p className="font-medium text-foreground">Operational Hours</p>
                <p>Monday - Sunday: <span className="text-foreground font-medium">Monday to Sunday, 4:05 PM - 2:00 AM</span></p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              <div>
                <p className="font-medium text-foreground">Contact Us</p>
                <p>+92 301 4265785</p>
              </div>
            </div>
          </div>
          
          <div className="pt-4 flex gap-4">
            <a href="/menu" className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-8 rounded-full transition-all shadow-lg shadow-primary/30">
              Order Now
            </a>
            <a href="https://www.google.com/maps/dir/?api=1&destination=31.5044,74.2618" target="_blank" rel="noopener noreferrer" className="inline-block bg-accent hover:bg-accent/80 text-foreground font-bold py-3 px-8 rounded-full transition-all border border-border">
              Get Directions
            </a>
          </div>
        </div>
        
        <div className="h-96 rounded-2xl overflow-hidden border border-border/50 shadow-inner bg-accent/50">
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3403.486241063625!2d74.25993986428485!3d31.499765844338224!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMzHCsDI5JzU5LjIiTiA3NMKwMTUnMzUuOCJF!5e0!3m2!1sen!2s!4v1700000000000!5m2!1sen!2s" 
            width="100%" 
            height="100%" 
            style={{ border: 0 }} 
            allowFullScreen 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
            title="Amir Fast Food Lahore"
          />
        </div>
      </div>
    </div>
  );
}
