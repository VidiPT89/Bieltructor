import Foundation
import WebKit

final class LocalAssets: NSObject, WKURLSchemeHandler {
  func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
    guard let root = Bundle.main.resourceURL?.appendingPathComponent("Web"),
      let url = task.request.url
    else { return }
    let path = url.path == "/" ? "index.html" : String(url.path.dropFirst())
    let file = root.appendingPathComponent(path).standardizedFileURL
    guard file.path.hasPrefix(root.path + "/"), let data = try? Data(contentsOf: file) else {
      task.didFailWithError(NSError(domain: "Bieltructor", code: 404))
      return
    }
    let types = [
      "html": "text/html", "js": "application/javascript", "css": "text/css",
      "svg": "image/svg+xml", "png": "image/png", "webp": "image/webp",
      "json": "application/json", "woff2": "font/woff2",
    ]
    let response = URLResponse(
      url: url, mimeType: types[file.pathExtension] ?? "application/octet-stream",
      expectedContentLength: data.count, textEncodingName: "utf-8")
    task.didReceive(response)
    task.didReceive(data)
    task.didFinish()
  }
  func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}
