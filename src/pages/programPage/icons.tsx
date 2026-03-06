import type { SVGProps } from "react";

export function XBrandIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.244 2H21.5l-7.113 8.13L22.75 22h-6.547l-5.127-6.71L5.202 22H1.944l7.607-8.695L1.5 2h6.713l4.635 6.123zm-1.141 18.05h1.804L7.233 3.846H5.297z" />
    </svg>
  );
}

export function HashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M9 3 7.5 21M16.5 3 15 21M4 9h17M3 15h17"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function YoutubeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M21.58 7.19a2.99 2.99 0 0 0-2.1-2.12C17.65 4.5 12 4.5 12 4.5s-5.65 0-7.48.57a2.99 2.99 0 0 0-2.1 2.12A31.44 31.44 0 0 0 2 12a31.44 31.44 0 0 0 .42 4.81 2.99 2.99 0 0 0 2.1 2.12c1.83.57 7.48.57 7.48.57s5.65 0 7.48-.57a2.99 2.99 0 0 0 2.1-2.12A31.44 31.44 0 0 0 22 12a31.44 31.44 0 0 0-.42-4.81Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m10 15.5 5-3.5-5-3.5v7Z" fill="currentColor" />
    </svg>
  );
}

export function ZoomIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <rect x="3" y="6.5" width="11.5" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M14.5 10.2 20.2 8v8l-5.7-2.2V10.2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
