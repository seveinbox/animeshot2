
// app dependency

const http = require('http');
const https = require('https');
const fs = require('fs');

const koa = require('koa');

const koaViews = require('koa-views');
const koaLogger = require('koa-logger');
const koaStatic = require('koa-static');
const koaRouter = require('koa-trie-router');
const koaSession = require('koa-session');
const koaMount = require('koa-mount');
const koaBody = require('koa-body');
const koaCSRF = require('koa-csrf');
const koaSSL = require('koa-sslify');
const koaFlash = require('koa-better-flash');

const grant = require('grant-koa');

const setupRouter = require(__dirname + '/routes');
const defaultSettings = require(__dirname + '/animeshot-example.json');
const customSettings = require(__dirname + '/animeshot.json');
const settings = Object.assign({}, defaultSettings, customSettings);
const i18n = require(__dirname + '/i18n.json');
settings.site.i18n = i18n;

// define routing

const router = new koaRouter();
setupRouter(router);

// define app

const app = new koa();

app.use(koaLogger());

if (!settings.site.server.has_proxy) {
  app.use(koaSSL());
}

app.use(koaStatic(__dirname + '/public', {
  maxage: 1000 * 86400 * 30
}));
app.use(koaViews(__dirname + '/views', {
  extension: 'pug',
  options: {
    cache: true
  }
}));
app.use(koaBody({
  multipart: true,
  urlencoded: false,
  text: false,
  json: false,
  strict: true,
  formidable: {
    maxFileSize: 20 * 1024 * 1024
  }
}));
app.use(new koaCSRF());

app.keys = settings.cookie.keys;
app.use(koaSession(settings.cookie.session, app));
app.use(koaFlash());

app.use(koaMount(grant(settings.oauth)));
app.use(router.middleware());

// whether we use a reverse proxy like nginx
if (settings.site.server.has_proxy) {
  // start sever, let proxy handle the rest
  app.listen(settings.site.server.server_port);

} else {
  const ssl = {
    key: fs.readFileSync(__dirname + settings.site.server.ssl_key),
    cert: fs.readFileSync(__dirname + settings.site.server.ssl_certificate)
  };

  // start server
  http.createServer(app.callback()).listen(settings.site.server.http_port);
  https.createServer(ssl, app.callback()).listen(settings.site.server.https_port);
}
