import AppKit
import CoreGraphics

func readDisplays() throws -> [DisplayObservation] {
    var count: UInt32 = 0
    guard CGGetOnlineDisplayList(0, nil, &count) == .success else { throw CheckError.message("macOS could not enumerate displays.") }
    var ids = [CGDirectDisplayID](repeating: 0, count: max(Int(count), 1))
    guard CGGetOnlineDisplayList(UInt32(ids.count), &ids, &count) == .success else { throw CheckError.message("Display list changed; check again.") }
    let names = Dictionary(uniqueKeysWithValues: NSScreen.screens.compactMap { screen -> (UInt32, String)? in
        guard let n = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber else { return nil }
        return (n.uint32Value, screen.localizedName)
    })
    return ids.prefix(Int(count)).map { id in
        let mode = CGDisplayCopyDisplayMode(id)
        var uuid: String?
        if let value = CGDisplayCreateUUIDFromDisplayID(id)?.takeRetainedValue() { uuid = CFUUIDCreateString(nil, value) as String }
        return DisplayObservation(id: id, name: names[id] ?? "Display \(id)", vendor: CGDisplayVendorNumber(id),
                                  product: CGDisplayModelNumber(id), serial: CGDisplaySerialNumber(id), uuid: uuid,
                                  builtIn: CGDisplayIsBuiltin(id) != 0, active: CGDisplayIsActive(id) != 0,
                                  mirrored: CGDisplayIsInMirrorSet(id) != 0, width: mode?.width, height: mode?.height,
                                  pixelWidth: mode?.pixelWidth, pixelHeight: mode?.pixelHeight,
                                  refreshRate: mode?.refreshRate, rotation: CGDisplayRotation(id))
    }
}
