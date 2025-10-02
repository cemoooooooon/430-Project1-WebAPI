"use strict";

const fs = require("fs");
const path = require("path");
const querystring = require("querystring");

const users = {};

const writeJSON = (res, status, obj) => {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
};

const writeHeadOnly = (res, status) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end();
};

// parse POST body
const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString();
      const type = req.headers["content-type"] || "";
      try {
        if (type.includes("application/json")) {
          resolve(JSON.parse(raw || "{}"));
        } else {
          resolve(querystring.parse(raw));
        }
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });

const getClient = (req, res) => {
  try {
    const html = fs.readFileSync(path.join(__dirname, "../client/client.html"));
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
  } catch (err) {
    writeJSON(res, 500, {
      message: "Unable to load client.html",
      id: "internalError",
    });
  }
};

const getCSS = (req, res) => {
  try {
    const css = fs.readFileSync(path.join(__dirname, "../client/style.css"));
    res.writeHead(200, { "Content-Type": "text/css" });
    res.end(css);
  } catch (err) {
    writeJSON(res, 500, {
      message: "Unable to load style.css",
      id: "internalError",
    });
  }
};

// with GET -> 200 + results even if empty
const getUsersGET = (req, res) => {
  writeJSON(res, 200, { users });
};

// with HEAD -> 200 without results (no body)
const getUsersHEAD = (req, res) => {
  writeHeadOnly(res, 200);
};

// with GET -> 404 + JSON error
const notRealGET = (req, res) => {
  writeJSON(res, 404, {
    message: "The page you are looking for was not found.",
    id: "notFound",
  });
};

// with HEAD -> 404 without body
const notRealHEAD = (req, res) => {
  writeHeadOnly(res, 404);
};

// any other page with GET -> 404 + JSON error
const notFoundGET = (req, res) => {
  writeJSON(res, 404, {
    message: "The page you are looking for was not found.",
    id: "notFound",
  });
};

// any other page with HEAD -> 404, no body
const notFoundHEAD = (req, res) => {
  writeHeadOnly(res, 404);
};

// /addUser with POST:
// 201: creating a new user
// 204: when updating the age of an existing user (no body)
// 400: if missing name or age
const addUserPOST = async (req, res) => {
  try {
    const body = await readBody(req);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const ageRaw = body.age;
    const hasAge =
      ageRaw !== undefined && ageRaw !== null && String(ageRaw).trim() !== "";
    if (!name || !hasAge) {
      return writeJSON(res, 400, {
        message: "Name and age are both required.",
        id: "missingParams",
      });
    }

    const age = Number(ageRaw);
    // if the user exists, update age -> 204 No Content
    if (users[name]) {
      users[name].age = age;
      res.writeHead(204); // no body
      return res.end();
    }

    // otherwise create new -> 201 with message
    users[name] = { name, age };
    return writeJSON(res, 201, { message: "User created successfully." });
  } catch (e) {
    return writeJSON(res, 500, {
      message: "Internal Server Error.",
      id: "internalError",
    });
  }
};

module.exports = {
  getClient,
  getCSS,
  getUsersGET,
  getUsersHEAD,
  notRealGET,
  notRealHEAD,
  addUserPOST,
  notFoundGET,
  notFoundHEAD,
};
