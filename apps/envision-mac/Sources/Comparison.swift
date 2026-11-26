import AppKit
import ImageIO
import SwiftUI
import UniformTypeIdentifiers

struct LocalArtwork {
    let url: URL
    let image: NSImage
    let dimensions: String

    init(_ url: URL) throws {
        guard Comparison.supports(url), let source = CGImageSourceCreateWithURL(url as CFURL, nil),
              let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
              let width = properties[kCGImagePropertyPixelWidth] as? Int,
              let height = properties[kCGImagePropertyPixelHeight] as? Int, width > 0, height > 0,
              let thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, [
                kCGImageSourceCreateThumbnailFromImageAlways: true,
                kCGImageSourceCreateThumbnailWithTransform: true,
                kCGImageSourceThumbnailMaxPixelSize: 1800
              ] as CFDictionary) else { throw StudioError("Could not read \(url.lastPathComponent) as an image.") }
        self.url = url
        image = NSImage(cgImage: thumbnail, size: NSSize(width: thumbnail.width, height: thumbnail.height))
        dimensions = "\(width) × \(height)"
    }
}

struct Comparison {
    var slots: [LocalArtwork?] = [nil, nil]
    static func supports(_ url: URL) -> Bool {
        url.isFileURL && ["png", "jpg", "jpeg", "webp"].contains(url.pathExtension.lowercased())
    }
    init() {
        let saved = UserDefaults.standard.stringArray(forKey: "CompareFiles") ?? []
        for (i, path) in saved.prefix(2).enumerated() where !path.isEmpty {
            slots[i] = try? LocalArtwork(URL(fileURLWithPath: path))
        }
    }
    mutating func open(_ files: [URL], slot: Int? = nil) throws {
        guard (1...2).contains(files.count) else { throw StudioError("Select one or two image files.") }
        let decoded = try files.map(LocalArtwork.init)
        if decoded.count == 2 { slots = decoded.map(Optional.some) }
        else { slots[slot ?? (slots[0] == nil ? 0 : 1)] = decoded[0] }
        UserDefaults.standard.set(slots.map { $0?.url.path ?? "" }, forKey: "CompareFiles")
    }
}

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
                VStack(alignment: .leading, spacing: 3) {
                    Text("Compare images").font(.largeTitle.bold())
                    Text("Local files").foregroundStyle(.secondary)
                }
                Spacer()
                Picker("Display width", selection: $phone) {
                    Text("Fit").tag(false)
                    Text("Phone · 375 pt").tag(true)
                }.pickerStyle(.segmented).labelsHidden().frame(width: 192)
                Button("Open images…") { pick(nil) }
            }
            GeometryReader { space in
                let width = phone ? CGFloat(375) : max(1, (space.size.width - 16) / 2)
                ScrollView([.horizontal, .vertical]) {
                    HStack(alignment: .top, spacing: 16) {
                        ForEach(0..<2, id: \.self) { i in
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    Text(model.comparison.slots[i]?.url.deletingPathExtension().lastPathComponent ?? (i == 0 ? "First image" : "Second image"))
                                        .font(.headline).lineLimit(1).help(model.comparison.slots[i]?.url.lastPathComponent ?? "")
                                    Spacer()
                                    Button { pick(i) } label: { Image(systemName: "folder") }
                                        .accessibilityLabel(i == 0 ? "Choose first image" : "Choose second image")
                                }
                                if let file = model.comparison.slots[i] {
                                    Image(nsImage: file.image).resizable().scaledToFit().frame(width: width)
                                        .accessibilityLabel(file.url.lastPathComponent)
                                    Text(file.dimensions).font(.caption.monospacedDigit()).foregroundStyle(.secondary)
                                } else {
                                    Button(i == 0 ? "Choose first image…" : "Choose second image…") { pick(i) }
                                        .frame(maxWidth: .infinity, minHeight: max(0, min(space.size.height - 40, 300)))
                                        .background(Color.secondary.opacity(0.07), in: RoundedRectangle(cornerRadius: 8))
                                }
                            }.frame(width: width)
                        }
                    }.frame(minWidth: space.size.width, alignment: .center)
                }
            }
        }.padding(22)
    }
    private func pick(_ slot: Int?) {
        let urls = chooseFiles("Choose local images", types: [.png, .jpeg, .webP], multiple: slot == nil)
        guard !urls.isEmpty else { return }
        do { try model.comparison.open(urls, slot: slot) } catch { model.issue = error.localizedDescription }
    }
}
