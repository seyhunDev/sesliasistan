package com.seyhunyildiz.sesliasistan;

import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.PowerManager;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

// Web uygulamasının Android WebView'da olmayan tarayıcı işleri: paylaşım menüsü (navigator.share),
// dosya indirme (<a download>), dosyayı açma (window.open ile PDF/fotoğraf), yazdırma (window.print).
// Sayfaya assets/asistan-shim.js eklenir; o betik bu eklentiyi çağırır. Web kodu değişmez.
@CapacitorPlugin(name = "AsistanDosya")
public class DosyaPlugin extends Plugin {

    private static final String SITE = "https://sesliasistan.netlify.app";
    private WebView printView; // yazdırma bitene kadar tutulur
    private PowerManager.WakeLock proximity; // ahizedeyken telefon kulağa gelince ekran kapanır

    // Bildirimdeki "Aç" ile açılan arama (web takeAnswer ile alır)
    private static DosyaPlugin instance;
    private static String pendingAnswer = "";

    static void answer(String id) {
        pendingAnswer = id == null ? "" : id;
        DosyaPlugin p = instance;
        if (p != null && !pendingAnswer.isEmpty()) {
            JSObject o = new JSObject();
            o.put("id", pendingAnswer);
            p.notifyListeners("answer", o);
        }
    }

