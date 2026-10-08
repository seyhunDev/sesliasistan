package com.seyhunyildiz.sesliasistan;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DosyaPlugin.class);
        super.onCreate(savedInstanceState);

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
