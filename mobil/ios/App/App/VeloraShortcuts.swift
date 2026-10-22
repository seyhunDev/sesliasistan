import AppIntents

// Siri cümleleri ve Eylem tuşu / Kısayollar listesinde görünen "Velora'ya söyle"
@available(iOS 16.0, *)
struct VeloraShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: BasKonusIntent(),
            phrases: [
                "\(.applicationName) dinle",
                "\(.applicationName)'ya söyle",
                "\(.applicationName) asistan",
            ],
            shortTitle: "Velora'ya söyle",
            systemImageName: "mic.fill"
        )
    }
}
