package com.seyhunyildiz.sesliasistan;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

// Firebase mesajları. Gelen arama ("call") ve arama bitti ("call-end") burada karşılanır: uygulama kapalıyken de
// zil çalan, kilit ekranında tam ekran açılan arama bildirimi (Aç / Reddet). Diğer bildirimler eklentinin yolundan.
// Sunucu: src/lib/server/callPush.js.
public class AramaMesaj extends MessagingService {

    static final String CHANNEL = "arama";
    static final String EXTRA_CALL = "asistanCall";
    static final String EXTRA_ANSWER = "asistanAnswer";
    static final int NOTIF = 7001;
    private static final String TAG = "arama";
    static volatile String current = ""; // çalan aramanın kimliği

    @Override
    public void onMessageReceived(@NonNull RemoteMessage msg) {
        Map<String, String> d = msg.getData();
        String type = d.get("type");
        if ("call".equals(type)) {
            if (!MainActivity.visible) show(this, d);
            return;
        }
        if ("call-end".equals(type)) {
            String id = d.get("id");
            if (id != null && id.equals(current)) cancel(this);
            return;
        }
        super.onMessageReceived(msg);
    }

    static void show(Context c, Map<String, String> d) {
        String id = d.get("id");
        if (id == null || id.isEmpty()) return;
        String name = d.get("name") == null ? "Biri" : d.get("name");
        current = id;
        int fl = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;

        Intent open = new Intent(c, MainActivity.class).putExtra(EXTRA_CALL, id).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openPi = PendingIntent.getActivity(c, 1, open, fl);
        Intent ans = new Intent(c, MainActivity.class)
            .putExtra(EXTRA_CALL, id)
            .putExtra(EXTRA_ANSWER, id)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent ansPi = PendingIntent.getActivity(c, 2, ans, fl);
        Intent no = new Intent(c, AramaReddet.class).putExtra("o", d.get("org")).putExtra("i", id).putExtra("s", d.get("sig"));
        PendingIntent noPi = PendingIntent.getBroadcast(c, 3, no, fl);

        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_asistan)
            .setColor(ContextCompat.getColor(c, R.color.ic_launcher_background))
            .setContentTitle(name + " arıyor")
            .setContentText("Sesli arama")
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(true)
            .setTimeoutAfter(35000)
            .setContentIntent(openPi)
            .setFullScreenIntent(openPi, true)
            .addAction(0, "Reddet", noPi)
            .addAction(0, "Aç", ansPi);
        Notification n = b.build();
        n.flags |= Notification.FLAG_INSISTENT; // zil susana kadar tekrar eder
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(TAG, NOTIF, n);
    }

    static void cancel(Context c) {
        current = "";
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(TAG, NOTIF);
    }
}
