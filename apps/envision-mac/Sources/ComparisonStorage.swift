import AppKit
import CryptoKit
import Darwin
import ImageIO
import UniformTypeIdentifiers

struct RenderDetails: Codable, Equatable {
    let title: String
    let project: String
    let model: String?
    let engineSeconds: Double?
    let width: Int
    let height: Int
    let hash: String
}

struct LocalArtwork {
    let url: URL
    let image: NSImage
    let dimensions: String
    let details: RenderDetails?
    var title: String { details?.title ?? url.deletingPathExtension().lastPathComponent }
    var caption: String {
        var parts = [dimensions]
        if let model = details?.model { parts.append(model) }
        if let seconds = details?.engineSeconds { parts.append("Render \(seconds.formatted(.number.precision(.fractionLength(1)))) s") }
        return parts.joined(separator: " · ")
    }

    init(_ url: URL, details: RenderDetails? = nil) throws {
        guard Comparison.supports(url), let source = CGImageSourceCreateWithURL(url as CFURL, nil),
              let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
              let width = properties[kCGImagePropertyPixelWidth] as? Int,
              let height = properties[kCGImagePropertyPixelHeight] as? Int, width > 0, height > 0
        else { throw StudioError("Could not read \(details?.title ?? url.lastPathComponent) as an image.") }
        let rotated = (5...8).contains(properties[kCGImagePropertyOrientation] as? Int ?? 1)
        let displayWidth = rotated ? height : width
        let displayHeight = rotated ? width : height
        guard details.map({ $0.width == displayWidth && $0.height == displayHeight }) ?? true,
              let thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, [
                kCGImageSourceCreateThumbnailFromImageAlways: true,
                kCGImageSourceCreateThumbnailWithTransform: true,
                kCGImageSourceThumbnailMaxPixelSize: 1800
              ] as CFDictionary) else { throw StudioError("Could not read \(details?.title ?? url.lastPathComponent) as an image.") }
        self.url = url
        self.details = details
        image = NSImage(cgImage: thumbnail, size: NSSize(width: thumbnail.width, height: thumbnail.height))
        dimensions = "\(displayWidth) × \(displayHeight)"
    }
}

enum SavedComparison: Equatable {
    case paths([String])
    case unreadable
}

