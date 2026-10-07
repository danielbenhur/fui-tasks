/* FUI Tasks / Virtual TCC - servidor minimo sem framework. */
var http = require('http');
var fs = require('fs');
var path = require('path');
var tccPrompt = require('./server/tcc-prompt').SYSTEM_PROMPT;

var PORT = parseInt(process.env.PORT || '3000', 10);
var PUBLIC_DIR = path.join(__dirname, 'public');
var HF_TOKEN = process.env.HF_TOKEN || '';
var HF_MODEL = process.env.HF_MODEL || 'Qwen/Qwen3-4B-Instruct-2507';
var GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
var GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
var MAX_BODY = 1024 * 1024;
var ALLOWED_ORIGINS = {
  'https://danielbenhur.github.io': true,
  'http://localhost:3000': true,
  'http://127.0.0.1:3000': true
};

var mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon'
};

function setCorsHeaders(req, res) {
  var origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS[origin]) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '600');
    res.setHeader('Vary', 'Origin');
  }
}

function sendJson(req, res, status, value) {
  var body = JSON.stringify(value);
  setCorsHeaders(req, res);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

function sendText(req, res, status, text) {
  setCorsHeaders(req, res);
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(text);
}

function readBody(req, callback) {
  var chunks = [], length = 0;
  req.on('data', function (chunk) {
    length += chunk.length;
    if (length <= MAX_BODY) { chunks.push(chunk); }
  });
  req.on('end', function () {
    if (length > MAX_BODY) { callback(new Error('payload_too_large')); return; }
    try { callback(null, JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
    catch (e) { callback(new Error('invalid_json')); }
  });
  req.on('error', function () { callback(new Error('request_error')); });
}

function cleanMessages(messages) {
  var allowed = { user: true, assistant: true };
  var result = [], i, item, content;
  if (!Array.isArray(messages)) { return result; }
  for (i = 0; i < messages.length && result.length < 24; i++) {
    item = messages[i] || {};
    if (!allowed[item.role]) { continue; }
    content = String(item.content || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
    if (!content) { continue; }
    result.push({ role: item.role, content: content.slice(0, 4000) });
  }
  return result;
}

function hasSafetySignal(text) {
  return /\b(suicid|tirar\s+minha\s+vida|me\s+matar|matar-me|nao\s+quero\s+viver|nao\s+quero\s+viver|me\s+(?:ferir|machucar)|auto?les[aa]o|cortar\s+(?:me|meus)|viol[ee]ncia\s+iminente|matar\s+algu[ee]m|n[aa]o\s+consigo\s+ficar\s+segur[oa])\b/i.test(String(text || ''));
}

function safetyReply() {
  return 'Sinto muito que voce esteja passando por algo tao intenso. Neste momento, a prioridade e sua seguranca, nao analisar pensamentos. Voce corre perigo imediato ou tem um plano para se ferir ou ferir alguem? Se sim, ligue agora para o servico de emergencia da sua regiao (no Brasil, SAMU 192 ou Policia 190), va a um pronto-socorro ou peca a uma pessoa de confianca para ficar com voce. No Brasil, o CVV atende pelo 188. Se estiver em outro pais, use o numero local de emergencia ou uma linha de crise. Nao permaneca sozinho(a) enquanto houver risco.';
}

function demoReply(messages, explanation) {
  var last = messages.length ? messages[messages.length - 1].content : '';
  if (!last) { return 'Estou no modo demonstracao. O que esta acontecendo que voce gostaria de compreender ou lidar melhor?'; }
  return 'Entendi que voce trouxe "' + last.slice(0, 180) + (last.length > 180 ? '..."' : '"') + '. Estou no modo demonstracao porque ' + explanation + '. Quando a IA estiver disponivel, vamos investigar isso com calma, uma pergunta por vez. Qual foi uma situacao especifica e recente em que isso aconteceu?';
}

function providerExplanation(error) {
  if (error && error.provider === 'gemini' && (error.status === 401 || error.status === 403)) { return 'a chave do Google Gemini foi recusada'; }
  if (error && error.provider === 'gemini' && error.status === 429) { return 'o limite gratuito do Google Gemini foi atingido temporariamente'; }
  if (error && error.provider === 'gemini' && error.status === 404) { return 'o modelo configurado do Google Gemini nao esta disponivel'; }
  if (error && error.provider === 'gemini') { return 'o Google Gemini nao respondeu normalmente'; }
  if (error && error.status === 402) { return 'a conta do Hugging Face nao tem creditos de inferencia disponiveis neste momento'; }
  if (error && error.status === 401) { return 'o token do Hugging Face foi recusado'; }
  if (error && error.status === 429) { return 'o limite temporario do Hugging Face foi atingido'; }
  return 'o provedor de IA nao respondeu normalmente';
}

function callHuggingFace(messages, callback) {
  var payload = JSON.stringify({
    model: HF_MODEL,
    messages: [{ role: 'system', content: tccPrompt }].concat(messages),
    temperature: 0.35,
    max_tokens: 320,
    stream: false
  });
  var request = require('https').request({
    hostname: 'router.huggingface.co',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + HF_TOKEN,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    },
    timeout: 45000
  }, function (upstream) {
    var chunks = [];
    upstream.on('data', function (chunk) { chunks.push(chunk); });
    upstream.on('end', function () {
      var raw = Buffer.concat(chunks).toString('utf8'), data, content;
      try { data = JSON.parse(raw); } catch (e) { callback(new Error('provider_invalid_json')); return; }
      if (upstream.statusCode < 200 || upstream.statusCode >= 300 || data.error) {
        var providerError = new Error('provider_' + upstream.statusCode);
        providerError.status = upstream.statusCode;
        callback(providerError); return;
      }
      content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (!content) { callback(new Error('provider_empty_response')); return; }
      callback(null, String(content).trim());
    });
  });
  request.on('timeout', function () { request.destroy(new Error('provider_timeout')); });
  request.on('error', function (error) { callback(error); });
  request.write(payload);
  request.end();
}

function callGemini(messages, callback) {
  var contents = [], i, item, payload, request;
  for (i = 0; i < messages.length; i++) {
    item = messages[i];
    contents.push({ role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: item.content }] });
  }
  payload = JSON.stringify({
    systemInstruction: { parts: [{ text: tccPrompt }] },
    contents: contents,
    generationConfig: { temperature: 0.35, maxOutputTokens: 320 }
  });
  request = require('https').request({
    hostname: 'generativelanguage.googleapis.com',
    path: '/v1beta/models/' + encodeURIComponent(GEMINI_MODEL) + ':generateContent?key=' + encodeURIComponent(GEMINI_API_KEY),
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    timeout: 45000
  }, function (upstream) {
    var chunks = [];
    upstream.on('data', function (chunk) { chunks.push(chunk); });
    upstream.on('end', function () {
      var raw = Buffer.concat(chunks).toString('utf8'), data, parts, content, providerError;
      try { data = JSON.parse(raw); } catch (e) { providerError = new Error('gemini_invalid_json'); providerError.provider = 'gemini'; providerError.status = upstream.statusCode; callback(providerError); return; }
      if (upstream.statusCode < 200 || upstream.statusCode >= 300 || data.error) {
        providerError = new Error('gemini_' + upstream.statusCode); providerError.provider = 'gemini'; providerError.status = upstream.statusCode; callback(providerError); return;
      }
      parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
      content = parts && parts.map(function (part) { return part.text || ''; }).join('').trim();
      if (!content) { providerError = new Error('gemini_empty_response'); providerError.provider = 'gemini'; providerError.status = 200; callback(providerError); return; }
      callback(null, content);
    });
  });
  request.on('timeout', function () { var timeoutError = new Error('gemini_timeout'); timeoutError.provider = 'gemini'; request.destroy(timeoutError); });
  request.on('error', function (error) { error.provider = 'gemini'; callback(error); });
  request.write(payload);
  request.end();
}

function handleChat(req, res) {
  readBody(req, function (error, body) {
    var messages, lastUser, reply;
    if (error) { sendJson(req, res, 400, { error: 'invalid_request', message: 'Envie uma conversa JSON valida.' }); return; }
    messages = cleanMessages(body && body.messages);
    lastUser = '';
    if (messages.length && messages[messages.length - 1].role === 'user') { lastUser = messages[messages.length - 1].content; }
    if (!lastUser) { sendJson(req, res, 400, { error: 'missing_message', message: 'Escreva uma mensagem antes de enviar.' }); return; }
    if (hasSafetySignal(lastUser)) { sendJson(req, res, 200, { reply: safetyReply(), safety: true, mode: 'safety' }); return; }
    if (!GEMINI_API_KEY && !HF_TOKEN) { sendJson(req, res, 200, { reply: demoReply(messages, 'nenhuma chave de provedor de IA foi configurada'), mode: 'demo', configured: false }); return; }
    (GEMINI_API_KEY ? callGemini : callHuggingFace)(messages, function (providerError, text) {
      if (providerError) {
        reply = demoReply(messages, providerExplanation(providerError));
        sendJson(req, res, 200, { reply: reply, mode: 'fallback', configured: true, providerStatus: providerError.status || 0, warning: providerExplanation(providerError) + '. Esta resposta e apenas demonstrativa.' });
        return;
      }
      sendJson(req, res, 200, { reply: text, mode: GEMINI_API_KEY ? 'gemini' : 'huggingface', configured: true, provider: GEMINI_API_KEY ? 'Google Gemini' : 'Hugging Face', model: GEMINI_API_KEY ? GEMINI_MODEL : HF_MODEL });
    });
  });
}

function safeFilePath(urlPath) {
  var decoded;
  try { decoded = decodeURIComponent(urlPath.split('?')[0]); } catch (e) { return null; }
  if (decoded.indexOf('\\') !== -1 || decoded.indexOf('\u0000') !== -1 || decoded.indexOf('..') !== -1) { return null; }
  if (decoded === '/' || decoded === '/tasks' || decoded === '/tcc') { return path.join(PUBLIC_DIR, 'index.html'); }
  return path.join(PUBLIC_DIR, decoded.replace(/^\//, ''));
}

function serveStatic(req, res) {
  var file = safeFilePath(req.url), extension, stream;
  if (!file || file.indexOf(PUBLIC_DIR) !== 0) { sendText(req, res, 404, 'Nao encontrado'); return; }
  fs.stat(file, function (error, stat) {
    if (!error && stat.isFile()) {
      extension = path.extname(file).toLowerCase();
      res.writeHead(200, {
        'Content-Type': mime[extension] || 'application/octet-stream',
        'Cache-Control': extension === '.js' || extension === '.css' ? 'no-cache' : 'public, max-age=300',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'same-origin'
      });
      stream = fs.createReadStream(file); stream.pipe(res); return;
    }
    if (!path.extname(file)) { fs.createReadStream(path.join(PUBLIC_DIR, 'index.html')).pipe(res); return; }
    sendText(req, res, 404, 'Nao encontrado');
  });
}

var server = http.createServer(function (req, res) {
  if (req.method === 'OPTIONS' && /^\/api\//.test(req.url.split('?')[0])) {
    setCorsHeaders(req, res);
    res.writeHead(ALLOWED_ORIGINS[req.headers.origin || ''] ? 204 : 403, { 'Cache-Control': 'no-store' });
    res.end();
    return;
  }
  if (req.method === 'GET' && req.url.split('?')[0] === '/api/tcc/status') {
    sendJson(req, res, 200, { provider: GEMINI_API_KEY ? 'Google Gemini' : HF_TOKEN ? 'Hugging Face Inference Providers' : 'Nenhum provedor', configured: !!(GEMINI_API_KEY || HF_TOKEN), model: GEMINI_API_KEY ? GEMINI_MODEL : HF_MODEL, freeTier: 'Os limites dependem da conta e do provedor; nao sao ilimitados.' }); return;
  }
  if (req.method === 'POST' && req.url.split('?')[0] === '/api/tcc/chat') { handleChat(req, res); return; }
  if (req.method !== 'GET' && req.method !== 'HEAD') { sendText(req, res, 405, 'Metodo nao permitido'); return; }
  serveStatic(req, res);
});

server.listen(PORT, '0.0.0.0', function () { console.log('FUI TCC ouvindo na porta ' + PORT); });
