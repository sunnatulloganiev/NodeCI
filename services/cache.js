const mongoose = require('mongoose');
const { createClient } = require('redis');
let client;

const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function (options = {}) {
  this.useCache = true;
  this.hashKey = JSON.stringify(options.key || '');
  return this;
};

mongoose.Query.prototype.exec = async function () {
  if (!this.useCache) return exec.apply(this, arguments);
  client = createClient();
  await client.connect();
  console.log('Im about to run a query');

  const key = JSON.stringify({
    ...this.getQuery(),
    collection: this.mongooseCollection.name,
  });

  // Do we have any cached data in redis related to this key
  const cacheValue = await client.hGet(this.hashKey, key);

  // if yes, then respond to the request right away and return
  if (cacheValue) {
    console.log('From cache');
    const doc = JSON.parse(cacheValue);

    return Array.isArray(doc)
      ? doc.map((d) => new this.model(d))
      : new this.model(doc);
  }

  // if no, we need to respond to request and update our cache to store the data

  const result = await exec.apply(this, arguments);

  await client.hSet(this.hashKey, key, JSON.stringify(result), 'EX', 10);
  // await client.disconnect();
  console.log('from mongodb');
  return result;
};

module.exports = {
  clearHash(hashKey) {
    client.del(JSON.stringify(hashKey));
  },
};
