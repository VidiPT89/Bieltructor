import Foundation
import GameController
import WebKit

/// Reads a connected game controller (PlayStation, Xbox or MFi) and sends its
/// state to the game whenever it changes. The game turns it into actions.
final class GamepadBridge {
  private weak var web: WKWebView?
  private var timer: Timer?
  private var last = ""

  init(web: WKWebView) {
    self.web = web
    let timer = Timer(timeInterval: 1.0 / 60, repeats: true) { [weak self] _ in self?.poll() }
    RunLoop.main.add(timer, forMode: .common)
    self.timer = timer
  }

  deinit { timer?.invalidate() }

  private func poll() {
    guard let pad = GCController.controllers().first?.extendedGamepad else {
      if !last.isEmpty {
        last = ""
        send("null")
      }
      return
    }
    // The game expects "up" to be negative on the sticks.
    let state: [String: Any] = [
      "lx": pad.leftThumbstick.xAxis.value, "ly": -pad.leftThumbstick.yAxis.value,
      "rx": pad.rightThumbstick.xAxis.value, "ry": -pad.rightThumbstick.yAxis.value,
      "lt": pad.leftTrigger.value, "rt": pad.rightTrigger.value,
      "a": pad.buttonA.isPressed, "b": pad.buttonB.isPressed,
      "x": pad.buttonX.isPressed, "y": pad.buttonY.isPressed,
      "lb": pad.leftShoulder.isPressed, "rb": pad.rightShoulder.isPressed,
      "start": pad.buttonMenu.isPressed,
      "up": pad.dpad.up.isPressed, "down": pad.dpad.down.isPressed,
      "left": pad.dpad.left.isPressed, "right": pad.dpad.right.isPressed,
    ]
    guard let data = try? JSONSerialization.data(withJSONObject: state, options: [.sortedKeys]),
      let json = String(data: data, encoding: .utf8), json != last
    else { return }
    last = json
    send(json)
  }

  private func send(_ json: String) {
    web?.evaluateJavaScript("window.nativeGamepad?.(\(json))", completionHandler: nil)
  }
}
