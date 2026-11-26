import AppKit
import SwiftUI
import UniformTypeIdentifiers

@MainActor func chooseFiles(_ title: String, types: [UTType], multiple: Bool = false) -> [URL] {
    let panel = NSOpenPanel()
    panel.title = title
    panel.allowedContentTypes = types
    panel.canChooseDirectories = false
    panel.allowsMultipleSelection = multiple
    return panel.runModal() == .OK ? panel.urls : []
}

struct CompareView: View {
    @ObservedObject var model: Workspace
    @AppStorage("ComparisonPhoneSize") private var phone = false

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack {
                Text("Compare images").font(.largeTitle.bold()).accessibilityAddTraits(.isHeader)
                Spacer()
                Picker("Display width", selection: $phone) {
                    Text("Fit").tag(false)
                    Text("Phone · 375 pt").tag(true)
                }.pickerStyle(.segmented).labelsHidden().frame(width: 192)
                Button("Open images…") { pick(nil) }
            }
            if model.comparison.slots.allSatisfy({ $0 == nil }) {
                HStack(spacing: 10) {
                    Text("Open local images or try a revision made on Walter.")
                        .font(.callout).foregroundStyle(.secondary)
                    Button("Open sample pair") { Task { await model.openComparisonSamples() } }
                        .disabled(model.busy)
                }
            }
            GeometryReader { space in
                let width = phone ? CGFloat(375) : max(1, (space.size.width - 16) / 2)
                ScrollView([.horizontal, .vertical]) {
                    HStack(alignment: .top, spacing: 16) {
                        ForEach(0..<2, id: \.self) { i in
                            comparisonSide(i, width: width, height: space.size.height)
                        }
                    }.frame(minWidth: space.size.width, alignment: .center)
                }
            }
        }.padding(22)
    }
    private func comparisonSide(_ i: Int, width: CGFloat, height: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: 9) {
            HStack {
                Label(i == 0 ? "Left image" : "Right image", systemImage: i == 0 ? "rectangle.lefthalf.inset.filled" : "rectangle.righthalf.inset.filled")
                    .font(.subheadline).foregroundStyle(.secondary)
                Spacer()
                Button { pick(i) } label: { Image(systemName: "folder") }
                    .accessibilityLabel(i == 0 ? "Choose left image" : "Choose right image")
            }
            if let file = model.comparison.slots[i] {
                Image(nsImage: file.image).resizable().interpolation(.high).scaledToFit()
                    .frame(width: width).clipShape(RoundedRectangle(cornerRadius: 7))
                    .accessibilityLabel(file.title)
                Text(file.title).font(.headline).lineLimit(2).help(file.title)
                if let details = file.details {
                    Text(details.project).font(.callout).foregroundStyle(.secondary)
                }
                Text(file.caption)
                    .font(.caption.monospacedDigit()).foregroundStyle(.secondary)
                Divider()
            } else {
                VStack(spacing: 10) {
                    if model.comparison.unavailable.contains(i) {
                        Text("Saved image unavailable").font(.callout).foregroundStyle(.secondary)
                    }
                    Button(i == 0 ? "Choose left image…" : "Choose right image…") { pick(i) }
                }
                .frame(maxWidth: .infinity, minHeight: max(0, min(height - 40, 300)))
                .background(Color.secondary.opacity(0.07), in: RoundedRectangle(cornerRadius: 8))
            }
        }.frame(width: width)
    }

    private func pick(_ slot: Int?) {
        let urls = chooseFiles("Choose local images", types: [.png, .jpeg, .webP], multiple: slot == nil)
        guard !urls.isEmpty else { return }
        do { try model.comparison.open(urls, slot: slot) } catch { model.issue = error.localizedDescription }
    }
}
