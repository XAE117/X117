import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = SIXPMBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

final class SIXPMBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(SIXPMAccessibilityPlugin())
    }
}

@objc(SIXPMAccessibilityPlugin)
final class SIXPMAccessibilityPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "SIXPMAccessibilityPlugin"
    let jsName = "SIXPMAccessibility"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getContentSizeCategory", returnType: CAPPluginReturnPromise)
    ]

    private var contentSizeObserver: NSObjectProtocol?

    override func load() {
        contentSizeObserver = NotificationCenter.default.addObserver(
            forName: UIContentSizeCategory.didChangeNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            guard let self else { return }
            self.notifyListeners("contentSizeCategoryChange", data: self.payload())
        }
    }

    deinit {
        if let contentSizeObserver {
            NotificationCenter.default.removeObserver(contentSizeObserver)
        }
    }

    @objc func getContentSizeCategory(_ call: CAPPluginCall) {
        call.resolve(payload())
    }

    private func payload() -> [String: Any] {
        let category = bridge?.viewController?.traitCollection.preferredContentSizeCategory
            ?? UITraitCollection.current.preferredContentSizeCategory
        return [
            "category": category.rawValue,
            "scale": scale(for: category)
        ]
    }

    private func scale(for category: UIContentSizeCategory) -> Double {
        switch category {
        case .extraSmall: return 0.88
        case .small: return 0.94
        case .medium: return 0.98
        case .large: return 1.0
        case .extraLarge: return 1.12
        case .extraExtraLarge: return 1.24
        case .extraExtraExtraLarge: return 1.36
        case .accessibilityMedium: return 1.52
        case .accessibilityLarge: return 1.68
        case .accessibilityExtraLarge: return 1.84
        case .accessibilityExtraExtraLarge: return 2.0
        case .accessibilityExtraExtraExtraLarge: return 2.16
        default: return 1.0
        }
    }
}
