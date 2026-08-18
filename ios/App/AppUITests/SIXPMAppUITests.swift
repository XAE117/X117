import XCTest

final class SIXPMAppUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    private func button(named label: String, in app: XCUIApplication) -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "label ==[c] %@", label)).firstMatch
    }

    private func reminderSafeFilmButton(in app: XCUIApplication) -> XCUIElement? {
        let candidates = app.buttons.matching(NSPredicate(
            format: "label CONTAINS[c] %@ AND label CONTAINS[c] %@",
            "AMC",
            "PM"
        )).allElementsBoundByIndex
        let regex = try? NSRegularExpression(pattern: "([A-Z][a-z]{2}, [A-Z][a-z]{2} [0-9]{1,2})[\\s\\S]*?([0-9]{1,2}:[0-9]{2} [AP]M)")
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "America/Los_Angeles")
        formatter.dateFormat = "EEE, MMM d yyyy h:mm a"
        let earliestReminderSafeStart = Date().addingTimeInterval(2 * 60 * 60)

        for candidate in candidates {
            let label = candidate.label
            let range = NSRange(label.startIndex..., in: label)
            guard let match = regex?.firstMatch(in: label, range: range), match.numberOfRanges == 3,
                  let dateRange = Range(match.range(at: 1), in: label),
                  let timeRange = Range(match.range(at: 2), in: label) else {
                continue
            }
            let value = "\(label[dateRange]) \(Calendar.current.component(.year, from: Date())) \(label[timeRange])"
            if let startAt = formatter.date(from: value), startAt >= earliestReminderSafeStart {
                return candidate
            }
        }
        return nil
    }

    private func bringIntoView(_ element: XCUIElement, in app: XCUIApplication) -> Bool {
        for _ in 0..<16 {
            if element.exists && element.isHittable { return true }
            app.swipeUp()
        }
        return element.exists && element.isHittable
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

    func testNativeReminderLifecycleWithLocalCatalog() throws {
#if SIXPM_NATIVE_ACTION_QA

        let app = XCUIApplication(bundleIdentifier: "com.xae117.sixpm.qa")
        app.launch()

        let allCinema = button(named: "All cinema", in: app)
        XCTAssertTrue(
            allCinema.waitForExistence(timeout: 15),
            "The local rights-gated catalog should render its editorial home.\n\n\(app.debugDescription)"
        )
        allCinema.tap()

        guard let film = reminderSafeFilmButton(in: app) else {
            XCTFail("The current local catalog has no rendered AMC showing at least two hours ahead.")
            return
        }
        XCTAssertTrue(bringIntoView(film, in: app), "A reminder-safe AMC showing must be reachable in the Cinema index.")
        film.tap()

        let currentShowtime = app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] %@", "current showtime")).firstMatch
        XCTAssertTrue(
            currentShowtime.waitForExistence(timeout: 5),
            "Selecting a cinema listing must open its current-showtime detail.\n\n\(app.debugDescription)"
        )

        let addFilm = button(named: "Add film to evening", in: app)
        XCTAssertTrue(addFilm.waitForExistence(timeout: 5), "A selected showing must be addable to an evening.\n\n\(app.debugDescription)")
        addFilm.tap()

        let dinner = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "Tacos")).firstMatch
        XCTAssertTrue(dinner.waitForExistence(timeout: 5), "The approved editorial dinner must be selectable after holding a film.")
        XCTAssertTrue(bringIntoView(dinner, in: app), "The approved editorial dinner must be reachable in the Dinner notebook.")
        dinner.tap()

        let addDinner = button(named: "Add dinner to evening", in: app)
        XCTAssertTrue(addDinner.waitForExistence(timeout: 5), "A selected dinner must be addable to an evening.")
        addDinner.tap()

        let save = button(named: "Save this evening", in: app)
        XCTAssertTrue(save.waitForExistence(timeout: 5), "A valid film/dinner pair must reach the saved-evening review.")
        save.tap()

        let reminder = button(named: "Remind me 90 minutes before", in: app)
        XCTAssertTrue(reminder.waitForExistence(timeout: 5), "A sufficiently future showing must offer a local reminder.")
        reminder.tap()

        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let allow = springboard.buttons.matching(NSPredicate(format: "label == %@", "Allow")).firstMatch
        XCTAssertTrue(
            allow.waitForExistence(timeout: 5),
            "The user-initiated reminder must trigger the real iOS notification permission control.\n\n\(springboard.debugDescription)"
        )
        allow.tap()

        let scheduled = app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] %@", "local reminder is set")).firstMatch
        XCTAssertTrue(
            scheduled.waitForExistence(timeout: 10),
            "After system approval, the Capacitor plugin must schedule the local reminder and return a user-facing confirmation.\n\n\(app.debugDescription)"
        )

        let removeReminder = button(named: "Remove reminder", in: app)
        XCTAssertTrue(removeReminder.waitForExistence(timeout: 5), "A scheduled reminder must expose its cancellation action.")
        removeReminder.tap()

        let removed = app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] %@", "local reminder was removed")).firstMatch
        XCTAssertTrue(removed.waitForExistence(timeout: 5), "The scheduled reminder must be cancellable through the native plugin.")
        XCTAssertTrue(reminder.waitForExistence(timeout: 5), "After cancellation, the user must be able to set a new reminder.")
#else
        throw XCTSkip("Runs only through the explicit disposable-simulator native-action QA command.")
#endif
    }
}
