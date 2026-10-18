import { SHOP_ADDRESS, SHOP_PHONE_DISPLAY, SHOP_LAT, SHOP_LNG, SHOP_HOURS_DISPLAY } from '../lib/shop';
import { createFileRoute, Link } from '@tanstack/react-router';
import { seo } from '../lib/seo';
import React, { useState, useEffect, useRef } from 'react';

export const Route = createFileRoute('/locations')({
  head: () => seo({ title: 'Our Location - Amir Fast Food', description: 'Visit or order from Amir Fast Food in Kakazai, Lahore.', path: '/locations' }),
  component: LocationsPage,
});

function LocationsPage() {
  const [mapMounted, setMapMounted] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            setMapMounted(true);
            observer.disconnect();
          }
        },
        { rootMargin: '300px' }
      );
      if (containerRef.current) {
        observer.observe(containerRef.current);
      }
      return () => observer.disconnect();
    } else if ('requestIdleCallback' in window) {
      const id = (window as any).requestIdleCallback(() => setMapMounted(true));
      return () => (window as any).cancelIdleCallback(id);
    } else {
      const timer = setTimeout(() => setMapMounted(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${SHOP_LAT},${SHOP_LNG}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">Our Location</h1>
        <p className="text-muted-foreground mt-4 text-lg">Amir Fast Food, Kakazai, Lahore</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center bg-card rounded-3xl p-8 border border-border shadow-2xl">
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Amir Fast Food</h2>
            <p className="text-primary font-semibold mt-2">Delivery in Lahore (see delivery area and fees in the Terms)</p>
          </div>
          
          <div className="space-y-4 text-muted-foreground">
            <div className="flex items-start gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <div>
                <p className="font-medium text-foreground">Address</p>
                <p>{SHOP_ADDRESS}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div>
                <p className="font-medium text-foreground">Operational Hours</p>
                <p>{SHOP_HOURS_DISPLAY}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              <div>
                <p className="font-medium text-foreground">Contact Phone</p>
                <p>{SHOP_PHONE_DISPLAY}</p>
              </div>
            </div>
          </div>
          
          <div className="pt-4 flex flex-wrap gap-4">
            <Link to="/menu" preload="intent" className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-8 rounded-full transition-all shadow-lg shadow-primary/30">
              Order Now
            </Link>
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="inline-block bg-accent hover:bg-accent/80 text-foreground font-bold py-3 px-8 rounded-full transition-all border border-border">
              Get Directions
            </a>
          </div>
        </div>
        
        {/* Auto-mounting interactive map with fixed skeleton (CLS 0, zero cookie tracking) */}
        <div 
          ref={containerRef}
          className="h-96 w-full rounded-2xl overflow-hidden border border-border shadow-inner bg-card flex flex-col items-center justify-center relative"
        >
          {(!mapMounted || !iframeLoaded) && (
            <div className="absolute inset-0 bg-muted/40 animate-pulse flex flex-col items-center justify-center p-6 text-center z-10 pointer-events-none">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-muted-foreground">Loading location map...</span>
            </div>
          )}

          {mapMounted && (
            <iframe 
              src={`https://www.openstreetmap.org/export/embed.html?bbox=74.254939%2C31.496767%2C74.264939%2C31.502767&layer=mapnik&marker=${SHOP_LAT}%2C${SHOP_LNG}`}
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
              title="Amir Fast Food location map"
              onLoad={() => setIframeLoaded(true)}
              className="w-full h-full"
            />
          )}

          <div className="absolute bottom-3 right-3 z-20">
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-background/95 hover:bg-background text-foreground text-xs font-bold py-1.5 px-3 rounded-lg shadow-md border border-border backdrop-blur-sm inline-flex items-center gap-1.5 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary" aria-hidden="true" focusable="false"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Open in Google Maps
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
