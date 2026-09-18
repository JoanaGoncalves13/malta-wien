export default function SetupMissing() {
  return (
    <main className="page">
      <h1>Supabase not connected</h1>
      <p className="muted">
        Create the .env.local file with the Supabase Project URL and public key, then run npm run dev again.
      </p>
    </main>
  );
}
