// Android uygulaması: WebView'da olmayan tarayıcı işlerini yerel eklentiye (AsistanDosya) bağlar.
// Paylaşım (navigator.share), indirme (<a download>), dosya açma (window.open / blob bağlantısı), yazdırma.
// Web kodu değişmez; bu betik yalnız Android uygulamasında, her sayfa açılışında en başta çalışır.
(function () {
  if (window.__asistanShim) return;
  window.__asistanShim = true;
  window.__asistanApp = "android";

  var plugin = function () {
    var C = window.Capacitor;
    return C && C.Plugins && C.Plugins.AsistanDosya;
  };
  var b64 = function (blob) {
    return new Promise(function (ok, no) {
      var r = new FileReader();
      r.onload = function () {
        var s = String(r.result);
        ok(s.slice(s.indexOf(",") + 1));
      };
      r.onerror = function () {
        no(r.error);
      };
      r.readAsDataURL(blob);
    });
  };
  var fail = function (e) {
    console.warn("[asistan]", e);
  };

  // Oluşturulan blob adreslerini tut: sayfa bağlantıya tıklayıp hemen iptal etse de dosya okunabilsin
  var blobs = new Map();
  var create = URL.createObjectURL.bind(URL);
  var revoke = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = function (o) {
    var u = create(o);
    if (o instanceof Blob) blobs.set(u, o);
    return u;
  };
  URL.revokeObjectURL = function (u) {
    setTimeout(function () {
      blobs.delete(u);
      revoke(u);
    }, 120000);
  };
  var blobOf = function (u) {
    var b = blobs.get(u);
    if (b) return Promise.resolve(b);
    return fetch(u).then(function (r) {
      return r.blob();
    });
  };
  var local = function (u) {
    return /^(blob:|data:)/.test(String(u || ""));
  };
  var nameOf = function (b, fallback) {
    if (b && b.name) return b.name;
    var t = (b && b.type) || "";
    var ext = t.indexOf("pdf") >= 0 ? ".pdf" : t.indexOf("png") >= 0 ? ".png" : t.indexOf("jpeg") >= 0 ? ".jpg" : t.indexOf("sheet") >= 0 ? ".xlsx" : "";
    return (fallback || "dosya") + ext;
  };

  var openLocal = function (u, name) {
    var p = plugin();
    if (!p) return;
    blobOf(u)
      .then(function (b) {
        return b64(b).then(function (data) {
          return p.open({ name: name || nameOf(b), type: b.type || "application/octet-stream", data: data });
        });
      })
      .catch(fail);
  };
  var saveLocal = function (u, name) {
    var p = plugin();
    if (!p) return;
    blobOf(u)
      .then(function (b) {
        return b64(b).then(function (data) {
          return p.save({ name: name || nameOf(b), type: b.type || "application/octet-stream", data: data });
        });
      })
      .catch(fail);
  };

  // Paylaşım menüsü
  navigator.canShare = function (d) {
    return !!d && ((d.files && d.files.length > 0) || !!d.text || !!d.url || !!d.title);
  };
  navigator.share = function (d) {
    d = d || {};
    var p = plugin();
    if (!p) return Promise.reject(new DOMException("Paylaşım yok", "NotAllowedError"));
    var list = Array.prototype.slice.call(d.files || []);
    return Promise.all(
      list.map(function (f) {
        return b64(f).then(function (data) {
          return { name: f.name || "dosya", type: f.type || "application/octet-stream", data: data };
        });
      })
    ).then(function (files) {
      var text = [d.text, d.url].filter(Boolean).join("\n");
      return p.share({ files: files, text: text, title: d.title || "" }).then(function () {});
    });
  };

  // <a download> ve blob bağlantıları
  var handle = function (a) {
    if (!a || !a.href || !local(a.href)) return false;
    if (a.hasAttribute("download")) saveLocal(a.href, a.getAttribute("download") || "");
    else openLocal(a.href, "");
    return true;
  };
  var click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (handle(this)) return;
    return click.call(this);
  };
  document.addEventListener(
    "click",
    function (e) {
      var a = e.target && e.target.closest ? e.target.closest("a") : null;
      if (a && local(a.href)) {
        e.preventDefault();
        handle(a);
      }
    },
    true
  );

  // window.open: boş pencere açıp sonra adres vermek (fatura, envanter belgesi) ve yazdırma penceresi
  window.open = function (url, target, features) {
    url = url == null ? "" : String(url);
    var go = function (u) {
      if (!u) return;
      if (local(u)) return openLocal(u, "");
      var abs = new URL(u, location.href);
      if (abs.origin === location.origin) return location.assign(abs.href);
      var p = plugin();
      if (p) p.external({ url: abs.href }).catch(fail);
    };
    if (url) {
      go(url);
      return { closed: false, close: function () {}, focus: function () {}, location: { href: url } };
    }
    var html = "";
    var win = {
      closed: false,
      close: function () {
        win.closed = true;
      },
      focus: function () {},
      document: {
        write: function (s) {
          html += s;
        },
        close: function () {
          var p = plugin();
          if (p && html) p.print({ html: html, title: document.title || "Asistan" }).catch(fail);
        },
      },
    };
    win.location = {};
    Object.defineProperty(win.location, "href", {
      set: function (u) {
        go(u);
      },
      get: function () {
        return "";
      },
    });
    return win;
  };
})();
