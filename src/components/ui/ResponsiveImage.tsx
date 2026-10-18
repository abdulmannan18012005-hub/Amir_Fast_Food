import React from 'react';

interface ResponsiveImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

const WIDTHS = [320, 480, 640, 768, 1024, 1280, 1600];

export function ResponsiveImage({
  src,
  alt,
  width,
  height,
  sizes = '100vw',
  priority = false,
  className = '',
  onError
}: ResponsiveImageProps) {
  // Generate srcSet via Vercel Image Optimization for remote/local images
  const isOptimizable = src && !src.startsWith('data:') && !src.endsWith('.svg');
  
  const srcSet = isOptimizable
    ? WIDTHS.map(w => `/_vercel/image?url=${encodeURIComponent(src)}&w=${w}&q=75 ${w}w`).join(', ')
    : undefined;

  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={className}
      onError={onError}
    />
  );
}
