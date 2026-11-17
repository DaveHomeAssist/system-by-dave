import Foundation

var passed = 0
func expect(_ condition: Bool, _ message: String) {
    guard condition else { fputs("FAIL: \(message)\n", stderr); exit(1) }
    passed += 1
}
let profile = try loadProfile(at: URL(fileURLWithPath: CommandLine.arguments[1]))
let scratch = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
try FileManager.default.createDirectory(at: scratch, withIntermediateDirectories: true)
defer { try? FileManager.default.removeItem(at: scratch) }
var failRead = false, failSave = false, reads = 0
let session = VerificationSession(read: {
    reads += 1
    if failRead { throw CheckError.message("Fixture read failed") }
    return try evaluate(profile: profile, displays: [])
}, persist: { _ in if failSave { throw CheckError.message("Fixture storage full") } })
let model = CheckModel(session: session)
model.check()
expect(model.report != nil && model.error == nil && !model.checking, "on-demand check publishes readings")
let exportURL = scratch.appendingPathComponent("report.json")
model.export(to: exportURL)
expect(model.actionMessage == "Fresh report saved." && reads == 2, "export actually rechecks before success")
failRead = true; model.check()
expect(model.actionMessage == nil && model.error != nil && model.report == nil, "failed check clears previous export success")
failRead = false; failSave = true; model.check()
expect(model.report != nil && model.saveWarning != nil && model.error == nil, "saving failure preserves current readings")
failSave = false; model.check()
expect(model.saveWarning == nil, "successful recovery clears storage warning")
model.actionMessage = "Old success"; model.schedule()
expect(model.actionMessage == nil && model.checking, "reconnect marks old readings as pending and clears prior action")
let beforeManual = reads; model.check()
RunLoop.main.run(until: Date().addingTimeInterval(2.1))
expect(reads == beforeManual + 1, "manual check cancels a queued duplicate reconnect check")
let beforeProtected = reads
model.export(to: profileURL)
expect(reads == beforeProtected && model.actionMessage?.contains("cannot replace") == true, "profile overwrite rejected before reading or writing")
model.check()
let previousBytes = try Data(contentsOf: exportURL)
failRead = true; model.export(to: exportURL)
expect(model.report == nil && model.actionMessage?.contains("Fixture read failed") == true, "failed export exposes its current read error")
expect(try Data(contentsOf: exportURL) == previousBytes, "failed fresh export preserves earlier file")
expect(!FileManager.default.fileExists(atPath: scratch.appendingPathComponent("last-report.json").path), "injected tests do not create an operational cache")
print("PASS: \(passed) model transition cases")
