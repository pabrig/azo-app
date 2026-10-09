function trimSlash(value: string) {
  return value.replace(/\/$/, "");
}

/** IDs públicos del proyecto Appwrite. Se pueden pisar con variables VITE_ en el build. */
export const config = {
  appwriteEndpoint: trimSlash(
    import.meta.env.VITE_APPWRITE_ENDPOINT || "https://nyc.cloud.appwrite.io/v1"
  ),
  appwriteProjectId:
    import.meta.env.VITE_APPWRITE_PROJECT_ID || "6ac29fc000257d92bdc4",
  appwriteDatabaseId:
    import.meta.env.VITE_APPWRITE_DATABASE_ID || "6ac2a2b100201252c574",
  appwriteTableId: import.meta.env.VITE_APPWRITE_TABLE_ID || "championship",
  adminPin: import.meta.env.VITE_ADMIN_PIN || "296"
};

export const CHAMP_ID = "main";
export const MAX_DOC_BYTES = 2.5 * 1024 * 1024;

/** Punto de referencia para el pronóstico (Río de la Plata / CNA). Override con VITE_WEATHER_*. */
export const weatherVenue = {
  latitude: Number(import.meta.env.VITE_WEATHER_LAT ?? -34.4492),
  longitude: Number(import.meta.env.VITE_WEATHER_LON ?? -58.5058),
  elevation: Number(import.meta.env.VITE_WEATHER_ELEVATION ?? 0),
  timezone: import.meta.env.VITE_WEATHER_TZ || "America/Argentina/Buenos_Aires",
  label: import.meta.env.VITE_WEATHER_LABEL || "Club Náutico Azopardo"
};
