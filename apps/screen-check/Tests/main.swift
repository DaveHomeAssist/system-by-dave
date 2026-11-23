import Foundation
import Darwin

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
                       pixelWidth: 1920, pixelHeight: height, refreshRate: 60, rotation: 0, interlaced: false, stretched: false)
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
changed = healthy; changed[3].interlaced = true
expect(try result(changed).state != .ready, "interlaced mode cannot pass progressive show timing")
changed = healthy; changed[3].stretched = true
expect(try result(changed).state != .ready, "stretched mode cannot pass unscaled show timing")
changed = healthy; changed[3].interlaced = nil
expect(try result(changed).rows[2].state == .unknown, "missing scan flags are unknown")
changed = healthy; changed[1] = changed[0]
do { _ = try result(changed); expect(false, "duplicate IDs must reject") } catch { passed += 1 }

var capacities: [Int] = []
let ids = try completeDisplayIDs { capacity in
    capacities.append(capacity)
    let count = capacities.count == 1 ? 8 : 12 // extra outputs arrive during enumeration
    return Array(1...UInt32(min(capacity, count)))
}
expect(ids.count == 12 && capacities == [8, 16], "full buffers expand instead of accepting a truncated display list")
expect(try completeDisplayIDs { _ in [] }.isEmpty, "empty OS display list is supported")
do { _ = try completeDisplayIDs { _ in [1, 1] }; expect(false, "duplicate OS display list must reject") } catch { passed += 1 }
do { _ = try completeDisplayIDs { Array(1...UInt32($0)) }; expect(false, "unbounded OS display list must reject") } catch { passed += 1 }

var captures = 0
changed = healthy; changed[3].pixelHeight = 1080
let converged = try stableDisplaySnapshot {
    captures += 1
    return captures == 1 ? healthy : Array(changed.reversed())
}
expect(captures == 3 && converged.contains { $0.id == 72 && $0.pixelHeight == 1080 }, "reconnect read retries until the actual modes agree")
captures = 0
do {
    _ = try stableDisplaySnapshot { captures += 1; return captures % 2 == 0 ? healthy : changed }
    expect(false, "continuously changing modes must reject")
} catch { expect(captures == 4, "unstable read is bounded and cannot pass") }

let scratch = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
try FileManager.default.createDirectory(at: scratch, withIntermediateDirectories: true)
defer { try? FileManager.default.removeItem(at: scratch) }
var live = healthy
var readFails = false
var saveFails = false
let session = VerificationSession(read: {
    if readFails { throw CheckError.message("fixture read error") }
    return try result(live)
}, persist: { _ in
    if saveFails { throw CheckError.message("fixture disk full") }
})
saveFails = true; session.check()
expect(session.report?.state == .ready && session.error == nil && session.saveWarning != nil, "disk-full report write preserves valid readings with a save warning")
saveFails = false; session.check()
expect(session.report?.state == .ready && session.saveWarning == nil, "save warning clears after successful persistence")
live[3].pixelHeight = 1080 // equivalent to reconnecting while the Save dialog is open
let exportURL = scratch.appendingPathComponent("export.json")
try session.export(to: exportURL)
let freshExport = try JSONDecoder().decode(CheckReport.self, from: Data(contentsOf: exportURL))
expect(freshExport.state == .attention && session.report?.state == .attention, "export rechecks and saves current failure rather than old green snapshot")
let beforeFailure = try Data(contentsOf: exportURL)
readFails = true
do { try session.export(to: exportURL); expect(false, "failed fresh read must not export stale report") }
catch { expect(try Data(contentsOf: exportURL) == beforeFailure && session.report == nil, "failed export keeps prior file intact and clears stale in-memory report") }
expect(session.error != nil && session.saveWarning == nil, "read failures remain distinct from persistence warnings")
readFails = false; live = healthy; session.check()
expect(session.report?.state == .ready && session.error == nil, "read failure recovers on next check")

expect(try parseInvocation([]) == .gui(login: false), "no arguments open the checklist")
expect(try parseInvocation(["--login"]) == .gui(login: true), "registered login arguments work")
expect(try parseInvocation(["--check-json"]) == .json(profilePath: nil), "JSON default-profile invocation works")
expect(try parseInvocation(["--profile", "a file.json", "--check-json"]) == .json(profilePath: "a file.json"), "explicit profile survives spaces and flag order")
for invalidArgs in [["--check-json", "--profile"], ["--profile", "x.json"], ["--check-json", "--profiel", "x.json"],
                    ["--check-json", "--profile", "--login"], ["--check-json", "--login"], ["--login", "--login"],
                    ["--check-json", "--check-json"], ["--check-json", "--profile", "a", "--profile", "b"],
                    ["--check-json", "--profile", ""], ["--surprise"]] {
    do { _ = try parseInvocation(invalidArgs); expect(false, "invalid CLI cannot fall back: \(invalidArgs)") } catch { passed += 1 }
}
expect(try parseInvocation(["-psn_0_1"]) == .gui(login: false), "legacy Launch Services argument remains accepted")

