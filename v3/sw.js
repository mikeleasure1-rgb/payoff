/* Payoff service worker (v2.2). Same-origin only: it caches this app's own files so the app opens offline, and nothing else.
   It makes no requests to any other site and never touches your saved numbers (those live in localStorage, not here).
   Updates: bump VERSION on every release. A changed sw.js installs, takes over at once, and deletes older caches. Pages are
   fetched network-first (fresh when online, cached when offline or when the network is slow), so a release shows up on the next open.
   Each folder keeps its own cache (payoff-root-..., payoff-v2-2-...) and cleanup deletes only that folder's older caches. The /payoff/ worker
   leaves the version folders (/payoff/v1/, /v2/, /v2-1/, ...) alone so each opens as itself. */
var VERSION='payoff-v3-5-1';
var SCOPE=self.registration.scope;
var FOLDER=(SCOPE.replace(/\/$/,'').split('/').pop()||'root');
var PREFIX='payoff-'+(/^v\d/.test(FOLDER)?FOLDER:'root')+'-';
var CACHE=PREFIX+VERSION.replace(/^payoff-/,'');
var FILES=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png'];
var SLOW=4000;
self.addEventListener('install',function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(FILES.map(function(f){return c.add(new Request(f,{cache:'reload'})).catch(function(){});}));
  }));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==CACHE&&k.indexOf(PREFIX)===0;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.clients.claim();}).then(function(){return self.clients.matchAll({type:'window'});}).then(function(cs){cs.forEach(function(c){c.postMessage({payoffVersion:VERSION});});}));
});
/* this folder's own files only; anything inside a version subfolder (v1/, v2/, v2-1/, ...) is left to the browser */
function mine(u){if(u.origin!==location.origin||u.href.indexOf(SCOPE)!==0)return false;return !/^v\d[^/]*(\/|$)/.test(u.href.slice(SCOPE.length));}
self.addEventListener('fetch',function(e){
  var r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||!mine(u))return;
  var nav=r.mode==='navigate';
  var net=fetch(r).then(function(res){
    if(res&&res.ok&&res.type==='basic'){var cp=res.clone();caches.open(CACHE).then(function(c){c.put(r,cp);});}
    return res;
  });
  /* offline copy: this exact file, or (for the folder's own page only) the cached app page; otherwise fail and let the browser show its offline page */
  var self_page=nav&&u.href.split(/[?#]/)[0].replace(/index\.html$/,'')===SCOPE;
  var cached=function(){return caches.open(CACHE).then(function(c){return c.match(r,{ignoreSearch:true}).then(function(m){return m||(self_page?c.match('./'):undefined);});}).then(function(m){return m||Promise.reject(new Error('offline'));});};
  var out=nav?new Promise(function(ok,no){
    var done=false,t=setTimeout(function(){cached().then(function(m){if(!done){done=true;ok(m);}},function(){});},SLOW);
    net.then(function(res){clearTimeout(t);if(!done){done=true;ok(res);}},function(){clearTimeout(t);cached().then(function(m){if(!done){done=true;ok(m);}},function(x){if(!done){done=true;no(x);}});});
  }):net.catch(cached);
  e.respondWith(out);
  e.waitUntil(net.catch(function(){}));
});
