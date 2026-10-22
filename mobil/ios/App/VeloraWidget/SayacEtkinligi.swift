import ActivityKit
import SwiftUI
import WidgetKit

private let lacivert = Color(red: 0.137, green: 0.145, blue: 0.369) // --deep #23255e
private let mor = Color(red: 0.357, green: 0.31, blue: 0.839) // --acc #5b4fd6

// Süre: durduysa kalan sabit; çalışıyorsa sistem kendisi sayar (0'a kadar geri, sonra ileri: "Startan beri")
private struct Sure: View {
    let state: SayacAttributes.ContentState
    var body: some View {
        if state.paused {
            Text(String(format: "%d:%02d", state.left / 60, state.left % 60))
        } else {
            Text(state.end, style: .timer)
        }
    }
}

struct SayacEtkinligi: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SayacAttributes.self) { ctx in
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(ctx.state.title).font(.headline)
                    if ctx.state.paused {
                        Text("Durdu").font(.subheadline).foregroundStyle(.white.opacity(0.7))
                    }
                }
                Spacer()
                Sure(state: ctx.state)
                    .font(.system(size: 40, weight: .semibold).monospacedDigit())
                    .multilineTextAlignment(.trailing)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 14)
            .foregroundStyle(.white)
            .activityBackgroundTint(lacivert)
            .activitySystemActionForegroundColor(.white)
            .widgetURL(URL(string: "velora://sayac"))
        } dynamicIsland: { ctx in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text(ctx.state.title).font(.headline).padding(.leading, 6)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Sure(state: ctx.state)
                        .font(.system(size: 28, weight: .semibold).monospacedDigit())
                        .multilineTextAlignment(.trailing)
                        .frame(maxWidth: 110)
                }
            } compactLeading: {
                Image(systemName: ctx.state.paused ? "pause.fill" : "timer").foregroundStyle(mor)
            } compactTrailing: {
                Sure(state: ctx.state)
                    .monospacedDigit()
                    .multilineTextAlignment(.trailing)
                    .frame(maxWidth: 52)
            } minimal: {
                Image(systemName: "timer").foregroundStyle(mor)
            }
            .widgetURL(URL(string: "velora://sayac"))
        }
    }
}
