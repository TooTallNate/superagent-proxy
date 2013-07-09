var request = require('superagent');

// extend with Request#proxy()
require('./')(request);

// HTTP, HTTPS, or SOCKS proxy to use
var proxy = process.env.http_proxy || 'http://168.63.43.102';

request
  .get(process.argv[2] || 'https://encrypted.google.com/')
  .proxy(proxy)
  .end(onresponse);

function onresponse (res) {
  console.log(res.status, res.headers);
  console.log(res.body);
}
