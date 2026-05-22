import server from '../dist/server/server.js';

export default async function (request) {
  console.log("Vercel Request received. URL:", request.url);
  try {
    const response = await server.fetch(request);
    console.log("Server responded with status:", response.status);
    return response;
  } catch (err) {
    console.error("Fatal error in Vercel API wrapper:", err);
    return new Response("Internal Server Error: " + err.message, { status: 500 });
  }
}
