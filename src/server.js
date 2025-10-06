const http = require('http');
const url = require('url');
const {
  getClient,
  getCSS,
  notRealGET,
  notRealHEAD,
  notFoundGET,
  notFoundHEAD,
  getPokemonGET,
  getPokemonHEAD,
  getPokemonByGET,
  getPokemonByHEAD,
  updatePokemonPOST,
  addPokemonPOST,
  getTypesGET,
  getTypesHEAD,
  getPokemonRandomGET,
  getPokemonRandomHEAD,
} = require('./responses');

const PORT = process.env.PORT || 3000;

const onRequest = (request, response) => {
  const parsed = url.parse(request.url, true);
  const { pathname } = parsed;
  const method = request.method.toUpperCase();

  if (pathname === '/' && method === 'GET') return getClient(request, response);
  if (pathname === '/style.css' && method === 'GET') {
    return getCSS(request, response);
  }

  if (pathname === '/notReal') {
    if (method === 'GET') return notRealGET(request, response);
    if (method === 'HEAD') return notRealHEAD(request, response);
  }

  // /pokemon: query filtering by type / search / limit / offset
  if (pathname === '/pokemon') {
    if (method === 'GET') return getPokemonGET(request, response, parsed);
    if (method === 'HEAD') return getPokemonHEAD(request, response);
  }

  // /pokemon/by: id / name
  if (pathname === '/pokemon/by') {
    if (method === 'GET') return getPokemonByGET(request, response, parsed);
    if (method === 'HEAD') return getPokemonByHEAD(request, response);
  }

  // /pokemon/update: updates in-memory dataset of pokemon found by id
  if (pathname === '/pokemon/update' && method === 'POST') {
    return updatePokemonPOST(request, response);
  }

  // /pokemon/add: create new pokemon with unique id
  if (pathname === '/pokemon/add' && method === 'POST') {
    return addPokemonPOST(request, response);
  }

  // /types: return unique types from the dataset
  if (pathname === '/types') {
    if (method === 'GET') return getTypesGET(request, response);
    if (method === 'HEAD') return getTypesHEAD(request, response);
  }

  // /pokemon/random: return certain number of random pokes from the dataset
  if (pathname === '/pokemon/random') {
    if (method === 'GET') return getPokemonRandomGET(request, response, parsed);
    if (method === 'HEAD') return getPokemonRandomHEAD(request, response);
  }

  // any other page -> 404
  if (method === 'HEAD') return notFoundHEAD(request, response);
  return notFoundGET(request, response);
};

http.createServer(onRequest).listen(PORT, () => {
  console.log(`Server listening on http://127.0.0.1:${PORT}`);
});
