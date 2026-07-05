import SwiftUI
import AppKit
@preconcurrency import AVFoundation
import Combine

// MARK: - Models & Enums

enum Sender {
    case user
    case assistant
}

struct ChatMessage: Identifiable {
    let id = UUID()
    let sender: Sender
    let text: String
}

enum AssistantState {
    case idle
    case listening
    case thinking
    case speaking
}

// MARK: - Main Application Entry

@main
struct SiriAssistantApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    
    var body: some Scene {
        Settings {
            EmptyView()
        }
    }
}

// MARK: - Shared Application State

class AppState: ObservableObject {
    static let shared = AppState()
    @Published var isChatOpen = false
}

// MARK: - Custom NSHostingView with Pixel-Level Hit Testing (Click-Through)

class ClickThroughHostingView<Content: View>: NSHostingView<Content> {
    override func hitTest(_ point: NSPoint) -> NSView? {
        // Point is in window coordinates (0,0 at bottom-left of the 380x520 window).
        
        // 1. Check if the click is on the Siri Orb button (positioned at the bottom left)
        let orbRect = NSRect(x: 10, y: 10, width: 80, height: 80)
        if orbRect.contains(point) {
            return super.hitTest(point)
        }
        
        // 2. Check if the click is on the Chat Panel overlay (if it is currently open)
        // Chat panel is 350 wide, 410 high, starts at padding 15 on leading, and above bottom row.
        if AppState.shared.isChatOpen {
            let chatRect = NSRect(x: 15, y: 95, width: 350, height: 410)
            if chatRect.contains(point) {
                return super.hitTest(point)
            }
        }
        
        // Clicks in all other transparent/empty window areas pass directly through to background apps
        return nil
    }
}

// MARK: - App Delegate & Window Controller

class BorderlessWindow: NSWindow {
    override var canBecomeKey: Bool {
        return true
    }
}

class AppDelegate: NSObject, NSApplicationDelegate, ObservableObject {
    static var shared: AppDelegate!
    var window: NSWindow!
    
    override init() {
        super.init()
        AppDelegate.shared = self
    }
    
    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)
        
        let screenFrame = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 800, height: 600)
        
        // Fixed window dimensions designed to contain the chat box without frame updates
        let windowWidth: CGFloat = 380
        let windowHeight: CGFloat = 520
        let padding: CGFloat = 20
        
        let contentRect = NSRect(
            x: screenFrame.minX + padding,
            y: screenFrame.minY + padding,
            width: windowWidth,
            height: windowHeight
        )
        
        window = BorderlessWindow(
            contentRect: contentRect,
            styleMask: [.borderless],
            backing: .buffered,
            defer: false
        )
        
        window.isOpaque = false
        window.backgroundColor = .clear
        window.hasShadow = false
        window.level = .floating // Stay on top of other windows
        window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        
        let mainView = MainView()
        let contentView = ClickThroughHostingView(rootView: mainView)
        window.contentView = contentView
        
        window.makeKeyAndOrderFront(nil)
    }
}

// MARK: - Native Mac Glassmorphism View

struct VisualEffectView: NSViewRepresentable {
    var material: NSVisualEffectView.Material = .hudWindow
    var blendingMode: NSVisualEffectView.BlendingMode = .behindWindow
    
    func makeNSView(context: Context) -> NSVisualEffectView {
        let view = NSVisualEffectView()
        view.material = material
        view.blendingMode = blendingMode
        view.state = .active
        return view
    }
    
    func updateNSView(_ nsView: NSVisualEffectView, context: Context) {
        nsView.material = material
        nsView.blendingMode = blendingMode
    }
}

// MARK: - Speech Manager (TTS)

@MainActor
class SpeechManager: NSObject, AVAudioPlayerDelegate, ObservableObject {
    @Published var isSpeaking = false
    @Published var audioLevel: CGFloat = 0.0
    var onSpeakingStateChanged: ((Bool) -> Void)?
    
    private var audioPlayer: AVAudioPlayer?
    private var downloadTask: Task<Void, Never>?
    private var levelTimer: Timer?
    
