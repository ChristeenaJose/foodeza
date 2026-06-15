/**
 * Copy to js/pos-auth-config.js and set your own password hash.
 *
 * Generate hash (browser console on any POS page after loading js/pos-auth.js):
 *   POS_AUTH.hashPassword('YourNewPassword').then(console.log)
 *
 * Default password in repo config: FoodezaPOS2026 — change before production.
 */
window.POS_AUTH_CONFIG = {
  /** SHA-256 hex of staff password */
  passwordHash: '4095b347dc64e99b66c074b838eab02a7f7be089497f0f3a5e5a693f3c346654',
};