    @Override
    public void load() {
        instance = this;
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) return;
        try {
            String url = getBridge().getConfig().getServerUrl();
            Uri u = Uri.parse(url != null && !url.isEmpty() ? url : SITE);
            String origin = u.getScheme() + "://" + u.getAuthority();
            WebViewCompat.addDocumentStartJavaScript(getBridge().getWebView(), readAsset("asistan-shim.js"), Collections.singleton(origin));
        } catch (Exception e) {
            android.util.Log.w("AsistanDosya", "shim eklenemedi", e);
        }
    }

    private String readAsset(String name) throws Exception {
        try (InputStream in = getContext().getAssets().open(name); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }

    // Dosya adını güvenli hale getirir
    private static String safeName(String name) {
        String n = name == null || name.trim().isEmpty() ? "dosya" : name.trim();
        return n.replaceAll("[\\\\/:*?\"<>|]", "_");
    }

    // Base64 veriyi önbellekte bir dosyaya yazar, paylaşılabilir adresini verir
    private Uri cacheFile(String name, String data) throws Exception {
        File dir = new File(getContext().getCacheDir(), "paylas");
        dir.mkdirs();
        File f = new File(dir, safeName(name));
        try (FileOutputStream out = new FileOutputStream(f)) {
            out.write(Base64.decode(data, Base64.DEFAULT));
        }
        return FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
    }

    private static String typeOf(String type) {
        return type == null || type.isEmpty() ? "application/octet-stream" : type;
    }

    @PluginMethod
    public void share(PluginCall call) {
        try {
            JSArray files = call.getArray("files", new JSArray());
            String text = call.getString("text", "");
            String title = call.getString("title", "");
            ArrayList<Uri> uris = new ArrayList<>();
            String type = null;
            for (int i = 0; i < files.length(); i++) {
                JSObject f = JSObject.fromJSONObject(files.getJSONObject(i));
                String t = typeOf(f.getString("type"));
                uris.add(cacheFile(f.getString("name"), f.getString("data")));
                type = type == null ? t : (type.equals(t) ? type : type.split("/")[0].equals(t.split("/")[0]) ? t.split("/")[0] + "/*" : "*/*");
            }
            Intent send;
            if (uris.size() > 1) {
                send = new Intent(Intent.ACTION_SEND_MULTIPLE);
                send.putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris);
                send.setType(type);
            } else if (uris.size() == 1) {
                send = new Intent(Intent.ACTION_SEND);
                send.putExtra(Intent.EXTRA_STREAM, uris.get(0));
                send.setType(type);
            } else {
                send = new Intent(Intent.ACTION_SEND);
                send.setType("text/plain");
            }
            if (!text.isEmpty()) send.putExtra(Intent.EXTRA_TEXT, text);
            if (!title.isEmpty()) send.putExtra(Intent.EXTRA_SUBJECT, title);
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent chooser = Intent.createChooser(send, title.isEmpty() ? "Paylaş" : title);
            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(chooser);
            call.resolve();
        } catch (Exception e) {
            call.reject("Paylaşılamadı: " + e.getMessage());
        }
    }

    // İndirilenler klasörüne kaydeder, sonra dosyayı açar
    @PluginMethod
    public void save(PluginCall call) {
        try {
            String name = safeName(call.getString("name"));
            String type = typeOf(call.getString("type"));
            byte[] bytes = Base64.decode(call.getString("data", ""), Base64.DEFAULT);
            Uri uri;
            Context c = getContext();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues v = new ContentValues();
                v.put(MediaStore.Downloads.DISPLAY_NAME, name);
                v.put(MediaStore.Downloads.MIME_TYPE, type);
                v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                uri = c.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                if (uri == null) throw new Exception("kayıt yeri yok");
                try (OutputStream out = c.getContentResolver().openOutputStream(uri)) {
                    out.write(bytes);
                }
            } else {
                File dir = c.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (dir == null) dir = c.getFilesDir();
                dir.mkdirs();
                File f = new File(dir, name);
                try (FileOutputStream out = new FileOutputStream(f)) {
                    out.write(bytes);
                }
                uri = FileProvider.getUriForFile(c, c.getPackageName() + ".fileprovider", f);
            }
            Toast.makeText(c, "İndirildi: " + name, Toast.LENGTH_SHORT).show();
            view(uri, type);
            call.resolve();
        } catch (Exception e) {
            call.reject("İndirilemedi: " + e.getMessage());
        }
    }

    // Dosyayı telefondaki uygun uygulamayla açar (PDF görüntüleyici, galeri, Excel…)
    @PluginMethod
    public void open(PluginCall call) {
        try {
            view(cacheFile(call.getString("name"), call.getString("data", "")), typeOf(call.getString("type")));
            call.resolve();
        } catch (Exception e) {
            call.reject("Açılamadı: " + e.getMessage());
        }
    }

    private void view(Uri uri, String type) {
        Intent i = new Intent(Intent.ACTION_VIEW);
        i.setDataAndType(uri, type);
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getActivity().startActivity(Intent.createChooser(i, "Aç").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION));
        } catch (Exception e) {
            Toast.makeText(getContext(), "Bu dosyayı açacak uygulama yok", Toast.LENGTH_SHORT).show();
        }
    }

    // Uygulama dışındaki adresleri (WhatsApp, harita, web) telefonun kendi uygulamasında açar
    @PluginMethod
    public void external(PluginCall call) {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(call.getString("url", "")));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Açılamadı: " + e.getMessage());
        }
    }

    // Bildirimler kurulu mu: google-services.json ile derlendiyse Firebase uygulama kimliği vardır.
    // Yoksa bildirim eklentisi çağrılmaz (Firebase başlatılmadan kayıt olmaya çalışmak uygulamayı çökertir).
    @PluginMethod
    public void pushReady(PluginCall call) {
        Context c = getContext();
        boolean ok = c.getResources().getIdentifier("google_app_id", "string", c.getPackageName()) != 0;
        JSObject r = new JSObject();
        r.put("ready", ok);
        call.resolve(r);
    }

    // Bildirimdeki "Aç"a basılarak açıldıysa aramanın kimliği (bir kez)
    @PluginMethod
    public void takeAnswer(PluginCall call) {
        JSObject r = new JSObject();
        r.put("id", pendingAnswer);
        pendingAnswer = "";
        call.resolve(r);
    }

    // Aramada sesin yönü. on: arama sürüyor (telefon görüşmesi kipi), speaker: hoparlör; değilse kulaklık/Bluetooth
    // bağlıysa o, yoksa ahize. on false: normal kipe dönüş. WebView sesi kendisi hoparlöre verdiği için web bunu
    // mikrofon açıldıktan sonra çağırır.
    @PluginMethod
    public void audioRoute(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        boolean speaker = Boolean.TRUE.equals(call.getBoolean("speaker", false));
        getActivity()
            .runOnUiThread(() -> {
                try {
                    AudioManager am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
                    if (on) {
                        am.setMode(AudioManager.MODE_IN_COMMUNICATION);
                        boolean ear = route(am, speaker);
                        getActivity().setVolumeControlStream(AudioManager.STREAM_VOICE_CALL);
                        nearScreen(ear);
                    } else {
                        if (Build.VERSION.SDK_INT >= 31) am.clearCommunicationDevice();
                        am.setSpeakerphoneOn(false);
                        am.setMode(AudioManager.MODE_NORMAL);
                        getActivity().setVolumeControlStream(AudioManager.USE_DEFAULT_STREAM_TYPE);
                        nearScreen(false);
                        MainActivity.overLock(getActivity(), false);
                    }
                    call.resolve();
                } catch (Exception e) {
                    call.reject("Ses yönü değişmedi: " + e.getMessage());
                }
            });
    }

    // Ses çıkışını seçer; ahize seçildiyse true
    private boolean route(AudioManager am, boolean speaker) {
        if (Build.VERSION.SDK_INT >= 31) {
            List<AudioDeviceInfo> list = am.getAvailableCommunicationDevices();
            AudioDeviceInfo pick = null;
            int[] order = speaker
                ? new int[] { AudioDeviceInfo.TYPE_BUILTIN_SPEAKER }
                : new int[] {
                      AudioDeviceInfo.TYPE_BLUETOOTH_SCO,
                      AudioDeviceInfo.TYPE_BLE_HEADSET,
                      AudioDeviceInfo.TYPE_WIRED_HEADSET,
                      AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
                      AudioDeviceInfo.TYPE_USB_HEADSET,
                      AudioDeviceInfo.TYPE_BUILTIN_EARPIECE,
                  };
            for (int t : order) {
                for (AudioDeviceInfo d : list) if (d.getType() == t) {
                    pick = d;
                    break;
                }
                if (pick != null) break;
            }
            if (pick != null) {
                am.setCommunicationDevice(pick);
                return pick.getType() == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE;
            }
        }
        am.setSpeakerphoneOn(speaker);
        return !speaker && !am.isWiredHeadsetOn() && !am.isBluetoothScoOn();
    }

    private void nearScreen(boolean on) {
        try {
            if (on) {
                if (proximity == null) {
                    PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
                    if (pm == null || !pm.isWakeLockLevelSupported(PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK)) return;
                    proximity = pm.newWakeLock(PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK, "asistan:arama");
                }
                if (!proximity.isHeld()) proximity.acquire(4 * 3600 * 1000L);
            } else if (proximity != null && proximity.isHeld()) proximity.release();
        } catch (Exception ignored) {}
    }

    // HTML'i Android'in yazdırma ekranına verir (PDF olarak kaydet de buradan)
    @PluginMethod
    public void print(PluginCall call) {
        String html = call.getString("html", "");
        String title = call.getString("title", "Asistan");
        getActivity()
            .runOnUiThread(() -> {
                WebView w = new WebView(getActivity());
                printView = w;
                w.setWebViewClient(
                    new WebViewClient() {
                        @Override
                        public void onPageFinished(WebView view, String url) {
                            PrintManager pm = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                            PrintDocumentAdapter a = view.createPrintDocumentAdapter(title);
                            pm.print(title, a, new PrintAttributes.Builder().build());
                        }
                    }
                );
                w.loadDataWithBaseURL(SITE, html, "text/html", "UTF-8", null);
                call.resolve();
            });
    }
}
