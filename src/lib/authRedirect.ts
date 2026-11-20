// OAuth and email-link redirects must land on the app root *without* a hash:
// HashRouter owns the fragment, and the PKCE flow returns ?code=... in the query.

const CALLBACK_PARAMS = ['code', 'error', 'error_code', 'error_description', 'state']

/** e.g. https://okkar06.github.io/ApplyFlow/ or http://localhost:5173/ApplyFlow/ */
export const authRedirectUrl = () => new URL(import.meta.env.BASE_URL, window.location.origin).toString()

/**
 * Call after supabase.auth.getSession() resolves (the client has exchanged the
 * code by then). Removes callback params from the address bar and returns a
 * readable error if the provider sent one.
 */
export const consumeAuthCallbackParams = (): string | undefined => {
  const url = new URL(window.location.href)
  const hadParams = CALLBACK_PARAMS.some((key) => url.searchParams.has(key))
  if (!hadParams) return undefined
  const description = url.searchParams.get('error_description') ?? url.searchParams.get('error') ?? undefined
  for (const key of CALLBACK_PARAMS) url.searchParams.delete(key)
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  return description ? description.replace(/\+/g, ' ').slice(0, 300) : undefined
}
