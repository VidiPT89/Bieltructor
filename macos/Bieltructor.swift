import Cocoa
import UniformTypeIdentifiers
import WebKit

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate,
  WKScriptMessageHandler
{
  var window: NSWindow!
  var web: WKWebView!
  var gamepads: GamepadBridge?
  var power: PowerWatcher?
  let cloud = CloudBridge()
  let assets = LocalAssets()
  let smoke = CommandLine.arguments.contains("--smoke-test")
  func applicationDidFinishLaunching(_ notification: Notification) {
    let menu = NSMenu()
    let item = NSMenuItem()
    menu.addItem(item)
    let appMenu = NSMenu()
    item.submenu = appMenu
    appMenu.addItem(withTitle: "Bieltructor", action: #selector(showAbout), keyEquivalent: "")
    appMenu.addItem(.separator())
    appMenu.addItem(withTitle: "Settings…", action: #selector(menuSettings), keyEquivalent: ",")
    appMenu.addItem(.separator())
    appMenu.addItem(
      withTitle: "Hide Bieltructor", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
    appMenu.addItem(
      withTitle: "Hide Others", action: #selector(NSApplication.hideOtherApplications(_:)),
      keyEquivalent: "h"
    ).keyEquivalentModifierMask = [.option, .command]
    appMenu.addItem(.separator())
    appMenu.addItem(
      withTitle: "Quit Bieltructor", action: #selector(NSApplication.terminate(_:)),
      keyEquivalent: "q")
    let fileItem = NSMenuItem()
    menu.addItem(fileItem)
    let fileMenu = NSMenu(title: "File")
    fileItem.submenu = fileMenu
    fileMenu.addItem(withTitle: "New World", action: #selector(menuNewWorld), keyEquivalent: "n")
    fileMenu.addItem(withTitle: "Export World…", action: #selector(menuExport), keyEquivalent: "e")
    let viewItem = NSMenuItem()
    menu.addItem(viewItem)
    let viewMenu = NSMenu(title: "Window")
    viewItem.submenu = viewMenu
    viewMenu.addItem(
      withTitle: "Full Screen", action: #selector(NSWindow.toggleFullScreen(_:)), keyEquivalent: "f"
    ).keyEquivalentModifierMask = [.control, .command]
    viewMenu.addItem(
      withTitle: "Minimize", action: #selector(NSWindow.miniaturize(_:)), keyEquivalent: "m")
    NSApp.mainMenu = menu
    let config = WKWebViewConfiguration()
    config.setURLSchemeHandler(assets, forURLScheme: "bieltructor")
    config.userContentController.add(self, name: "files")
    config.userContentController.add(cloud, name: "cloud")
    if smoke {
      // Test runs use a throwaway data store and report JavaScript errors to /tmp.
      config.websiteDataStore = .nonPersistent()
      config.userContentController.add(self, name: "diagnostics")
      config.userContentController.addUserScript(
        WKUserScript(
          source:
            "window.addEventListener('error', e => window.webkit.messageHandlers.diagnostics.postMessage(e.message + ' @ ' + e.filename + ':' + e.lineno));",
          injectionTime: .atDocumentStart, forMainFrameOnly: true))
    }
    web = WKWebView(frame: .zero, configuration: config)
    web.navigationDelegate = self
    web.setValue(false, forKey: "drawsBackground")
    window = GameWindow(
      contentRect: NSRect(x: 0, y: 0, width: 1280, height: 800),
      styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false
    )
    window.title = "Bieltructor"
    window.minSize = NSSize(width: 720, height: 500)
    window.backgroundColor = NSColor(red: 0.08, green: 0.1, blue: 0.1, alpha: 1)
    window.contentView = web
    gamepads = GamepadBridge(web: web)
    cloud.web = web
    power = PowerWatcher(web: web)
    window.center()
    window.setFrameAutosaveName("BieltructorWindow")
    window.makeKeyAndOrderFront(nil)
    NSApp.activate(ignoringOtherApps: true)
    let url = URL(string: "bieltructor://app/index.html" + (smoke ? "?test=1" : ""))!
    web.load(URLRequest(url: url))
  }
  // Menu shortcuts are handled by the game itself.
  @objc func menuNewWorld() { web.evaluateJavaScript("window.nativeMenu?.('newworld')") }
  @objc func menuExport() { web.evaluateJavaScript("window.nativeMenu?.('export')") }
  @objc func menuSettings() { web.evaluateJavaScript("window.nativeMenu?.('settings')") }
  @objc func showAbout() {
    NSApp.orderFrontStandardAboutPanel(options: [
      .applicationName: "Bieltructor", .applicationVersion: "2.0.0",
      .credits: NSAttributedString(
        string:
          "Developed by David Arsénio Martins\nhttps://ividi.dev/\nhttps://github.com/VidiPT89/"),
    ])
  }
  func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { webView.reload() }
  func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
  func webView(
    _ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
    decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
  ) {
    guard let url = action.request.url else {
      decisionHandler(.cancel)
      return
    }
    if url.scheme == "bieltructor", url.host == "app" {
      decisionHandler(.allow)
    } else {
      decisionHandler(.cancel)
    }
  }
  func userContentController(
    _ userContentController: WKUserContentController, didReceive message: WKScriptMessage
  ) {
    if message.name == "diagnostics" {
      try? String(describing: message.body).write(
        toFile: "/tmp/biel-js-error.txt", atomically: true, encoding: .utf8)
      return
    }
    guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.scheme == "bieltructor",
      let body = message.body as? [String: Any], let action = body["action"] as? String
    else { return }
    if action == "quit" {
      NSApp.terminate(nil)
      return
    }
    if action == "export", let json = body["json"] as? String {
      let panel = NSSavePanel()
      panel.nameFieldStringValue = "Bieltructor-world.json"
      panel.allowedContentTypes = [.json]
      panel.beginSheetModal(for: window) { response in
        if response == .OK, let url = panel.url {
          do { try json.write(to: url, atomically: true, encoding: .utf8) } catch {
            self.showError(error)
          }
        }
      }
    } else if action == "import" {
      let panel = NSOpenPanel()
      panel.allowedContentTypes = [.json]
      panel.allowsMultipleSelection = false
      panel.beginSheetModal(for: window) { response in
        guard response == .OK, let url = panel.url else { return }
        do {
          let data = try Data(contentsOf: url)
          guard data.count <= 3_000_000, let json = String(data: data, encoding: .utf8) else {
            throw NSError(domain: "Bieltructor", code: 1)
          }
          self.web.callAsyncJavaScript(
            "window.importNativeWorld(json)", arguments: ["json": json], in: nil, in: .page,
            completionHandler: nil)
        } catch { self.showError(error) }
      }
    }
  }
  func showError(_ error: Error) {
    let alert = NSAlert(error: error)
    alert.beginSheetModal(for: window)
  }
  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    power?.send()
    guard smoke else { return }
    DispatchQueue.main.asyncAfter(deadline: .now() + 4) { self.runSmoke() }
  }
  func runSmoke() {
    web.callAsyncJavaScript(
      "return await window.runSmokeTests()", arguments: [:], in: nil, in: .page
    ) { result in
      print("SMOKE: \(result)")
      try? String(describing: result).write(
        toFile: "/tmp/biel-smoke-result.txt", atomically: true, encoding: .utf8)
      self.web.takeSnapshot(with: nil) { image, error in
        if let image = image, let tiff = image.tiffRepresentation,
          let rep = NSBitmapImageRep(data: tiff),
          let png = rep.representation(using: .png, properties: [:])
        {
          try? png.write(to: URL(fileURLWithPath: "/tmp/bieltructor-native.png"))
        }
        if case .success(let value) = result, let dict = value as? [String: Any],
          dict["ok"] as? Bool == true
        {
          self.window.title = "Bieltructor: tests passed"
        } else {
          self.window.title = "Bieltructor: test failed"
        }
      }
    }
  }
}
@main
struct BieltructorApplication {
  static func main() {
    let application = NSApplication.shared
    let delegate = AppDelegate()
    application.delegate = delegate
    application.setActivationPolicy(.regular)
    withExtendedLifetime(delegate) { application.run() }
  }
}

/// The game reads the keyboard itself. Keys the web page does not mark as
/// handled would otherwise reach the window and make macOS play its alert
/// sound on every press (W, A, S, D, numbers...), so the window stays quiet.
final class GameWindow: NSWindow {
  override func noResponder(for eventSelector: Selector) {
    if eventSelector == #selector(NSResponder.keyDown(with:)) { return }
    super.noResponder(for: eventSelector)
  }
}
