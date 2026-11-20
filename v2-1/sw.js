/* Optional companion for hosted copies of Payoff. Caches only this app's own page so it opens offline.
   It makes no requests to any other site, stores no user data, and the app works without it. */
var V='payoff-v1';
self.addEventListener('install',function(e){self.skipWaiting();e.waitUntil(caches.open(V).then(function(c){return c.add(new Request('./',{cache:'reload'}));}).catch(function(){}));});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==V;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.clients.claim();}));});
self.addEventListener('fetch',function(e){
  var r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin)return;
  e.respondWith(fetch(r).then(function(res){if(res&&res.ok){var cp=res.clone();caches.open(V).then(function(c){c.put(r,cp);});}return res;}).catch(function(){return caches.match(r).then(function(m){return m||caches.match('./');});}));
});
