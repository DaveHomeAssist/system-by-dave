import Foundation

let appID = "com.systembydave.frozen-screen-check"
let loginPlist = appID + ".plist"
let supportURL = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
    .appendingPathComponent("Frozen Screen Check", isDirectory: true)
let profileURL = supportURL.appendingPathComponent("show-profile.json")
let openRequestName = Notification.Name(appID + ".open." + NSUserName())

func bundledProfileURL() throws -> URL {
    guard let url = Bundle.main.url(forResource: "show-profile", withExtension: "json") else {
        throw CheckError.message("The app's show profile is missing. Reinstall the complete app bundle.")
    }
    return url
}

func displayCheckTime(_ value: String) -> String {
    guard let date = ISO8601DateFormatter().date(from: value) else { return "Time unavailable" }
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US")
    formatter.timeZone = TimeZone(identifier: "America/New_York")
    formatter.dateFormat = "MMM d, h:mm:ss a z"
    return formatter.string(from: date)
}

