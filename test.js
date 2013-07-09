
var request = require('superagent');
var proxy = require('./');

// extend with Request#proxy()
proxy(request);

// HTTP or HTTPS proxy to use
var proxy = process.env.http_proxy || 'http://168.63.43.102';

request
  .get(process.argv[2] || 'https://encrypted.google.com/')
  .proxy(proxy)
  .end(onresponse);

function onresponse (res) {
  console.log(res);
}
