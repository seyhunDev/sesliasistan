package com.seyhunyildiz.sesliasistan;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DosyaPlugin.class);
        super.onCreate(savedInstanceState);

        // Bildirim kanalı: sesli ve ekranda üstten görünen (plan hatırlatması, mesaj, arama)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel("genel", "Bildirimler", NotificationManager.IMPORTANCE_HIGH);
            ch.setShowBadge(true);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(ch);
        }

        // Geri tuşu uygulamanın içinde bir önceki sayfaya döner; ilk sayfadaysa uygulama arka plana geçer
        getOnBackPressedDispatcher()
            .addCallback(
                this,
                new OnBackPressedCallback(true) {
                    @Override
                    public void handleOnBackPressed() {
                        WebView w = getBridge() != null ? getBridge().getWebView() : null;
                        if (w != null && w.canGoBack()) w.goBack();
                        else moveTaskToBack(true);
                    }
                }
            );
    }
}
