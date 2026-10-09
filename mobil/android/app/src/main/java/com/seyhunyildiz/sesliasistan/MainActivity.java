package com.seyhunyildiz.sesliasistan;

import android.app.Activity;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    static volatile boolean visible = false; // uygulama ekranda mı (açıkken arama web'de çalar, bildirim gerekmez)

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DosyaPlugin.class);
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                // Bildirim kanalı: sesli ve ekranda üstten görünen (plan hatırlatması, mesaj)
                NotificationChannel ch = new NotificationChannel("genel", "Bildirimler", NotificationManager.IMPORTANCE_HIGH);
                ch.setShowBadge(true);
                nm.createNotificationChannel(ch);
                // Gelen arama: telefonun zil sesiyle çalar, titreşir
                NotificationChannel call = new NotificationChannel(AramaMesaj.CHANNEL, "Gelen aramalar", NotificationManager.IMPORTANCE_HIGH);
                call.setSound(
                    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE),
                    new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                );
                call.enableVibration(true);
                call.setVibrationPattern(new long[] { 0, 800, 600, 800, 600 });
                call.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
                nm.createNotificationChannel(call);
            }
        }
        callIntent(getIntent());

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

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        callIntent(intent);
    }

    @Override
    public void onResume() {
        super.onResume();
        visible = true;
        AramaMesaj.cancel(this); // uygulama açıldı: zil web'de çalar
    }

    @Override
    public void onPause() {
        super.onPause();
        visible = false;
    }

    // Arama bildiriminden açıldı: kilit ekranının üstünde görün, ekranı aç; "Aç"a basıldıysa web aramayı açar
    private void callIntent(Intent i) {
        if (i == null || !i.hasExtra(AramaMesaj.EXTRA_CALL)) return;
        overLock(this, true);
        String id = i.getStringExtra(AramaMesaj.EXTRA_ANSWER);
        if (id != null && !id.isEmpty()) DosyaPlugin.answer(id);
        i.removeExtra(AramaMesaj.EXTRA_CALL);
        i.removeExtra(AramaMesaj.EXTRA_ANSWER);
    }

    static void overLock(Activity a, boolean on) {
        if (a == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            a.setShowWhenLocked(on);
            a.setTurnScreenOn(on);
        } else if (on) a.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        else a.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
    }
}
