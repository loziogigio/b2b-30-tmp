/** Loose email-shape check — good enough for client UX hints and server-side
 *  guard rails. Not a substitute for sending a confirmation email. */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
