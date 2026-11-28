import React, { createContext, useContext } from 'react';
import { DEFAULT_SITE_LAYOUT, mergeWithLayoutDefaults, type SiteLayoutConfig } from './layoutContent';

const PublishedLayoutContext = createContext<SiteLayoutConfig>(DEFAULT_SITE_LAYOUT);

export function PublishedLayoutProvider({
  value,
  children,
}: {
  value?: SiteLayoutConfig | null;
  children: React.ReactNode;
}) {
  const safeLayout = React.useMemo(() => mergeWithLayoutDefaults(value || DEFAULT_SITE_LAYOUT), [value]);
  return (
    <PublishedLayoutContext.Provider value={safeLayout}>
      {children}
    </PublishedLayoutContext.Provider>
  );
}

export function usePublishedLayout(): SiteLayoutConfig {
  return useContext(PublishedLayoutContext);
}
