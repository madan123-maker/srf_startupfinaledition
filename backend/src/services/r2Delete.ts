/**
 * Cloudflare R2 Permanent Storage Policy:
 * R2 acts as an immutable document archive. Objects in R2 are NEVER deleted,
 * even when corresponding records in MongoDB or the application are soft/hard deleted.
 * 
 * This function is intentionally a NO-OP to enforce the permanent archive requirement.
 */
export const deleteFromR2 = async (key: string): Promise<boolean> => {
  if (!key) return false;
  console.log(`[R2 ARCHIVE POLICY] Delete request for key "${key}" ignored. R2 objects are permanently archived.`);
  return true;
};
