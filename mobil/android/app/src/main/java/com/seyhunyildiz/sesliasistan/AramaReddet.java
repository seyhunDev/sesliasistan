package com.seyhunyildiz.sesliasistan;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

// Arama bildirimindeki "Reddet": zil susar, arayana "meşgul" gider (sunucu imzayla aramayı reddeder, /api/call-ring).
public class AramaReddet extends BroadcastReceiver {

    private static final String SITE = "https://sesliasistan.netlify.app";

    @Override
    public void onReceive(Context c, Intent i) {
        AramaMesaj.cancel(c);
        final PendingResult done = goAsync();
        new Thread(() -> {
            HttpURLConnection h = null;
            try {
                JSONObject body = new JSONObject();
                body.put("o", i.getStringExtra("o"));
                body.put("i", i.getStringExtra("i"));
                body.put("s", i.getStringExtra("s"));
                h = (HttpURLConnection) new URL(SITE + "/api/call-ring").openConnection();
                h.setRequestMethod("POST");
                h.setConnectTimeout(8000);
                h.setReadTimeout(8000);
                h.setDoOutput(true);
                h.setRequestProperty("content-type", "application/json");
                try (OutputStream out = h.getOutputStream()) {
                    out.write(body.toString().getBytes(StandardCharsets.UTF_8));
                }
                h.getResponseCode();
            } catch (Exception e) {
                android.util.Log.w("AsistanArama", "reddedilemedi", e);
            } finally {
                if (h != null) h.disconnect();
                done.finish();
            }
        }).start();
    }
}
