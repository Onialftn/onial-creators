// Recebe os avisos do Onial Creators e mostra no celular/computador.
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { titulo: e.data ? e.data.text() : "Onial Creators" }; }
  e.waitUntil(self.registration.showNotification(d.titulo || "Onial Creators", {
    body: d.texto || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { link: d.link || "/" },
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.link || "/", self.location.origin).href;
  e.waitUntil((async () => {
    const abas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of abas) if (c.url.startsWith(self.location.origin)) { await c.focus(); return c.navigate(url); }
    return self.clients.openWindow(url);
  })());
});
