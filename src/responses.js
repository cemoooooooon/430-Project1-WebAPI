const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

// load our pokemon data
const datasetPath = path.join(__dirname, '../data/pokedex.json');
const pokedex = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

// write helpers
const writeJSON = (res, status, obj) => {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
};

const writeHeadOnly = (res, status) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': 0,
  });
  res.end();
};

// parse POST body
const readBody = (req) => new Promise((resolve, reject) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const raw = Buffer.concat(chunks).toString();
    const type = req.headers['content-type'] || '';
    try {
      if (type.includes('application/json')) {
        resolve(JSON.parse(raw || '{}'));
      } else {
        resolve(querystring.parse(raw));
      }
    } catch (e) {
      reject(e);
    }
  });
  req.on('error', reject);
});

const getClient = (req, res) => {
  try {
    const html = fs.readFileSync(path.join(__dirname, '../client/client.html'));
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } catch (err) {
    writeJSON(res, 500, {
      message: 'Unable to load client.html',
      id: 'internalError',
    });
  }
};

const getCSS = (req, res) => {
  try {
    const css = fs.readFileSync(path.join(__dirname, '../client/style.css'));
    res.writeHead(200, { 'Content-Type': 'text/css' });
    res.end(css);
  } catch (err) {
    writeJSON(res, 500, {
      message: 'Unable to load style.css',
      id: 'internalError',
    });
  }
};

// with GET -> 404 + JSON error
const notRealGET = (req, res) => {
  writeJSON(res, 404, {
    message: 'The page you are looking for was not found.',
    id: 'notFound',
  });
};

// with HEAD -> 404 without body
const notRealHEAD = (req, res) => {
  writeHeadOnly(res, 404);
};

// any other page with GET -> 404 + JSON error
const notFoundGET = (req, res) => {
  writeJSON(res, 404, {
    message: 'The page you are looking for was not found.',
    id: 'notFound',
  });
};

// any other page with HEAD -> 404, no body
const notFoundHEAD = (req, res) => {
  writeHeadOnly(res, 404);
};

// pokemon (GET/HEAD)
const getPokemonGET = (req, res, urlObj) => {
  const { query } = urlObj;
  let results = pokedex;

  // filter by type
  if (query.type) {
    const t = String(query.type).toLowerCase();
    results = results.filter(
      (p) => Array.isArray(p.type)
        && p.type.some((x) => String(x).toLowerCase() === t),
    );
  }

  // name contains search
  if (query.search) {
    const s = String(query.search).toLowerCase();
    results = results.filter((p) => String(p.name).toLowerCase().includes(s));
  }

  // limit & offset
  const offset = Number(query.offset || 0);
  const limit = Math.max(0, Math.min(100, Number(query.limit || 50)));
  const sliced = results.slice(offset, offset + limit);

  return writeJSON(res, 200, {
    count: results.length,
    offset,
    limit,
    data: sliced,
  });
};

const getPokemonHEAD = (req, res) => writeHeadOnly(res, 200);

// pokemon/by (GET/HEAD)
// accepts id or name
const getPokemonByGET = (req, res, urlObj) => {
  const { id, name } = urlObj.query;

  if (id == null && !name) {
    return writeJSON(res, 400, {
      message: 'Provide id or name',
      id: 'badRequest',
    });
  }

  let found = null;

  if (id != null) {
    found = pokedex.find((p) => String(p.id) === String(id));
  } else if (name) {
    const n = String(name).toLowerCase();
    found = pokedex.find((p) => String(p.name).toLowerCase() === n);
  }

  if (!found) {
    return writeJSON(res, 404, {
      message: 'Not found',
      id: 'notFound',
    });
  }

  return writeJSON(res, 200, found);
};

const getPokemonByHEAD = (req, res) => writeHeadOnly(res, 200);

