export function isDevHost() {
  const host = (location.hostname || "").toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    new URLSearchParams(location.search).has("dev")
  );
}