struct ComparisonStorage {
    let directory: URL
    static let onThisMac = ComparisonStorage(directory: FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("com.systembydave.envision.studio/Comparisons", isDirectory: true))
    private let manager = FileManager.default
    private let fileLimit = 40 * 1_048_576
    private var selectionURL: URL { directory.appendingPathComponent("selection.json") }
    private func createDirectory() throws {
        try manager.createDirectory(at: directory, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
    }

    func selection(legacy: UserDefaults) -> SavedComparison {
        do {
            let attr = try selectionURL.resourceValues(forKeys: [.isSymbolicLinkKey, .fileSizeKey, .isRegularFileKey])
            guard attr.isSymbolicLink == false, attr.isRegularFile == true, (1...16384).contains(attr.fileSize ?? 0) else { return .unreadable }
            let paths = try JSONDecoder().decode([String].self, from: Data(contentsOf: selectionURL))
            guard paths.count == 2, paths.allSatisfy({ $0.isEmpty || $0.hasPrefix("/") }) else { return .unreadable }
            return .paths(paths)
        } catch let error as CocoaError where error.code == .fileReadNoSuchFile {
            return .paths(Array((legacy.stringArray(forKey: "CompareFiles") ?? []).prefix(2)))
        } catch { return .unreadable }
    }

    // A second window or process can replace the pair while the first is downloading.
    func save(_ paths: [String], replacing previous: SavedComparison, legacy: UserDefaults) throws -> Bool {
        try createDirectory()
        let fd = Darwin.open(directory.appendingPathComponent(".selection-lock").path, O_CREAT | O_RDWR | O_NOFOLLOW | O_CLOEXEC, 0o600)
        guard fd >= 0 else { throw StudioError("Could not open the local comparison folder.") }
        defer { Darwin.close(fd) }
        guard flock(fd, LOCK_EX | LOCK_NB) == 0 else { throw StudioError("The comparison is being saved. Try again.") }
        guard selection(legacy: legacy) == previous else { return false }
        if case .paths(let old) = previous {
            for path in paths where !path.isEmpty && !old.contains(path) && !manager.fileExists(atPath: path) {
                throw StudioError("An image moved before the comparison was saved. Open it again.")
            }
        }
        let temporary = directory.appendingPathComponent(UUID().uuidString + ".json")
        defer { try? manager.removeItem(at: temporary) }
        try JSONEncoder().encode(paths).write(to: temporary, options: .withoutOverwriting)
        try manager.setAttributes([.posixPermissions: 0o600], ofItemAtPath: temporary.path)
        guard Darwin.rename(temporary.path, selectionURL.path) == 0 else { throw StudioError("Could not save the comparison on this Mac.") }
        if case .paths(let old) = previous {
            for path in Set(old) where !path.isEmpty && !paths.contains(path) { discardManaged(at: URL(fileURLWithPath: path)) }
        }
        return true
    }

    private func managedFolder(_ image: URL) -> URL? {
        let folder = image.deletingLastPathComponent()
        guard ["image.png", "image.jpg", "image.webp"].contains(image.lastPathComponent),
              UUID(uuidString: folder.lastPathComponent) != nil,
              folder.deletingLastPathComponent().standardizedFileURL.path == directory.standardizedFileURL.path,
              (try? folder.resourceValues(forKeys: [.isSymbolicLinkKey]).isSymbolicLink) == false else { return nil }
        return folder
    }

    private func verify(_ bytes: Data, _ details: RenderDetails) throws {
        guard !bytes.isEmpty, bytes.count <= fileLimit,
              (1...4096).contains(details.width), (1...4096).contains(details.height),
              SHA256.hash(data: bytes).map({ String(format: "%02x", $0) }).joined() == details.hash
        else { throw StudioError("The image did not match the studio copy. Try the comparison again.") }
    }

    func load(_ url: URL) throws -> LocalArtwork {
        guard let folder = managedFolder(url) else { return try LocalArtwork(url) }
        let file = try url.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey, .isSymbolicLinkKey])
        let info = folder.appendingPathComponent("info.json")
        let sidecar = try info.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey, .isSymbolicLinkKey])
        guard file.isRegularFile == true, file.isSymbolicLink == false, (1...fileLimit).contains(file.fileSize ?? 0),
              sidecar.isRegularFile == true, sidecar.isSymbolicLink == false, (1...65536).contains(sidecar.fileSize ?? 0)
        else { throw StudioError("The saved comparison is unreadable. Open its artwork again.") }
        let details = try JSONDecoder().decode(RenderDetails.self, from: Data(contentsOf: info))
        try verify(Data(contentsOf: url, options: .mappedIfSafe), details)
        return try LocalArtwork(url, details: details)
    }

    func snapshot(_ bytes: Data, details: RenderDetails) throws -> LocalArtwork {
        try verify(bytes, details)
        guard let source = CGImageSourceCreateWithData(bytes as CFData, nil), CGImageSourceGetCount(source) == 1,
              let type = CGImageSourceGetType(source) as String?,
              let ext = [UTType.png.identifier: "png", UTType.jpeg.identifier: "jpg", UTType.webP.identifier: "webp"][type]
        else { throw StudioError("Choose a single PNG, JPEG or WebP image.") }
        let info = try JSONEncoder().encode(details)
        guard info.count <= 65536 else { throw StudioError("The artwork description exceeds the comparison limit.") }
        let folder = directory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        let privateDirectory: [FileAttributeKey: Any] = [.posixPermissions: 0o700]
        try createDirectory()
        try manager.createDirectory(at: folder, withIntermediateDirectories: false, attributes: privateDirectory)
        do {
            let url = folder.appendingPathComponent("image." + ext)
            let metadata = folder.appendingPathComponent("info.json")
            try bytes.write(to: url, options: .withoutOverwriting)
            try info.write(to: metadata, options: .withoutOverwriting)
            for target in [url, metadata] { try manager.setAttributes([.posixPermissions: 0o600], ofItemAtPath: target.path) }
            return try LocalArtwork(url, details: details)
        } catch {
            try? manager.removeItem(at: folder)
            throw error
        }
    }

    func discard(_ art: LocalArtwork) {
        if art.details != nil { discardManaged(at: art.url) }
    }

    private func discardManaged(at url: URL) {
        guard let folder = managedFolder(url),
              let files = try? manager.contentsOfDirectory(atPath: folder.path),
              Set(files) == Set([url.lastPathComponent, "info.json"]) else { return }
        try? manager.removeItem(at: folder)
    }
}

struct Comparison {
    private(set) var slots: [LocalArtwork?] = [nil, nil]
    private(set) var revision = UUID()
    private var saved: SavedComparison = .paths([])
    private let defaults: UserDefaults
    let storage: ComparisonStorage
    private(set) var unavailable: Set<Int> = []

    static func supports(_ url: URL) -> Bool {
        url.isFileURL && ["png", "jpg", "jpeg", "webp"].contains(url.pathExtension.lowercased())
    }

    init(defaults: UserDefaults = .standard, storage: ComparisonStorage = .onThisMac) {
        self.defaults = defaults
        self.storage = storage
        reload()
    }

    private mutating func reload() {
        saved = storage.selection(legacy: defaults)
        slots = [nil, nil]
        unavailable.removeAll()
        revision = UUID()
        guard case .paths(let paths) = saved else { unavailable = [0, 1]; return }
        for (i, path) in paths.prefix(2).enumerated() where !path.isEmpty {
            do { slots[i] = try storage.load(URL(fileURLWithPath: path)) }
            catch { unavailable.insert(i) }
        }
    }

    mutating func replace(_ images: [LocalArtwork], slot: Int? = nil) throws {
        guard (1...2).contains(images.count), slot.map({ images.count == 1 && slots.indices.contains($0) }) ?? true
        else { throw StudioError("Choose one image for a side or two images for the pair.") }
        var next = ["", ""]
        if case .paths(let paths) = saved { next = Array((paths + ["", ""]).prefix(2)) }
        let sides = images.count == 2 ? [0, 1] : [slot ?? (slots[0] == nil ? 0 : 1)]
        for (index, image) in zip(sides, images) { next[index] = image.url.path }
        guard try storage.save(next, replacing: saved, legacy: defaults) else {
            reload()
            throw StudioError("The saved comparison changed. Check the current images and try again.")
        }
        for (index, image) in zip(sides, images) {
            slots[index] = image
            unavailable.remove(index)
        }
        saved = .paths(next)
        revision = UUID()
    }

    mutating func open(_ files: [URL], slot: Int? = nil) throws {
        guard (1...2).contains(files.count) else { throw StudioError("Select one or two image files.") }
        try replace(files.map(storage.load), slot: slot)
    }
}
