import AppKit
import CoreGraphics
import IOKit

func readDisplays() throws -> [DisplayObservation] {
    try stableDisplaySnapshot(capture: captureDisplays)
}

private func captureDisplays() throws -> [DisplayObservation] {
    let ids = try completeDisplayIDs { capacity in
        var count: UInt32 = 0
        var buffer = [CGDirectDisplayID](repeating: 0, count: capacity)
        guard CGGetOnlineDisplayList(UInt32(capacity), &buffer, &count) == .success else {
            throw CheckError.message("macOS could not enumerate displays.")
        }
        return Array(buffer.prefix(Int(count)))
    }
    let names = Dictionary(NSScreen.screens.compactMap { screen -> (UInt32, String)? in
        guard let n = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber else { return nil }
        return (n.uint32Value, screen.localizedName)
    }, uniquingKeysWith: { first, _ in first })
    return ids.map { id in
        let mode = CGDisplayCopyDisplayMode(id)
        var uuid: String?
        if let value = CGDisplayCreateUUIDFromDisplayID(id)?.takeRetainedValue() { uuid = CFUUIDCreateString(nil, value) as String }
        return DisplayObservation(id: id, name: names[id] ?? "Display \(id)", vendor: CGDisplayVendorNumber(id),
                                  product: CGDisplayModelNumber(id), serial: CGDisplaySerialNumber(id), uuid: uuid,
                                  builtIn: CGDisplayIsBuiltin(id) != 0, active: CGDisplayIsActive(id) != 0,
                                  mirrored: CGDisplayIsInMirrorSet(id) != 0, width: mode?.width, height: mode?.height,
                                  pixelWidth: mode?.pixelWidth, pixelHeight: mode?.pixelHeight,
                                  refreshRate: mode?.refreshRate, rotation: CGDisplayRotation(id),
                                  interlaced: mode.map { $0.ioFlags & UInt32(kDisplayModeInterlacedFlag) != 0 },
                                  stretched: mode.map { $0.ioFlags & UInt32(kDisplayModeStretchedFlag) != 0 })
    }
}
