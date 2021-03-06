const express = require("express");
const fetch = require("axios");
const redis = require("redis");

const PORT = process.env.PORT || 5000;
const client = redis.createClient({
  url: process.env.REDIS_URL,
});

client.on("connect", () => console.log("Redis has been connected"));
client.on("error", (err) => console.log("Redis Client Error", err));

console.log(process.env.REDIS_URL, process.env.PORT);

(async () => {
  await client.connect();
  await client.set("amin", "Hey");
  const res = await client.get("amin");
  console.log(res);
})();

const app = express();

// Set response
function setResponse(username, repos) {
  return `<h2>${username} has ${repos} Github repos</h2>`;
}

// Make request to Github for data
async function getRepos(req, res, next) {
  try {
    console.log("Fetching Data...");

    const { username } = req.params;

    const response = await fetch(`https://api.github.com/users/${username}`);

    const data = response.data;
    const repos = data.public_repos;

    // Set data to Redis
    client.set(username, repos);

    res.send({ key: "github", value: setResponse(username, repos) });
  } catch (err) {
    console.error(err);
    res.status(500);
  }
}

// Cache middleware
async function cache(req, res, next) {
  const { username } = req.params;
  const value = await client.get(username);
  if (value) {
    return res.send({ key: "cashe", value: setResponse(username, value) });
  }
  next();
}

app.get("/repos/:username", cache, getRepos);

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
