/// <reference types="vite/client" />

declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    'data-dnd-kit-disabled-draggable'?: boolean; // Changed to boolean
  }
}