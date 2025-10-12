const http = require('http');
const url = require('url');
const {
  getClient,
  getCSS,
  notFound,
  getPokemon,
  getPokemonBy,
  getTypes,
  getPokemonRandom,
  updatePokemonPOST,
  addPokemonPOST,
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

  // /pokemon: query filtering by type / search / limit / offset
  if (pathname === '/pokemon' && (method === 'GET' || method === 'HEAD')) {
    return getPokemon(request, response, parsed);
  }

  // /pokemon/by: id / name
  if (pathname === '/pokemon/by' && (method === 'GET' || method === 'HEAD')) {
    return getPokemonBy(request, response, parsed);
  }

  // /types: return unique types from the dataset
  if (pathname === '/types' && (method === 'GET' || method === 'HEAD')) {
    return getTypes(request, response, parsed);
  }

  // /pokemon/random: return certain number of random pokes from the dataset
  if (
    pathname === '/pokemon/random'
    && (method === 'GET' || method === 'HEAD')
  ) {
    return getPokemonRandom(request, response, parsed);
  }

  // /pokemon/update: updates in-memory dataset of pokemon found by id
  if (pathname === '/pokemon/update' && method === 'POST') {
    return updatePokemonPOST(request, response);
  }

  // /pokemon/add: create new pokemon with unique id
  if (pathname === '/pokemon/add' && method === 'POST') {
    return addPokemonPOST(request, response);
  }

  // any other page -> 404
  return notFound(request, response);
};

http.createServer(onRequest).listen(PORT, () => {
  console.log(`Server listening on http://127.0.0.1:${PORT}`);
});
