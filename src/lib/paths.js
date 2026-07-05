/**
 * Resolve asset paths for GitHub Pages project sites (e.g. /Supermarket-Dash/).
 */

export function resolveBasePath(pathname) {
  if (!pathname || pathname === '/') {
    return '/';
  }

  if (pathname.endsWith('/')) {
    return pathname;
  }

  const lastSegment = pathname.split('/').pop() ?? '';
  if (lastSegment.includes('.')) {
    return pathname.slice(0, pathname.lastIndexOf('/') + 1);
  }

  return `${pathname}/`;
}

export function resolveAssetPath(relativePath, pathname = '/') {
  const base = resolveBasePath(pathname);
  const cleaned = relativePath.replace(/^\.\//, '');
  if (base === '/') {
    return `/${cleaned}`;
  }
  return `${base}${cleaned}`;
}

export function readRuntimeBasePath() {
  if (typeof window === 'undefined') {
    return '/';
  }
  if (window.__APP_BASE__) {
    return window.__APP_BASE__;
  }
  return resolveBasePath(window.location.pathname);
}