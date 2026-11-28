import { createFileRoute } from '@tanstack/react-router';
import { seo } from '../lib/seo';
import { getPublishedLayoutFn } from '../server/layoutApi';
import { usePublishedLayout } from '../lib/layoutContext';
import { DEFAULT_SITE_LAYOUT } from '../lib/layoutContent';
import React from 'react';

export const Route = createFileRoute('/privacy')({
  staleTime: 0,
  gcTime: 0,
  loader: async () => ({ layout: await getPublishedLayoutFn() }),
  head: ({ loaderData }) => {
    const priv = loaderData?.layout?.privacy || DEFAULT_SITE_LAYOUT.privacy;
    return seo({ title: priv.seoTitle, description: priv.seoDescription, path: '/privacy' });
  },
  component: PrivacyPage,
});

function renderLegalBody(body: string) {
  const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
  const bullets = lines.filter(l => l.startsWith('•'));
  const paragraphs = lines.filter(l => !l.startsWith('•'));
  return (
    <>
      {paragraphs.map((p, idx) => (
        <p key={`p-${idx}`} className={idx < paragraphs.length - 1 || bullets.length > 0 ? 'mb-2' : ''}>{p}</p>
      ))}
      {bullets.length > 0 && (
        <ul className="list-disc pl-5 space-y-1.5 text-sm">
          {bullets.map((b, idx) => (
            <li key={`b-${idx}`}>{b.replace(/^•\s*/, '')}</li>
          ))}
        </ul>
      )}
    </>
  );
}

function PrivacyPage() {
  const privacy = usePublishedLayout().privacy;
  const visibleSections = privacy.sections.filter(s => s.visible !== false);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 w-full">
      <div className="bg-card border border-border rounded-3xl p-8 sm:p-12 shadow-2xl">
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">{privacy.title}</h1>
        <p className="text-muted-foreground mb-8 text-sm">{privacy.lastUpdated}</p>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          {visibleSections.map(sec => (
            <section key={sec.id}>
              <h2 className="text-xl font-bold text-foreground mb-3">{sec.title}</h2>
              {renderLegalBody(sec.body)}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
