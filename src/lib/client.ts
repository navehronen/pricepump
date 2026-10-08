export async function api<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal, cache: 'no-store' });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error("We couldn't load current prices. Try again.");
  }
  if (!response.ok) {
    const message = response.status === 429 ? 'Too many searches. Please wait a minute and try again.' : "We couldn't load current prices. Try again.";
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}
