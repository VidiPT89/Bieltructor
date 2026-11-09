import Foundation
import WebKit

/// Optional iCloud Drive sync: keeps one JSON file per world in the app's
/// iCloud container. A deleted world leaves a small marker file instead, so
/// other devices delete it too. Without iCloud (no account, or a build
/// without the iCloud capability) it simply reports that iCloud is not
/// available.
final class CloudBridge: NSObject, WKScriptMessageHandler {
  static let container = "iCloud.dev.ividi.bieltructor"
  weak var web: WKWebView?
  private let queue = DispatchQueue(label: "dev.ividi.bieltructor.cloud")

  private func folder() -> URL? {
    guard FileManager.default.ubiquityIdentityToken != nil,
      let root = FileManager.default.url(forUbiquityContainerIdentifier: Self.container)
    else { return nil }
    let worlds = root.appendingPathComponent("Documents/Worlds", isDirectory: true)
    try? FileManager.default.createDirectory(at: worlds, withIntermediateDirectories: true)
    return worlds
  }

  /// The updatedAt written in a world file (or a deletion marker), if any.
  private static func updatedAt(of url: URL) -> Double? {
    guard let data = try? Data(contentsOf: url),
      let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else { return nil }
    return (object["updatedAt"] as? NSNumber)?.doubleValue
  }

  /// Reads and writes inside one coordinated write, so another device (or
  /// iCloud itself) cannot change the file between the check and the save.
  private static func save(_ json: String, to url: URL, expected: Double??) -> [String: Any] {
    var ok = false, changed = false
    var coordinatorError: NSError?
    NSFileCoordinator(filePresenter: nil).coordinate(
      writingItemAt: url, options: .forMerging, error: &coordinatorError
    ) { target in
      if let expected {
        let current = FileManager.default.fileExists(atPath: target.path)
          ? updatedAt(of: target) : nil
        let same: Bool
        switch (current, expected) {
        case (nil, nil): same = true
        case let (now?, wanted?): same = abs(now - wanted) < 0.5
        default: same = false
        }
        if !same {
          changed = true
          return
        }
      }
      ok = (try? json.write(to: target, atomically: true, encoding: .utf8)) != nil
    }
    if coordinatorError != nil { ok = false }
    return changed ? ["ok": false, "changed": true] : ["ok": ok]
  }

  private static func safeName(_ id: String) -> String? {
    let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-_"))
    return !id.isEmpty && id.count <= 40 && id.unicodeScalars.allSatisfy(allowed.contains) ? id : nil
  }

  func userContentController(
    _ userContentController: WKUserContentController, didReceive message: WKScriptMessage
  ) {
    guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.scheme == "bieltructor",
      let body = message.body as? [String: Any], let req = body["req"] as? Int,
      let action = body["action"] as? String
    else { return }
    let worldId = (body["worldId"] as? String).flatMap(Self.safeName)
    let json = body["json"] as? String
    // "expected": the updatedAt of the file when the game listed it, or null
    // when it had no file. A save is refused if the file changed since.
    let checks = body.keys.contains("expected")
    let expected = body["expected"] as? Double
    queue.async { [weak self] in
      guard let self else { return }
      var result: Any = NSNull()
      let folder = self.folder()
      switch action {
      case "status":
        result = ["available": folder != nil]
      case "list":
        var worlds: [String] = []
        var complete = false
        if let folder,
          let files = try? FileManager.default.contentsOfDirectory(
            at: folder, includingPropertiesForKeys: [.fileSizeKey])
        {
          complete = true
          for file in files {
            // Files not downloaded yet are asked for; they arrive on a later sync.
            if file.lastPathComponent.hasPrefix(".") {
              if file.lastPathComponent.hasSuffix(".icloud") {
                complete = false
                try? FileManager.default.startDownloadingUbiquitousItem(at: file)
              }
              continue
            }
            guard file.pathExtension == "json" else { continue }
            guard
              let size = try? file.resourceValues(forKeys: [.fileSizeKey]).fileSize, size <= 3_000_000,
              let text = try? String(contentsOf: file, encoding: .utf8)
            else { complete = false; continue }
            worlds.append(text)
          }
        }
        if complete { result = worlds }
      case "save":
        if let folder, let worldId, let json, json.utf8.count <= 3_000_000 {
          result = Self.save(
            json, to: folder.appendingPathComponent("\(worldId).json"),
            expected: checks ? .some(expected) : .none)
        }
      default:
        break
      }
      let payload =
        (try? JSONSerialization.data(withJSONObject: ["value": result], options: []))
        .flatMap { String(data: $0, encoding: .utf8) } ?? "{\"value\":null}"
      DispatchQueue.main.async {
        self.web?.evaluateJavaScript("window.cloudReply?.(\(req), \(payload).value)", completionHandler: nil)
      }
    }
  }
}

/// Tells the game when Low Power Mode is on, so it can draw at 30 frames per second.
final class PowerWatcher {
  private weak var web: WKWebView?
  private var observer: NSObjectProtocol?

  init(web: WKWebView) {
    self.web = web
    observer = NotificationCenter.default.addObserver(
      forName: .NSProcessInfoPowerStateDidChange, object: nil, queue: .main
    ) { [weak self] _ in self?.send() }
  }

  func send() {
    let saving = ProcessInfo.processInfo.isLowPowerModeEnabled
    web?.evaluateJavaScript("window.nativePowerSaving?.(\(saving))", completionHandler: nil)
  }

  deinit { observer.map(NotificationCenter.default.removeObserver) }
}
