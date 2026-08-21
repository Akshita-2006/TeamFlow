/// <reference types="vite/client" />

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare module "react" {
  export type ReactNode = any;
  export type FormEvent<T = any> = any;
  export const useState: any;
  export const useEffect: any;
  export const StrictMode: any;
  const React: any;
  export default React;
}

declare module "react-dom/client" {
  export default any;
  export const createRoot: any;
}

declare module "react/jsx-runtime" {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}
