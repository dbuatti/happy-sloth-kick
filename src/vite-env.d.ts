/// <reference types="vite/client" />

declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    'data-dnd-kit-disabled-draggable'?: string; // Explicitly allow this data attribute as a string
  }
}