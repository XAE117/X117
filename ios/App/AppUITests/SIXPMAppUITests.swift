import XCTest

final class SIXPMAppUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testCatalogRecoveryKeepsSupportAndDeniedLocationReachable() throws {
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

        let locationDenied = app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] %@", "not allowed")).firstMatch
        XCTAssertTrue(
            locationDenied.waitForExistence(timeout: 5),
            "A denied location permission must be visible without presenting another request.\n\n\(app.debugDescription)"
        )
        let locationGuidance = app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] %@", "location is off")).firstMatch
        XCTAssertTrue(
            locationGuidance.exists,
            "Location denial must explain that the user can opt back in through iPhone Settings."
        )
    }
}