// /pokemon/update with POST:
// edits an existing pokemon in memory and returns 204 on success
// content-type: application/json or application/x-www-form-urlencoded
const updatePokemonPOST = (req, res) => {
  const collectBody = () => new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });

  const badRequest = (msg = 'Invalid request body', id = 'badRequest') => {
    writeJSON(res, 400, { message: msg, id });
    return null;
  };

  const notFound = (msg = 'Target resource not found', id = 'notFound') => {
    writeJSON(res, 404, { message: msg, id });
    return null;
  };

  const success204 = () => {
    writeHeadOnly(res, 204);
    return null;
  };

  // only allow json or urlencoded
  const ctype = (req.headers['content-type'] || '').toLowerCase();
  const isJSON = ctype.includes('application/json');
  const isForm = ctype.includes('application/x-www-form-urlencoded');
  if (!isJSON && !isForm) {
    return badRequest(
      'Content-Type must be application/json or application/x-www-form-urlencoded.',
    );
  }

  return collectBody()
    .then((raw) => {
      let bodyObj;
      try {
        bodyObj = isJSON
          ? JSON.parse(raw || '{}')
          : querystring.parse(raw || '');
      } catch (e) {
        return badRequest('Body could not be parsed as valid JSON/urlencoded.');
      }

      const id = bodyObj && bodyObj.id;
      if (!id || String(id).trim() === '') {
        return badRequest('Missing required field: id');
      }

      const idx = pokedex.findIndex((p) => String(p.id) === String(id));
      if (idx === -1) {
        return notFound('No Pokémon found with that id :(');
      }

      const updates = { ...bodyObj };
      delete updates.id;
      if (Object.keys(updates).length === 0) {
        return badRequest(
          'Provide at least one field to update besides the id.',
        );
      }

      Object.assign(pokedex[idx], updates);
      return success204();
    })
    .catch(() => badRequest('Unable to read request body :('));
};

// /pokemon/add (POST):
// creates a new pokemon
// requires: id (number) and name (string)
const addPokemonPOST = (req, res) => {
  const badRequest = (msg = 'Invalid request body', id = 'badRequest') => {
    writeJSON(res, 400, { message: msg, id });
    return null;
  };
  const success201 = (obj) => {
    writeJSON(res, 201, obj);
    return null;
  };

  // only allow JSON or urlencoded
  const ctype = (req.headers['content-type'] || '').toLowerCase();
  const isJSON = ctype.includes('application/json');
  const isForm = ctype.includes('application/x-www-form-urlencoded');
  if (!isJSON && !isForm) {
    return badRequest(
      'Content-Type must be application/json or application/x-www-form-urlencoded.',
    );
  }

  return readBody(req)
    .then((body) => {
      // requires id and name
      const idRaw = body && body.id;
      const nameRaw = body && typeof body.name === 'string' ? body.name.trim() : '';
      if (!idRaw || !nameRaw) {
        return badRequest('Missing required fields: id and name');
      }

      const id = Number(idRaw);
      if (Number.isNaN(id)) {
        return badRequest("Field 'id' must be a number.");
      }

      // unique by id
      if (pokedex.find((p) => String(p.id) === String(id))) {
        return badRequest('A Pokémon with that id already exists.');
      }

      // types: accept array / comma separated string
      let types = [];
      if (Array.isArray(body.type)) {
        types = body.type.map((t) => String(t).trim()).filter(Boolean);
      } else if (typeof body.type === 'string') {
        types = body.type
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
      }

      // create minimal record
      const record = { id, name: nameRaw };
      if (types.length) record.type = types;

      pokedex.push(record);
      return success201({
        message: 'Pokémon created successfully!',
        data: record,
      });
    })
    .catch(() => badRequest('Unable to read request body.'));
};

// /types (GET/HEAD):
// returns unique pokemon types from the dataset
const getTypesGET = (req, res) => {
  const seen = Object.create(null);

  pokedex.forEach((p) => {
    if (Array.isArray(p.type)) {
      p.type.forEach((t) => {
        const k = String(t);
        if (k) seen[k] = true;
      });
    }
  });

  const types = Object.keys(seen).sort((a, b) => a.localeCompare(b));
  writeJSON(res, 200, { count: types.length, types });
  return null; // to make eslint's consistent-return happy
};

// /pokemon/random (GET/HEAD):
// Returns n number of random pokemon (default 1)
const getPokemonRandomGET = (req, res, urlObj) => {
  const q = urlObj && urlObj.query ? urlObj.query : {};
  const nRaw = q.count;
  let n = Number(nRaw);
  if (Number.isNaN(n) || n <= 0) n = 1;
  // cap to something reasonable
  const limit = Math.min(50, Math.max(1, n));

  // shuffle copy
  const shuffled = pokedex.slice().sort(() => Math.random() - 0.5);
  const data = shuffled.slice(0, limit);

  writeJSON(res, 200, { count: data.length, data });
  return null;
};

const getPokemonRandomHEAD = (req, res) => {
  writeHeadOnly(res, 200);
  return null;
};

const getTypesHEAD = (req, res) => {
  writeHeadOnly(res, 200);
  return null;
};

module.exports = {
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
};
