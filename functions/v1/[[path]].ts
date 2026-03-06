// Proxy /v1/* requests to the API worker, bypassing Cloudflare Access.
// Uses a Service Binding ("API") when available, falling back to direct fetch.

interface Env {
  API?: Fetcher;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const target = `https://api.unclebike.xyz${url.pathname}${url.search}`;

  if (context.env.API) {
    return context.env.API.fetch(
      new Request(target, {
        method: context.request.method,
        headers: context.request.headers,
        body: context.request.body,
      })
    );
  }

  return fetch(
    new Request(target, {
      method: context.request.method,
      headers: context.request.headers,
      body: context.request.body,
    })
  );
};