    func speak(_ text: String) {
        stop()
        
        // Fetch audio asynchronously from the Kokoro TTS service
        downloadTask = Task {
            var urlComponents = URLComponents(string: "http://100.105.203.102:8998/tts")!
            urlComponents.queryItems = [
                URLQueryItem(name: "api_key", value: "kokoro_sk_efb4338eb47b6d5b3d3886d1dbab4aa7"),
                URLQueryItem(name: "text", value: text)
            ]
            
            guard let url = urlComponents.url else { return }
            
            do {
                let (data, _) = try await URLSession.shared.data(from: url)
                
                if !Task.isCancelled {
                    self.playAudio(data: data)
                }
            } catch {
                print("Error fetching Kokoro TTS: \(error.localizedDescription)")
            }
        }
    }
    
    private func playAudio(data: Data) {
        do {
            audioPlayer = try AVAudioPlayer(data: data)
            audioPlayer?.delegate = self
            audioPlayer?.isMeteringEnabled = true
            audioPlayer?.prepareToPlay()
            if audioPlayer?.play() == true {
                self.isSpeaking = true
                self.onSpeakingStateChanged?(true)
                
                // Monitor audio levels at 30 FPS
                levelTimer = Timer.scheduledTimer(withTimeInterval: 0.03, repeats: true) { [weak self] _ in
                    guard let self = self else { return }
                    Task { @MainActor in
                        guard let player = self.audioPlayer, player.isPlaying else { return }
                        player.updateMeters()
                        let power = player.averagePower(forChannel: 0)
                        
                        // Map power from -60..0 dB to 0.0..1.0 range
                        let level: CGFloat
                        if power < -60 {
                            level = 0.0
                        } else if power >= 0 {
                            level = 1.0
                        } else {
                            level = CGFloat((power + 60) / 60)
                        }
                        
                        withAnimation(.linear(duration: 0.03)) {
                            self.audioLevel = level
                        }
                    }
                }
            }
        } catch {
            print("Error playing audio: \(error.localizedDescription)")
        }
    }
    
    func stop() {
        downloadTask?.cancel()
        downloadTask = nil
        
        levelTimer?.invalidate()
        levelTimer = nil
        audioLevel = 0.0
        
        audioPlayer?.stop()
        audioPlayer = nil
        
        if isSpeaking {
            isSpeaking = false
            onSpeakingStateChanged?(false)
        }
    }
    
    // MARK: - AVAudioPlayerDelegate
    
    nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        DispatchQueue.main.async {
            self.isSpeaking = false
            self.onSpeakingStateChanged?(false)
            self.audioPlayer = nil
            self.levelTimer?.invalidate()
            self.levelTimer = nil
            self.audioLevel = 0.0
        }
    }
    
    nonisolated func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        DispatchQueue.main.async {
            self.isSpeaking = false
            self.onSpeakingStateChanged?(false)
            self.audioPlayer = nil
            self.levelTimer?.invalidate()
            self.levelTimer = nil
            self.audioLevel = 0.0
        }
    }
}

// MARK: - Main Application View

struct MainView: View {
    @ObservedObject var appState = AppState.shared
    @State private var currentState: AssistantState = .idle
    @State private var statusMessage = "Ready"
    @State private var promptText = ""
    @State private var chatHistory: [ChatMessage] = [
        ChatMessage(sender: .assistant, text: "Hello! I am your local computer personal assistant. How can I help you today?")
    ]
    @State private var isSpeechEnabled = true
    @StateObject private var speechManager = SpeechManager()
    
    @State private var dragStartMouseLocation: NSPoint = .zero
    @State private var dragStartWindowOrigin: NSPoint = .zero
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if appState.isChatOpen {
                // Glassmorphic Chat Panel
                ChatPanelView(
                    chatHistory: $chatHistory,
                    promptText: $promptText,
                    statusMessage: $statusMessage,
                    isSpeechEnabled: $isSpeechEnabled,
                    currentState: $currentState,
                    onSendMessage: { message in
                        Task {
                            await sendMessageToBackend(message)
                        }
                    }
                )
                .transition(.asymmetric(
                    insertion: .scale(scale: 0.8, anchor: .bottomLeading).combined(with: .opacity),
                    removal: .scale(scale: 0.8, anchor: .bottomLeading).combined(with: .opacity)
                ))
            }
            
