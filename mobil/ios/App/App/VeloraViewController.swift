import Capacitor

// Uygulamaya özel eklenti (VeloraPlugin) burada kaydedilir; web tarafı window.Capacitor.Plugins.Velora
class VeloraViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(VeloraPlugin())
    }
}
