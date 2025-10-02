const http = require("http");
const url = require("url");
const {
  getClient,
  getCSS,
  getUsersGET,
  getUsersHEAD,
  notRealGET,
  notRealHEAD,
  addUserPOST,
  notFoundGET,
  notFoundHEAD,
} = require("./responses");

const PORT = process.env.PORT || 3000;

const onRequest = (request, response) => {
  const parsed = url.parse(request.url, true);
  const { pathname } = parsed;
  const method = request.method.toUpperCase();

  if (pathname === "/" && method === "GET") return getClient(request, response);
  if (pathname === "/style.css" && method === "GET") {
    return getCSS(request, response);
  }

  if (pathname === "/getUsers") {
    if (method === "GET") return getUsersGET(request, response);
    if (method === "HEAD") return getUsersHEAD(request, response);
  }

  if (pathname === "/notReal") {
    if (method === "GET") return notRealGET(request, response);
    if (method === "HEAD") return notRealHEAD(request, response);
  }

  if (pathname === "/addUser" && method === "POST") {
    return addUserPOST(request, response);
  }

  // any other page -> 404
  if (method === "HEAD") return notFoundHEAD(request, response);
  return notFoundGET(request, response);
};

http.createServer(onRequest).listen(PORT, () => {
  console.log(`Server listening on http://127.0.0.1:${PORT}`);
});
