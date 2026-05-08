const CACHE_NAME = 'word-learner-v1';
const basePath = '/word';

// 只缓存静态资源，不缓存 HTML（HTML 使用网络优先）
const urlsToCache = [
    `${basePath}/`,
    `${basePath}/manifest.json`
];

// 安装时缓存静态资源
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting()) // 立即激活新的 Service Worker
    );
});

// 激活时清理旧版本缓存
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim()) // 立即控制所有页面
    );
});

// 请求拦截：HTML 网络优先，其他资源缓存优先
self.addEventListener('fetch', event => {
    const { request } = event;

    // 导航请求或 HTML 文档：网络优先
    if (request.mode === 'navigate' || request.destination === 'document') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // 更新缓存
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // 离线时回退到缓存
                    return caches.match(request);
                })
        );
        return;
    }

    // 其他资源（JS、CSS、图片等）：缓存优先
    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                return cachedResponse || fetch(request).then(response => {
                    // 可选：将新资源加入缓存
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                });
            })
    );
});
