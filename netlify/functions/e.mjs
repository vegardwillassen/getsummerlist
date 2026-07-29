export default async (req) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  try {
    const body = (await req.text()).slice(0, 500);
    console.log('event', body);
  } catch (err) { /* a lost event is fine, the page must never notice */ }
  return new Response(null, { status: 204 });
};