let savedProfile = scratch.appendingPathComponent("profile.json")
var profileData = try Data(contentsOf: url)
try profileData.write(to: savedProfile)
expect(try loadProfile(at: savedProfile).groups.count == 4, "bounded profile loader accepts current profile")
profileData.append(Data(repeating: 32, count: 256 * 1024 - profileData.count))
try profileData.write(to: savedProfile)
expect(try loadProfile(at: savedProfile).groups.count == 4, "exact profile size limit accepted")
profileData.append(32); try profileData.write(to: savedProfile)
do { _ = try loadProfile(at: savedProfile); expect(false, "oversized profile must reject before unbounded read") } catch { passed += 1 }
do { _ = try loadProfile(at: scratch); expect(false, "directory cannot be a profile") } catch { passed += 1 }
try Data("{broken".utf8).write(to: savedProfile)
do { _ = try loadProfile(at: savedProfile); expect(false, "damaged profile must reject") } catch { passed += 1 }

// Boundary and metamorphic checks start from the documented five-screen rule.
for hz in [59.85, 60.15] {
    changed = healthy; changed[3].refreshRate = hz
    expect(try result(changed).state == .ready, "inclusive refresh boundary \(hz)")
}
for hz in [59.849, 60.151, Double.nan, Double.infinity] {
    changed = healthy; changed[3].refreshRate = hz
    expect(try result(changed).state != .ready, "invalid/out-of-range refresh \(hz) cannot pass")
}
for i in healthy.indices {
    changed = healthy; changed[i].pixelWidth = 3840
    expect(try result(changed).state != .ready, "each expected screen independently gates the result")
    changed = healthy; changed.remove(at: i)
    expect(try result(changed).state != .ready, "removing any expected screen cannot pass")
}
changed = healthy.enumerated().map { index, display in
    var copy = display; copy.id = UInt32(index + 1000); copy.name = "Renamed"; return copy
}
expect(try result(Array(changed.reversed())).state == .ready, "handles, names and ordering do not replace model identity")
changed = healthy; changed[3].refreshRate = nil
let unknownRow = try result(changed).rows[2]
expect(unknownRow.stateLabel == "UNKNOWN" && unknownRow.accessibilitySummary.contains("refresh rate is unknown"), "unknown has a distinct visible and spoken label")
expect(missing.rows[0].stateLabel == "CHECK", "partially missing pair is not described as entirely missing")

let fifo = scratch.appendingPathComponent("profile-fifo")
expect(mkfifo(fifo.path, 0o600) == 0, "FIFO fixture created")
do { _ = try loadProfile(at: fifo); expect(false, "FIFO must reject without waiting for a writer") } catch { passed += 1 }
let alias = scratch.appendingPathComponent("profile-alias.json")
try JSONEncoder().encode(profile).write(to: savedProfile)
try FileManager.default.createSymbolicLink(at: alias, withDestinationURL: savedProfile)
expect(try loadProfile(at: alias).groups.count == 4, "a symlink to a valid regular profile remains supported")
let privateReport = scratch.appendingPathComponent("private-report.json")
try writePrivateReport(all, to: privateReport)
let mode = try FileManager.default.attributesOfItem(atPath: privateReport.path)[.posixPermissions] as! NSNumber
expect(mode.intValue & 0o777 == 0o600, "report is private at creation")
let linkedReport = scratch.appendingPathComponent("linked-report.json")
let originalProfile = try Data(contentsOf: savedProfile)
try FileManager.default.createSymbolicLink(at: linkedReport, withDestinationURL: savedProfile)
try writePrivateReport(all, to: linkedReport)
expect(try Data(contentsOf: savedProfile) == originalProfile, "report rename never follows destination symlink")
let blockedDestination = scratch.appendingPathComponent("blocked.json")
try FileManager.default.createDirectory(at: blockedDestination, withIntermediateDirectories: true)
let beforeChildren = Set(try FileManager.default.contentsOfDirectory(atPath: scratch.path))
do { try writePrivateReport(all, to: blockedDestination); expect(false, "cannot replace directory with report") } catch { passed += 1 }
expect(Set(try FileManager.default.contentsOfDirectory(atPath: scratch.path)) == beforeChildren, "failed export cleans up its temporary file")

var debounce = CheckDebounce()
expect(debounce.delay(at: 100) == 2 && debounce.delay(at: 101) == 2, "ordinary events get a settling interval")
expect(debounce.delay(at: 105.5) == 0.5 && debounce.delay(at: 106) == 0, "continuous notifications cannot starve a check")
debounce.reset()
expect(debounce.delay(at: 107) == 2, "completed check resets the settling window")

let lockURL = scratch.appendingPathComponent("instance.lock")
var lease = try InstanceLease.acquire(at: lockURL)
expect(lease != nil, "first instance owns the lock")
expect(try InstanceLease.acquire(at: lockURL) == nil, "second instance cannot acquire the same lock")
lease = nil
expect(try InstanceLease.acquire(at: lockURL) != nil, "released instance lock can be reacquired without deleting a PID file")
let lockLink = scratch.appendingPathComponent("lock-link")
try FileManager.default.createSymbolicLink(at: lockLink, withDestinationURL: savedProfile)
do { _ = try InstanceLease.acquire(at: lockLink); expect(false, "lock cannot follow a symlink") } catch { passed += 1 }

print("PASS: \(passed) display-check cases")
