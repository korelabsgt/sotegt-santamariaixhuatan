import supabaseAdmin from "@/utils/supabase/admin";

let cachedUsers: any[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

export function invalidateCachedAuthUsers() {
  cachedUsers = null;
  lastFetchTime = 0;
}

export async function getCachedAuthUsers() {
  const now = Date.now();

  if (cachedUsers && now - lastFetchTime < CACHE_TTL) {
    return cachedUsers;
  }

  try {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (data?.users) {
      cachedUsers = data.users;
      lastFetchTime = now;
      return cachedUsers;
    }
  } catch (error) {
    console.error("Error fetching auth users:", error);
  }

  return cachedUsers || [];
}
