/* FUI Tasks / Virtual TCC — servidor mínimo sem framework. */
var http = require('http');
var fs = require('fs');
var path = require('path');
var tccPrompt = require('./server/tcc-prompt').SYSTEM_PROMPT;

var PORT = parseInt(process.env.PORT || '3000', 10);
var PUBLIC_DIR = path.join(__dirname, 'public');
var HF_TOKEN = process.env.HF_TOKEN || '';
var HF_MODEL = process.env.HF_MODEL || 'Qwen/Qwen3-4B-Instruct-2507';
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
  return /\b(suicid|tirar\s+minha\s+vida|me\s+matar|matar-me|não\s+quero\s+viver|nao\s+quero\s+viver|me\s+(?:ferir|machucar)|auto?les[aã]o|cortar\s+(?:me|meus)|viol[eê]ncia\s+iminente|matar\s+algu[eé]m|n[aã]o\s+consigo\s+ficar\s+segur[oa])\b/i.test(String(text || ''));
}

function safetyReply() {
  return 'Sinto muito que você esteja passando por algo tão intenso. Neste momento, a prioridade é sua segurança, não analisar pensamentos. Você corre perigo imediato ou tem um plano para se ferir ou ferir alguém? Se sim, ligue agora para o serviço de emergência da sua região (no Brasil, SAMU 192 ou Polícia 190), vá a um pronto-socorro ou peça a uma pessoa de confiança para ficar com você. No Brasil, o CVV atende pelo 188. Se estiver em outro país, use o número local de emergência ou uma linha de crise. Não permaneça sozinho(a) enquanto houver risco.';
}

function demoReply(messages, explanation) {
  var last = messages.length ? messages[messages.length - 1].content : '';
  if (!last) { return 'Estou no modo demonstração. O que está acontecendo que você gostaria de compreender ou lidar melhor?'; }
  return 'Entendi que você trouxe “' + last.slice(0, 180) + (last.length > 180 ? '…”' : '”') + '. Estou no modo demonstração porque ' + explanation + '. Quando a IA estiver disponível, vamos investigar isso com calma, uma pergunta por vez. Qual foi uma situação específica e recente em que isso aconteceu?';
}

function providerExplanation(error) {
  if (error && error.status === 402) { return 'a conta do Hugging Face não tem créditos de inferência disponíveis neste momento'; }
  if (error && error.status === 401) { return 'o token do Hugging Face foi recusado'; }
  if (error && error.status === 429) { return 'o limite temporário do Hugging Face foi atingido'; }
  return 'o provedor de IA não respondeu normalmente';
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

function handleChat(req, res) {
  readBody(req, function (error, body) {
    var messages, lastUser, reply;
    if (error) { sendJson(req, res, 400, { error: 'invalid_request', message: 'Envie uma conversa JSON válida.' }); return; }
    messages = cleanMessages(body && body.messages);
    lastUser = '';
    if (messages.length && messages[messages.length - 1].role === 'user') { lastUser = messages[messages.length - 1].content; }
    if (!lastUser) { sendJson(req, res, 400, { error: 'missing_message', message: 'Escreva uma mensagem antes de enviar.' }); return; }
    if (hasSafetySignal(lastUser)) { sendJson(req, res, 200, { reply: safetyReply(), safety: true, mode: 'safety' }); return; }
    if (!HF_TOKEN) { sendJson(req, res, 200, { reply: demoReply(messages, 'nenhuma chave do Hugging Face foi configurada'), mode: 'demo', configured: false }); return; }
    callHuggingFace(messages, function (providerError, text) {
      if (providerError) {
        reply = demoReply(messages, providerExplanation(providerError));
        sendJson(req, res, 200, { reply: reply, mode: 'fallback', configured: true, providerStatus: providerError.status || 0, warning: providerExplanation(providerError) + '. Esta resposta é apenas demonstrativa.' });
        return;
      }
      sendJson(req, res, 200, { reply: text, mode: 'huggingface', configured: true, model: HF_MODEL });
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
  if (!file || file.indexOf(PUBLIC_DIR) !== 0) { sendText(req, res, 404, 'Não encontrado'); return; }
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
    sendText(req, res, 404, 'Não encontrado');
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
    sendJson(req, res, 200, { provider: 'Hugging Face Inference Providers', configured: !!HF_TOKEN, model: HF_MODEL, freeTier: 'O limite depende da conta e do provedor; não é ilimitado.' }); return;
  }
  if (req.method === 'POST' && req.url.split('?')[0] === '/api/tcc/chat') { handleChat(req, res); return; }
  if (req.method !== 'GET' && req.method !== 'HEAD') { sendText(req, res, 405, 'Método não permitido'); return; }
  serveStatic(req, res);
});

server.listen(PORT, '0.0.0.0', function () { console.log('FUI TCC ouvindo na porta ' + PORT); });
