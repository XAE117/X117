import XCTest

final class SIXPMAppUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testFreshCatalogRecoveryKeepsSupportAndLocationDenialReachable() throws {
        let app = XCUIApplication()
        app.launch()

        let unavailable = app.staticTexts["Catalog unavailable."]
        XCTAssertTrue(
            unavailable.waitForExistence(timeout: 15),
            "A fresh native launch should present the user-facing catalog recovery state."
        )

        let retry = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "try again")).firstMatch
        XCTAssertTrue(
            retry.waitForExistence(timeout: 5),
            "The catalog recovery action must be available in the native accessibility tree.\n\n\(app.debugDescription)"
        )
        XCTAssertTrue(retry.isHittable, "The catalog recovery action must be tappable.")
        XCTAssertGreaterThanOrEqual(retry.frame.height, 44)
        XCTAssertGreaterThanOrEqual(retry.frame.width, 44)

        let notes = app.buttons.matching(NSPredicate(format: "label == %@", "NOTES")).firstMatch
        XCTAssertTrue(
            notes.waitForExistence(timeout: 5),
            "The field index must remain available when the catalog is unavailable.\n\n\(app.debugDescription)"
        )
        notes.tap()
        let policies = app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] %@", "policies")).firstMatch
        XCTAssertTrue(
            policies.waitForExistence(timeout: 5),
            "Privacy, terms, credits, and support must remain reachable without a catalog."
        )

        let useLocation = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "use my location")).firstMatch
        XCTAssertTrue(
            useLocation.waitForExistence(timeout: 5),
            "A fresh app must expose a user-initiated location action from App Notes."
        )

        useLocation.tap()
        let denialPredicate = NSPredicate(format: "label == %@ OR label == %@", "Don't Allow", "Don’t Allow")
        let appDenial = app.buttons.matching(denialPredicate).firstMatch
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let systemDenial = springboard.buttons.matching(denialPredicate).firstMatch
        if appDenial.waitForExistence(timeout: 5) {
            appDenial.tap()
        } else {
            XCTAssertTrue(
                systemDenial.waitForExistence(timeout: 5),
                "The explicit location request must present a system denial option."
            )
            systemDenial.tap()
        }

        let locationGuidance = app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] %@", "location is off")).firstMatch
        XCTAssertTrue(
            locationGuidance.waitForExistence(timeout: 5),
            "Location denial must explain that the user can opt back in through iPhone Settings."
        )
        XCTAssertFalse(useLocation.exists, "A denied permission must not leave an automatic re-prompt action behind.")
    }
}
