// ---- ROUTE DEFINITIONS ----
const routes = [
  { match: (url) => url.pathname.startsWith('/proxy'),        handler: handleGenericProxy },
];

// ---- ENTRY POINT ----
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return corsResponse(null, 204);

    const apiKey = env.API_KEY;
    if (apiKey) {
      const clientKey = request.headers.get('X-Proxy-Key');
      if (clientKey !== apiKey) return corsResponse(JSON.stringify({ error: 'Unauthorized' }), 401);
    }

    const url = new URL(request.url);
    const route = routes.find(r => r.match(url));

    if (!route) return corsResponse(JSON.stringify({ error: `No route for ${url.pathname}` }), 404);

    try {
      return await route.handler(request, url, env);
    } catch (error) {
      return corsResponse(JSON.stringify({ error: error.message, request, url, env }), 500);
    }
  }
};

// ---- HANDLERS ----

async function handleGenericProxy(request, url) {
  const target = url.searchParams.get('url');
  if (!target) return corsResponse(JSON.stringify({ error: 'Missing ?url= param' }), 400);

  const targetUrl    = new URL(target);
  const targetOrigin = `${targetUrl.protocol}//${targetUrl.hostname}`;

  const forwardHeaders = new Headers(request.headers);

  forwardHeaders.set('origin',  request.headers.get('x-custom-origin')  ?? targetOrigin);
  forwardHeaders.set('referer', request.headers.get('x-custom-referer') ?? `${targetOrigin}/`);

  const HEADERS_TO_DROP = [
    'x-custom-origin', 'x-custom-referer',
    'host', 'content-length', 
    'cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cf-visitor',
    'x-forwarded-proto', 'x-real-ip',
    'sec-fetch-dest', 'sec-fetch-mode', 'sec-fetch-site',
  ];
  HEADERS_TO_DROP.forEach(h => forwardHeaders.delete(h));

  const proxyRequest = new Request(targetUrl.toString(), {
    method:   request.method,
    headers:  forwardHeaders,
    body:     ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'follow',
  });

  const response = await fetch(proxyRequest);

  const responseHeaders = Object.fromEntries(response.headers);
  // delete responseHeaders['content-encoding'];
  // delete responseHeaders['transfer-encoding'];

  const responseBody = await response.text();

  return new Response(responseBody, {
    status:  response.status,
    headers: {
      ...responseHeaders,
      // 'Content-Type':                'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

// ---- HELPERS ----

function corsResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    }
  });
}