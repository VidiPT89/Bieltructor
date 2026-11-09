import UIKit
import UniformTypeIdentifiers
import WebKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?
  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    let window = UIWindow(frame: UIScreen.main.bounds)
    window.rootViewController = GameViewController()
    window.makeKeyAndVisible()
    self.window = window
    return true
  }
}

final class GameViewController: UIViewController, WKNavigationDelegate, WKUIDelegate,
  WKScriptMessageHandler, UIDocumentPickerDelegate
{
  private var web: WKWebView!
  private var gamepads: GamepadBridge?
  private var power: PowerWatcher?
  private let cloud = CloudBridge()
  private let assets = LocalAssets()
  private let smoke = ProcessInfo.processInfo.arguments.contains("--smoke-test")
  private let status = UILabel()
  private var exportURL: URL?
  override var prefersStatusBarHidden: Bool { true }
  override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { [.bottom, .left, .right] }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = UIColor(red: 0.08, green: 0.1, blue: 0.1, alpha: 1)
    let config = WKWebViewConfiguration()
    config.setURLSchemeHandler(assets, forURLScheme: "bieltructor")
    config.userContentController.add(self, name: "files")
    config.userContentController.add(cloud, name: "cloud")
    config.allowsInlineMediaPlayback = true
    if smoke { config.websiteDataStore = .nonPersistent() }
    config.userContentController.addUserScript(
      WKUserScript(
        source: "document.documentElement.dataset.platform = 'ios';", injectionTime: .atDocumentEnd,
        forMainFrameOnly: true))
    web = WKWebView(frame: .zero, configuration: config)
    web.navigationDelegate = self
    web.uiDelegate = self
    web.isOpaque = false
    web.backgroundColor = view.backgroundColor
    web.scrollView.isScrollEnabled = false
    web.scrollView.bounces = false
    web.scrollView.contentInsetAdjustmentBehavior = .never
    web.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(web)
    NSLayoutConstraint.activate([
      web.topAnchor.constraint(equalTo: view.topAnchor),
      web.bottomAnchor.constraint(equalTo: view.bottomAnchor),
      web.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      web.trailingAnchor.constraint(equalTo: view.trailingAnchor),
    ])
    NotificationCenter.default.addObserver(
      self, selector: #selector(pauseGame), name: UIApplication.willResignActiveNotification,
      object: nil)
    gamepads = GamepadBridge(web: web)
    cloud.web = web
    power = PowerWatcher(web: web)
    web.load(
      URLRequest(url: URL(string: "bieltructor://app/index.html" + (smoke ? "?test=1" : ""))!))
  }

  @objc private func pauseGame() {
    web.evaluateJavaScript("window.pauseNativeGame?.()", completionHandler: nil)
  }

  private func openExternal(_ url: URL) {
    guard url.scheme == "https", ["ividi.dev", "github.com"].contains(url.host ?? "") else {
      return
    }
    UIApplication.shared.open(url)
  }
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
      openExternal(url)
      decisionHandler(.cancel)
    }
  }
  func webView(
    _ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
    for action: WKNavigationAction, windowFeatures: WKWindowFeatures
  ) -> WKWebView? {
    if let url = action.request.url { openExternal(url) }
    return nil
  }
  func userContentController(
    _ userContentController: WKUserContentController, didReceive message: WKScriptMessage
  ) {
    guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.scheme == "bieltructor",
      let body = message.body as? [String: Any], let action = body["action"] as? String,
      presentedViewController == nil
    else { return }
    if action == "export", let json = body["json"] as? String {
      do {
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(
          UUID().uuidString)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        let url = folder.appendingPathComponent("Bieltructor-world.json")
        try json.write(to: url, atomically: true, encoding: .utf8)
        exportURL = url
        let picker = UIDocumentPickerViewController(forExporting: [url], asCopy: true)
        picker.delegate = self
        present(picker, animated: true)
      } catch { showFileError() }
    } else if action == "import" {
      exportURL = nil
      let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.json], asCopy: true)
      picker.allowsMultipleSelection = false
      picker.delegate = self
      present(picker, animated: true)
    }
  }
  func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL])
  {
    if exportURL != nil {
      exportURL = nil
      return
    }
    guard let url = urls.first else { return }
    let scoped = url.startAccessingSecurityScopedResource()
    defer { if scoped { url.stopAccessingSecurityScopedResource() } }
    do {
      let size = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
      guard size <= 3_000_000 else { throw CocoaError(.fileReadTooLarge) }
      let data = try Data(contentsOf: url)
      guard data.count <= 3_000_000, let json = String(data: data, encoding: .utf8) else {
        throw CocoaError(.fileReadCorruptFile)
      }
      web.callAsyncJavaScript(
        "window.importNativeWorld(json)", arguments: ["json": json], in: nil, in: .page,
        completionHandler: nil)
    } catch { showFileError() }
  }
  func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) { exportURL = nil }
  private func showFileError() {
    web.evaluateJavaScript("window.nativeFileError?.()", completionHandler: nil)
  }
  func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { webView.reload() }

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    power?.send()
    guard smoke else { return }
    DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in self?.runSmoke() }
  }
  private func runSmoke() {
    web.callAsyncJavaScript(
      "return await window.runSmokeTests()", arguments: [:], in: nil, in: .page
    ) { [weak self] result in
      guard let self else { return }
      let passed: Bool
      if case .success(let value) = result, let data = value as? [String: Any],
        data["ok"] as? Bool == true
      {
        passed = true
      } else {
        passed = false
      }
      let output = String(describing: result)
      let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
      try? output.write(
        to: docs.appendingPathComponent("smoke-result.txt"), atomically: true, encoding: .utf8)
      self.status.text = passed ? "Tests passed" : "Tests failed: \(output)"
      self.status.accessibilityIdentifier = "smoke-result"
      self.status.backgroundColor = passed ? .systemGreen : .systemRed
      self.status.textColor = .white
      self.status.numberOfLines = 0
      self.status.frame = CGRect(x: 20, y: 20, width: 300, height: 80)
      self.view.addSubview(self.status)
    }
  }
}
