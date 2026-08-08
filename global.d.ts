/**
 * Ambient module declarations for non-TypeScript asset imports.
 */

declare module "*.sql" {
  const content: string;
  export default content;
}
