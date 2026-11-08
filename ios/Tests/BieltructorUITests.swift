import XCTest

final class BieltructorUITests: XCTestCase {
  func testGameAndTouchControlsInBothOrientations() throws {
    let app = XCUIApplication()
    app.launchArguments = ["--smoke-test"]
    XCUIDevice.shared.orientation = .landscapeLeft
    app.launch()
    let result = app.staticTexts["smoke-result"]
    XCTAssertTrue(result.waitForExistence(timeout: 45))
    XCTAssertEqual(result.label, "Tests passed")
    app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Continuar aventura")).firstMatch.tap()
    XCTAssertTrue(app.buttons["Saltar"].waitForExistence(timeout: 5))
    app.buttons["Avançar"].press(forDuration: 0.5)
    app.buttons["Saltar"].tap()
    XCTAssertTrue(app.buttons["Construir"].isHittable)
    app.buttons["Mochila"].tap()
    XCTAssertTrue(app.buttons["Voltar"].waitForExistence(timeout: 5))
    app.buttons["Voltar"].tap()
    XCTAssertTrue(app.buttons["Saltar"].waitForExistence(timeout: 5))
    XCUIDevice.shared.orientation = .portrait
    XCTAssertTrue(app.buttons["Partir"].isHittable)
    XCTAssertTrue(app.buttons["Saltar"].isHittable)
    app.buttons["Uma pequena pausa"].tap()
    XCTAssertTrue(app.buttons["Voltar à aventura"].waitForExistence(timeout: 5))
    app.buttons["Voltar à aventura"].tap()
    let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
    shot.lifetime = .keepAlways
    add(shot)
  }
}