            // Bottom Bar: Siri Orb and Small Actions
            HStack(spacing: 12) {
                // The Siri Circle Button
                Button(action: {
                    if appState.isChatOpen {
                        // Close Chat Panel
                        withAnimation(.spring(response: 0.4, dampingFraction: 0.75)) {
                            appState.isChatOpen = false
                        }
                        speechManager.stop()
                        if currentState == .speaking {
                            currentState = .idle
                            statusMessage = "Ready"
                        }
                    } else {
                        // Open Chat Panel
                        withAnimation(.spring(response: 0.4, dampingFraction: 0.75)) {
                            appState.isChatOpen = true
                        }
                    }
                }) {
                    SiriOrbView(state: currentState, audioLevel: speechManager.audioLevel)
                }
                .buttonStyle(PlainButtonStyle())
                .gesture(
                    DragGesture(minimumDistance: 5)
                        .onChanged { value in
                            if let window = AppDelegate.shared.window {
                                let currentMouse = NSEvent.mouseLocation
                                if dragStartMouseLocation == .zero {
                                    dragStartMouseLocation = currentMouse
                                    dragStartWindowOrigin = window.frame.origin
                                } else {
                                    let dx = currentMouse.x - dragStartMouseLocation.x
                                    let dy = currentMouse.y - dragStartMouseLocation.y
                                    let newOrigin = NSPoint(
                                        x: dragStartWindowOrigin.x + dx,
                                        y: dragStartWindowOrigin.y + dy
                                    )
                                    window.setFrameOrigin(newOrigin)
                                }
                            }
                        }
                        .onEnded { _ in
                            dragStartMouseLocation = .zero
                            dragStartWindowOrigin = .zero
                        }
                )
                
                if appState.isChatOpen {
                    // Current Status indicator text next to the orb
                    Text(statusMessage)
                        .font(.system(.footnote, design: .rounded))
                        .fontWeight(.medium)
                        .foregroundColor(.white.opacity(0.7))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.white.opacity(0.08))
                        .cornerRadius(12)
                        .transition(.opacity)
                }
                Spacer()
            }
            .frame(height: 70)
        }
        .padding(15)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
        .onAppear {
            speechManager.onSpeakingStateChanged = { isSpeaking in
                if isSpeaking {
                    self.currentState = .speaking
                    self.statusMessage = "Speaking..."
                } else {
                    if self.currentState == .speaking {
                        self.currentState = .idle
                        self.statusMessage = "Ready"
                    }
                }
            }
        }
    }
    
    // MARK: - Backend Connection Logic
    
    private func sendMessageToBackend(_ message: String) async {
        guard !message.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        
        await MainActor.run {
            self.currentState = .thinking
            self.statusMessage = "Reasoning loop..."
            self.chatHistory.append(ChatMessage(sender: .user, text: message))
            self.promptText = ""
        }
        
        guard let url = URL(string: "http://localhost:3000/api/chat") else {
            await MainActor.run {
                self.currentState = .idle
                self.statusMessage = "API Error"
                self.chatHistory.append(ChatMessage(sender: .assistant, text: "Error: Invalid backend service URL."))
            }
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 300.0 // 5 minutes timeout for agentic loops
        
        let payload = ["prompt": message]
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                throw NSError(domain: "Server Error", code: 500, userInfo: nil)
            }
            
            var reply = ""
            if let decoded = try? JSONDecoder().decode(String.self, from: data) {
                reply = decoded
            } else if let raw = String(data: data, encoding: .utf8) {
                // Sometimes backend might send un-escaped JSON string, fallback to reading raw UTF8
                reply = raw
                // Strip leading/trailing quotes if it's a simple JSON string response
                if reply.hasPrefix("\"") && reply.hasSuffix("\"") && reply.count >= 2 {
                    reply = String(reply.dropFirst().dropLast())
                }
            } else {
                reply = "Error parsing response data."
            }
            
            // Clean up backslash escapes from JSON serialization if they slipped through
            reply = reply
                .replacingOccurrences(of: "\\n", with: "\n")
                .replacingOccurrences(of: "\\\"", with: "\"")
            
            await MainActor.run {
                self.chatHistory.append(ChatMessage(sender: .assistant, text: reply))
                self.currentState = .speaking
                self.statusMessage = "Speaking..."
                
                if isSpeechEnabled {
                    speechManager.speak(reply)
                } else {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                        if self.currentState == .speaking {
                            self.currentState = .idle
                            self.statusMessage = "Ready"
                        }
                    }
                }
            }
        } catch {
            await MainActor.run {
                self.currentState = .idle
                self.statusMessage = "Offline"
                self.chatHistory.append(ChatMessage(sender: .assistant, text: "Could not connect to the backend agent server. Ensure the Node.js backend is running at http://localhost:3000"))
            }
        }
    }
}

