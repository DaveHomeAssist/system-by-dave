import AppKit
import CoreGraphics
import Foundation

struct Layout: Decodable { let id: UInt32; let x: Int32; let y: Int32 }

func check(_ error: CGError) throws {
    if error != .success { throw NSError(domain: "FrozenDisplays", code: Int(error.rawValue)) }
}
func snapshot() throws -> [[String: Any]] {
    var ids = [CGDirectDisplayID](repeating: 0, count: 32)
    var count: UInt32 = 0
    try check(CGGetOnlineDisplayList(32, &ids, &count))
    if count >= 32 { throw NSError(domain: "Too many displays", code: 1) }
    return ids.prefix(Int(count)).map { id in
        let bounds = CGDisplayBounds(id)
        let mode = CGDisplayCopyDisplayMode(id)
        var result: [String: Any] = [:]
        result["id"] = Int(id)
        let screen = NSScreen.screens.first { ($0.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber)?.uint32Value == id }
        result["name"] = screen?.localizedName ?? ""
        result["active"] = CGDisplayIsActive(id) != 0
        result["width"] = mode?.width ?? 0
        result["height"] = mode?.height ?? 0
        result["pixelWidth"] = mode?.pixelWidth ?? 0
        result["pixelHeight"] = mode?.pixelHeight ?? 0
        result["refreshRate"] = mode?.refreshRate ?? 0
        result["x"] = Int(bounds.origin.x)
        result["y"] = Int(bounds.origin.y)
        result["main"] = CGDisplayIsMain(id) != 0
        result["mirrored"] = CGDisplayIsInMirrorSet(id) != 0
        result["rotation"] = CGDisplayRotation(id)
        return result
    }
}

do {
    if CommandLine.arguments.dropFirst().first == "windows" {
        let windows = CGWindowListCopyWindowInfo([.optionAll, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] ?? []
        let owned = windows.filter { ($0[kCGWindowOwnerName as String] as? String) == "Millumin5" }
        let data = try JSONSerialization.data(withJSONObject: owned, options: [.sortedKeys])
        FileHandle.standardOutput.write(data)
        exit(0)
    }
    if CommandLine.arguments.dropFirst().first == "layout" {
        let data = FileHandle.standardInput.readDataToEndOfFile()
        let rows = try JSONDecoder().decode([Layout].self, from: data)
        guard !rows.isEmpty else { throw NSError(domain: "Empty layout", code: 4) }
        let current = try snapshot()
        let expected = Set(rows.map { Int($0.id) })
        guard expected.count == rows.count else { throw NSError(domain: "Duplicate display ID", code: 5) }
        let currentIDs: [Int] = current.compactMap { $0["id"] as? Int }
        guard Set(currentIDs) == expected else {
            throw NSError(domain: "Display set changed", code: 2)
        }
        var config: CGDisplayConfigRef?
        try check(CGBeginDisplayConfiguration(&config))
        guard let config = config else { throw NSError(domain: "No display transaction", code: 3) }
        do {
            for row in rows {
                try check(CGConfigureDisplayMirrorOfDisplay(config, row.id, kCGNullDirectDisplay))
                try check(CGConfigureDisplayOrigin(config, row.id, row.x, row.y))
            }
            try check(CGCompleteDisplayConfiguration(config, .forSession))
        } catch {
            CGCancelDisplayConfiguration(config)
            throw error
        }
    }
    let data = try JSONSerialization.data(withJSONObject: snapshot(), options: [.sortedKeys])
    FileHandle.standardOutput.write(data)
} catch {
    FileHandle.standardError.write(Data("Display operation failed: \(error)\n".utf8))
    exit(1)
}
