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
    'host', 'content-length', 'x-api-key',
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
  delete responseHeaders['content-encoding'];
  delete responseHeaders['transfer-encoding'];

  const responseBody = await response.text();

  return new Response(responseBody, {
    status:  response.status,
    headers: {
      ...responseHeaders,
      'Content-Type':                'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
    },
  });
}