// MARK: - Siri-like Pulsing Orb View

struct SiriOrbView: View {
    let state: AssistantState
    let audioLevel: CGFloat
    
    @State private var rotateAngle: Double = 0
    @State private var offset1 = CGSize.zero
    @State private var offset2 = CGSize.zero
    @State private var offset3 = CGSize.zero
    @State private var offset4 = CGSize.zero
    
    private func dynamicOffset(_ baseOffset: CGSize, index: Int) -> CGSize {
        if state == .speaking {
            let multiplier = 1.0 + audioLevel * 1.6
            let angle = Double(index) * Double.pi / 2.0
            let dx = cos(angle) * Double(audioLevel) * 16.0
            let dy = sin(angle) * Double(audioLevel) * 16.0
            return CGSize(width: baseOffset.width * multiplier + dx, height: baseOffset.height * multiplier + dy)
        }
        return baseOffset
    }
    
    var body: some View {
        ZStack {
            // Dynamic, thin, sharp neon rings extending outside the orb
            if state == .listening || state == .speaking {
                // Ring 1 (Thin, sharp, neon cyan)
                Circle()
                    .stroke(
                        LinearGradient(
                            colors: [Color.cyan.opacity(0.6), Color.blue.opacity(0.1), Color.purple.opacity(0.4)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1.0
                    )
                    .scaleEffect(1.0 + (state == .listening ? 0.4 : audioLevel * 0.7))
                    .opacity(state == .listening ? 0.35 : Double(0.2 + audioLevel * 0.6))
                    .rotationEffect(.degrees(-rotateAngle * 1.5))
                
                // Ring 2 (Thin, sharp, neon pink)
                Circle()
                    .stroke(
                        LinearGradient(
                            colors: [Color.pink.opacity(0.55), Color.clear, Color.cyan.opacity(0.35)],
                            startPoint: .bottomLeading,
                            endPoint: .topTrailing
                        ),
                        lineWidth: 0.8
                    )
                    .scaleEffect(1.0 + (state == .listening ? 0.75 : audioLevel * 1.1))
                    .opacity(state == .listening ? 0.25 : Double(0.15 + audioLevel * 0.5))
                    .rotationEffect(.degrees(rotateAngle * 2.0))

                // Ring 3 (Outer fading orbit)
                Circle()
                    .stroke(
                        LinearGradient(
                            colors: [Color.purple.opacity(0.35), Color.pink.opacity(0.15)],
                            startPoint: .top,
                            endPoint: .bottom
                        ),
                        lineWidth: 0.5
                    )
                    .scaleEffect(1.0 + (state == .listening ? 1.1 : audioLevel * 1.5))
                    .opacity(state == .listening ? 0.2 : Double(0.08 + audioLevel * 0.4))
                    .rotationEffect(.degrees(-rotateAngle * 0.8))
            }
            
            // 3D Glass Sphere Container
            ZStack {
                // 1. Solid dark background for volume
                Circle()
                    .fill(Color.black.opacity(0.85))
                
                // 2. Base Radial 3D Sphere Shading
                Circle()
                    .fill(RadialGradient(
                        gradient: Gradient(colors: [Color.white.opacity(0.15), Color.black.opacity(0.95)]),
                        center: .init(x: 0.35, y: 0.35),
                        startRadius: 0,
                        endRadius: 40
                    ))
                    .blendMode(.multiply)
                
                // 3. Colorful Glowing Blurred Blobs
                ZStack {
                    // Blob 1: Pink/Magenta
                    Circle()
                        .fill(Color(red: 1.0, green: 0.1, blue: 0.6))
                        .frame(width: 46 + audioLevel * 14, height: 46 + audioLevel * 14)
                        .offset(dynamicOffset(offset1, index: 1))
                        
                    // Blob 2: Cyan/Blue
                    Circle()
                        .fill(Color(red: 0.0, green: 0.8, blue: 1.0))
                        .frame(width: 48 + audioLevel * 12, height: 48 + audioLevel * 12)
                        .offset(dynamicOffset(offset2, index: 2))
                        
                    // Blob 3: Royal Blue
                    Circle()
                        .fill(Color(red: 0.1, green: 0.3, blue: 1.0))
                        .frame(width: 44 + audioLevel * 16, height: 44 + audioLevel * 16)
                        .offset(dynamicOffset(offset3, index: 3))
                        
                    // Blob 4: Bright Purple
                    Circle()
                        .fill(Color(red: 0.6, green: 0.1, blue: 1.0))
                        .frame(width: 42 + audioLevel * 14, height: 42 + audioLevel * 14)
                        .offset(dynamicOffset(offset4, index: 4))
                }
                .blendMode(.screen)
                .filterBlur(radius: 20)
                .rotationEffect(.degrees(rotateAngle))
                
                // 4. Concentric optical diffraction rings (internal texture)
                Circle()
                    .stroke(Color.white.opacity(0.12), lineWidth: 0.5)
                    .padding(4)
                Circle()
                    .stroke(Color.white.opacity(0.08), lineWidth: 0.5)
                    .padding(10)
                Circle()
                    .stroke(Color.white.opacity(0.05), lineWidth: 0.5)
                    .padding(18)
                
                // 5. Glossy Highlight Overlay to simulate 3D light reflection
                Circle()
                    .fill(
                        RadialGradient(
                            gradient: Gradient(colors: [.white.opacity(0.38 + Double(audioLevel) * 0.15), .clear]),
                            center: .init(x: 0.3, y: 0.3), // Top-left light source
                            startRadius: 0,
                            endRadius: 28 + audioLevel * 10
                        )
                    )
                    .blendMode(.plusLighter)
                
                // 6. Secondary bottom reflection for glass thickness look (bounce light)
                Circle()
                    .fill(
                        RadialGradient(
                            gradient: Gradient(colors: [Color.cyan.opacity(0.25 + Double(audioLevel) * 0.2), .clear]),
                            center: .init(x: 0.7, y: 0.7), // Bottom-right bounce light
                            startRadius: 0,
                            endRadius: 25
                        )
                    )
                    .blendMode(.plusLighter)
                
                // 7. Translucent Glass Outer Rim Border
                Circle()
                    .stroke(
                        LinearGradient(
                            colors: [.white.opacity(0.6), .clear, .white.opacity(0.2)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1.2
                    )
                    .blendMode(.overlay)
            }
            .clipShape(Circle()) // Clip content to clean circular boundary
            .scaleEffect(scaleFactor)
            .animation(.spring(response: 0.5, dampingFraction: 0.6), value: state)
        }
        .frame(width: 70, height: 70)
        .background(
            Circle()
                .fill(Color.black.opacity(0.1))
                .shadow(color: shadowColor.opacity(0.5 + Double(audioLevel) * 0.3), radius: 12 + audioLevel * 12, x: 0, y: 6)
        )
        .onAppear {
            startLoopingAnimations()
        }
    }
    
    // Scale factor depending on Assistant State
    private var scaleFactor: CGFloat {
        let base: CGFloat
        switch state {
        case .idle: base = 1.0
        case .listening: base = 1.25
        case .thinking: base = 1.12
        case .speaking: base = 1.18
        }
        if state == .speaking {
            return base + audioLevel * 0.35
        }
        return base
    }
    
    // Color of the shadow based on current state
    private var shadowColor: Color {
        switch state {
        case .idle: return .purple
        case .listening: return .red
        case .thinking: return .cyan
        case .speaking: return .blue
        }
    }
    
    private func startLoopingAnimations() {
        // Blob 1 Animation
        withAnimation(.easeInOut(duration: 4.5).repeatForever(autoreverses: true)) {
            offset1 = CGSize(width: -12, height: 8)
        }
        // Blob 2 Animation
        withAnimation(.easeInOut(duration: 3.8).repeatForever(autoreverses: true)) {
            offset2 = CGSize(width: 12, height: -10)
        }
        // Blob 3 Animation
        withAnimation(.easeInOut(duration: 5.2).repeatForever(autoreverses: true)) {
            offset3 = CGSize(width: -8, height: -12)
        }
        // Blob 4 Animation
        withAnimation(.easeInOut(duration: 4.2).repeatForever(autoreverses: true)) {
            offset4 = CGSize(width: 10, height: 12)
        }
        
        // Continuous Rotation
        Timer.scheduledTimer(withTimeInterval: 0.02, repeats: true) { _ in
            let increment: Double
            switch state {
            case .idle: increment = 0.4
            case .listening: increment = 1.2
            case .thinking: increment = 3.5  // Spins quickly when thinking
            case .speaking: increment = 0.8
            }
            rotateAngle += increment
            if rotateAngle >= 360 {
                rotateAngle -= 360
            }
        }
    }
}

// Custom View Modifier for standard Ripple effect
struct RippleModifier: ViewModifier {
    let duration: Double
    let delay: Double
    @State private var progress: CGFloat = 0.0
    
    func body(content: Content) -> some View {
        content
            .scaleEffect(progress)
            .opacity(Double(1.0 - progress))
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                    withAnimation(.easeOut(duration: duration).repeatForever(autoreverses: false)) {
                        progress = 1.0
                    }
                }
            }
    }
}

extension View {
    func animateRipple(duration: Double, delay: Double = 0.0) -> some View {
        self.modifier(RippleModifier(duration: duration, delay: delay))
    }
    
    func filterBlur(radius: CGFloat) -> some View {
        // Blur filter wrapper for SwiftUI
        self.blur(radius: radius)
    }
}

// MARK: - Chat Panel View

struct ChatPanelView: View {
    @Binding var chatHistory: [ChatMessage]
    @Binding var promptText: String
    @Binding var statusMessage: String
    @Binding var isSpeechEnabled: Bool
    @Binding var currentState: AssistantState
    var onSendMessage: (String) -> Void
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Assistant")
                    .font(.system(.headline, design: .rounded))
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                
                Spacer()
                
                // Voice Response Output Toggle
                Button(action: {
                    isSpeechEnabled.toggle()
                }) {
                    Image(systemName: isSpeechEnabled ? "speaker.wave.2.fill" : "speaker.slash.fill")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(isSpeechEnabled ? .cyan : .white.opacity(0.4))
                        .padding(6)
                        .background(Color.white.opacity(isSpeechEnabled ? 0.12 : 0.04))
                        .clipShape(Circle())
                }
                .buttonStyle(PlainButtonStyle())
                .help(isSpeechEnabled ? "Speech Output Enabled" : "Speech Output Muted")
                
                // Clear History Button
                Button(action: {
                    chatHistory = [ChatMessage(sender: .assistant, text: "History cleared. How can I help you?")]
                }) {
                    Image(systemName: "trash")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.white.opacity(0.6))
                        .padding(6)
                        .background(Color.white.opacity(0.04))
                        .clipShape(Circle())
                }
                .buttonStyle(PlainButtonStyle())
                .help("Clear Chat")
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(Color.black.opacity(0.2))
            
            // Messages Scroller
            ScrollViewReader { proxy in
                ScrollView(.vertical, showsIndicators: true) {
                    VStack(alignment: .leading, spacing: 14) {
                        ForEach(chatHistory) { message in
                            HStack {
                                if message.sender == .user {
                                    Spacer()
                                    // User text bubble
                                    Text(message.text)
                                        .font(.system(.body, design: .rounded))
                                        .foregroundColor(.white)
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 10)
                                        .background(
                                            LinearGradient(
                                                colors: [Color.purple.opacity(0.4), Color.blue.opacity(0.4)],
                                                startPoint: .topLeading, endPoint: .bottomTrailing
                                            )
                                        )
                                        .cornerRadius(16)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 16)
                                                .stroke(Color.white.opacity(0.12), lineWidth: 1)
                                        )
                                        .frame(maxWidth: 270, alignment: .trailing)
                                } else {
                                    // Assistant text bubble
                                    VStack(alignment: .leading, spacing: 6) {
                                        markdownText(for: message.text)
                                            .font(.system(.body, design: .rounded))
                                            .foregroundColor(.white.opacity(0.95))
                                    }
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 10)
                                    .background(Color.black.opacity(0.25))
                                    .cornerRadius(16)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 16)
                                            .stroke(
                                                LinearGradient(
                                                    colors: [Color.cyan.opacity(0.3), Color.clear],
                                                    startPoint: .topLeading, endPoint: .bottomTrailing
                                                ),
                                                lineWidth: 1
                                            )
                                    )
                                    .frame(maxWidth: 270, alignment: .leading)
                                    Spacer()
                                }
                            }
                            .id(message.id)
                        }
                    }
                    .padding(16)
                }
                .onChange(of: chatHistory.count) {
                    if let last = chatHistory.last {
                        withAnimation {
                            proxy.scrollTo(last.id, anchor: .bottom)
                        }
                    }
                }
                .onAppear {
                    if let last = chatHistory.last {
                        proxy.scrollTo(last.id, anchor: .bottom)
                    }
                }
            }
            
            Divider()
                .background(Color.white.opacity(0.08))
            
            // Text Input / Action Bar
            HStack(spacing: 8) {
                TextField("Ask assistant...", text: $promptText, onCommit: {
                    submitMessage()
                })
                .textFieldStyle(PlainTextFieldStyle())
                .font(.system(.body, design: .rounded))
                .foregroundColor(.white)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Color.white.opacity(0.06))
                .cornerRadius(14)
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                )
                .onReceive(Just(promptText)) { _ in
                    // Adjust assistant state back and forth based on focus/typing if needed
                    if currentState == .idle && !promptText.isEmpty {
                        currentState = .listening
                        statusMessage = "Typing..."
                    } else if currentState == .listening && promptText.isEmpty {
                        currentState = .idle
                        statusMessage = "Ready"
                    }
                }
                
                // Submit Button
                Button(action: {
                    submitMessage()
                }) {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 28))
                        .foregroundColor(promptText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? .white.opacity(0.3) : .cyan)
                }
                .buttonStyle(PlainButtonStyle())
                .disabled(promptText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            .padding(12)
            .background(Color.black.opacity(0.15))
        }
        .frame(width: 350, height: 410)
        .background(VisualEffectView(material: .hudWindow, blendingMode: .behindWindow))
        .cornerRadius(24)
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(Color.white.opacity(0.15), lineWidth: 1.5)
        )
        .shadow(color: .black.opacity(0.5), radius: 15, x: 0, y: 10)
    }
    
    private func submitMessage() {
        let cleaned = promptText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleaned.isEmpty else { return }
        onSendMessage(cleaned)
    }
    
    // Simple markdown parsing helper
    private func markdownText(for text: String) -> Text {
        if let attributedString = try? AttributedString(markdown: text, options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)) {
            return Text(attributedString)
        }
        return Text(text)
    }
}
