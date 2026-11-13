import Foundation

var passed = 0
func expect(_ condition: Bool, _ message: String) {
    guard condition else { fputs("FAIL: \(message)\n", stderr); exit(1) }
    passed += 1
}
let url = URL(fileURLWithPath: CommandLine.arguments[1])
let profile = try JSONDecoder().decode(ShowProfile.self, from: Data(contentsOf: url))
try profile.validate()
func observation(_ id: UInt32, _ vendor: UInt32, _ product: UInt32, _ height: Int = 1200) -> DisplayObservation {
    DisplayObservation(id: id, name: "Fixture", vendor: vendor, product: product, serial: 0, uuid: nil,
                       builtIn: false, active: true, mirrored: false, width: 1920, height: height,
                       pixelWidth: 1920, pixelHeight: height, refreshRate: 60, rotation: 0)
}
// Model IDs and output timings from the production readback. Display numbers are
// deliberately arbitrary: they are runtime handles, never persistent identity.
let healthy = [observation(901, 13481, 53461), observation(13, 13481, 53461),
               observation(47, 13481, 53541), observation(72, 2579, 3584), observation(5, 19636, 19540, 1080)]
func result(_ values: [DisplayObservation]) throws -> CheckReport { try evaluate(profile: profile, displays: values) }
let all = try result(healthy)
expect(all.state == .ready && all.readyCount == 5 && all.expectedCount == 5, "five correct outputs pass")
expect(try result(Array(healthy.reversed())).state == .ready, "display order is not identity")
var changed = healthy; changed[3].width = 1920; changed[3].height = 1080; changed[3].pixelWidth = 3840; changed[3].pixelHeight = 2160
let scaled4K = try result(changed)
expect(scaled4K.state != .ready && scaled4K.readyCount == 4, "real Studio failure: 1080 desktop over 4K does not pass")
changed = healthy; changed[3].width = 960; changed[3].height = 600
expect(try result(changed).state != .ready, "HiDPI 600 desktop over 1200 is not unscaled")
changed = healthy; changed[3].refreshRate = 59.95
expect(try result(changed).state == .ready, "Barco reduced-blanking 59.95 is accepted")
changed[3].refreshRate = 59.94
expect(try result(changed).state == .ready, "59.94 is accepted")
changed[3].refreshRate = 30
expect(try result(changed).state != .ready, "30 Hz fails")
changed[3].refreshRate = 0
expect(try result(changed).rows[2].state == .unknown, "zero refresh is unknown, not 60")
changed = healthy; changed[3].pixelWidth = nil
expect(try result(changed).rows[2].state == .unknown, "missing mode is unknown")
changed = healthy; changed[0].mirrored = true
expect(try result(changed).state != .ready, "mirrored output fails")
changed = healthy; changed[0].active = false
expect(try result(changed).state != .ready, "inactive output fails")
let missing = try result(Array(healthy.dropFirst()))
expect(missing.state != .ready && missing.readyCount == 4 && missing.rows[0].observations.count == 1, "one portal cannot stand in for two")
changed = healthy; changed[3].vendor = 1; changed[3].name = "UDM-4K"
expect(try result(changed).rows.count == 5, "friendly name cannot bypass product verification")
changed = healthy; changed.append(observation(555, 2579, 3584))
expect(try result(changed).state != .ready, "extra same-model output needs review")
changed = healthy; changed.append(observation(777, 1, 2))
expect(try result(changed).state != .ready, "unexpected output needs review")
changed[5].builtIn = true
expect(try result(changed).state == .ready, "built-in laptop screen is explicitly ignored")
expect(try result([]).readyCount == 0 && result([]).state != .ready, "empty rig never passes")
let decoded = try JSONDecoder().decode(CheckReport.self, from: encodedReport(scaled4K))
expect(decoded.rows[2].observations[0].pixelWidth == 3840 && decoded.state == .attention, "export preserves actual pixels and status")
var invalid = profile; invalid.groups.append(invalid.groups[0])
do { try invalid.validate(); expect(false, "duplicate profile identity must reject") } catch { passed += 1 }
invalid = profile; invalid.refreshTolerance = 30
do { try invalid.validate(); expect(false, "unsafe refresh tolerance must reject") } catch { passed += 1 }
invalid = profile; invalid.groups[0].count = 0
do { try invalid.validate(); expect(false, "empty expected group must reject") } catch { passed += 1 }
print("PASS: \(passed) display-check cases")
