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
