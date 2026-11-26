import Foundation
import CryptoKit
import ImageIO
import UniformTypeIdentifiers

private struct CheckFailure: Error, CustomStringConvertible { let description: String }
private func check(_ condition: Bool, _ message: String) throws {
    if !condition { throw CheckFailure(description: message) }
}
private func expectsError(_ action: () throws -> Void) throws {
    do { try action() } catch { return }
    throw CheckFailure(description: "Expected the operation to be rejected.")
}

@main struct ComparisonChecks {
    @MainActor static func main() async throws {
        let source = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
        let files = ["Daylight.png", "Tungsten.png"].map { source.appendingPathComponent($0) }
        let bytes = try files.map { try Data(contentsOf: $0) }
        let details = try JSONDecoder().decode([RenderDetails].self, from: Data(contentsOf: source.appendingPathComponent("samples.json")))
        let suite = "com.systembydave.envision.comparison-tests." + UUID().uuidString
        let defaults = UserDefaults(suiteName: suite)!
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        defer { defaults.removePersistentDomain(forName: suite); try? FileManager.default.removeItem(at: root) }
        let storage = ComparisonStorage(directory: root.appendingPathComponent("Comparisons", isDirectory: true))
        defaults.set(files.map(\.path), forKey: "CompareFiles")
        let startingPreferences = defaults.persistentDomain(forName: suite) as NSDictionary?
        let model = Workspace(defaults: defaults, comparisonStorage: storage)
        try check(startingPreferences == defaults.persistentDomain(forName: suite) as NSDictionary?, "Launching the studio wrote a draft or connection setting.")
        func paths(_ compare: Comparison) -> [String?] { compare.slots.map { $0?.url.path } }
        func copies() throws -> [String] {
            (try FileManager.default.contentsOfDirectory(atPath: storage.directory.path)).filter { UUID(uuidString: $0) != nil }
        }
        try check(paths(model.comparison) == files.map(\.path), "Legacy paths did not reopen.")
        try expectsError { try model.comparison.open(files, slot: 3) }
        try expectsError { try model.comparison.open([files[0]], slot: -1) }
        try expectsError { try model.comparison.open([files[0], root.appendingPathComponent("missing.png")]) }
        try check(paths(model.comparison) == files.map(\.path), "An invalid local pair replaced a side.")

        let old = paths(model.comparison)
        await model.fillComparison(details, slot: nil, current: { true }) { index in index == 0 ? bytes[0] : Data([0]) }
        try check(model.issue != nil && paths(model.comparison) == old, "A failed second asset replaced the old pair.")
        try check(try copies().isEmpty, "Failed pair left a private copy on disk.")
        model.issue = nil
        await model.fillComparison(details, slot: nil, current: { model.area == .generate }) { index in
            model.area = .studio
            return bytes[index]
        }
        try check(model.area == .studio && paths(model.comparison) == old && model.issue == nil, "A late comparison changed the current screen.")
        try check(try copies().isEmpty, "Canceled navigation left a copy.")
        model.area = .generate
        await model.fillComparison(details, slot: nil, current: { model.area == .generate }) { bytes[$0] }
        try check(model.area == .compare && model.issue == nil, "The completed pair did not open Compare.")
        let offline = Comparison(defaults: defaults, storage: storage)
        try check(offline.slots.compactMap { $0?.details } == details, "The saved pair lost its render details.")
        for (index, item) in offline.slots.compactMap({ $0 }).enumerated() {
            try check(try Data(contentsOf: item.url) == bytes[index], "Saved pixels changed.")
            let mode = try FileManager.default.attributesOfItem(atPath: item.url.path)[.posixPermissions] as? NSNumber
            try check(mode?.intValue == 0o600, "Private render file permissions changed.")
        }
        try check(try copies().count == 2, "The finished pair should use two local copies.")
        var downloads = 0
        await model.fillComparison(details, slot: nil, current: { true }) { index in downloads += 1; return bytes[index] }
        try check(downloads == 0 && paths(model.comparison) == paths(offline), "Already-saved renders were downloaded again.")
        var stale = offline
        try model.comparison.open([files[0]], slot: 0)
        try expectsError { try stale.open([files[1]], slot: 1) }
        try check(paths(stale) == paths(model.comparison), "A stale writer replaced the newer selection.")
        try check(try copies().count == 1 && FileManager.default.fileExists(atPath: files[0].path), "Replacing a side removed the wrong file.")
        let right = try requiredImage(model.comparison.slots[1])
        try Data([1, 2, 3]).write(to: right.url)
        var damaged = Comparison(defaults: defaults, storage: storage)
        try check(damaged.slots[0] != nil && damaged.slots[1] == nil && damaged.unavailable == [1], "A changed private image was accepted or damaged the other side.")
        try damaged.open([files[1]], slot: 1)
        try check(damaged.unavailable.isEmpty && paths(damaged) == files.map(\.path), "Replacing an unavailable side failed.")
        try check(try copies().isEmpty, "Replacing the corrupt copy left its private image on disk.")
        try check(defaults.stringArray(forKey: "CompareFiles") == files.map(\.path), "Migration rewrote the user's legacy preferences.")
        let jpeg = NSMutableData()
        guard let dest = CGImageDestinationCreateWithData(jpeg, UTType.jpeg.identifier as CFString, 1, nil),
              let source = CGImageSourceCreateWithData(bytes[0] as CFData, nil),
              let pixels = CGImageSourceCreateImageAtIndex(source, 0, nil) else { throw CheckFailure(description: "Could not prepare rotated JPEG.") }
        CGImageDestinationAddImage(dest, pixels, [kCGImagePropertyOrientation: 6] as CFDictionary)
        try check(CGImageDestinationFinalize(dest), "Could not encode rotated JPEG.")
        let rotated = jpeg as Data
        let metadata = RenderDetails(title: "Portrait", project: "Test", model: nil, engineSeconds: nil, width: 432, height: 768,
                                     hash: SHA256.hash(data: rotated).map { String(format: "%02x", $0) }.joined())
        let picture = try storage.snapshot(rotated, details: metadata)
        try check(try storage.load(picture.url).dimensions == "432 × 768", "EXIF rotation was lost.")
        storage.discard(picture)
        defaults.set("https://studio.example.invalid/", forKey: "StudioOrigin")
        let connectedPreferences = defaults.persistentDomain(forName: suite) as NSDictionary?
        _ = Workspace(defaults: defaults, comparisonStorage: storage)
        try check(connectedPreferences == defaults.persistentDomain(forName: suite) as NSDictionary?, "Reopening a saved connection rewrote the owner's preferences.")
        print("PASS legacy and local files, invalid side, partial download, navigation cancellation, offline reopen, permissions, cached reuse, stale writer, corrupt copy recovery and EXIF orientation.")
    }

    private static func requiredImage<T>(_ value: T?) throws -> T {
        guard let value else { throw CheckFailure(description: "Missing comparison image.") }
        return value
    }
}
