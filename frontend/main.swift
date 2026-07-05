import SwiftUI
import AppKit
import AVFoundation
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
class SpeechManager: NSObject, AVSpeechSynthesizerDelegate, ObservableObject {
    let synthesizer = AVSpeechSynthesizer()
    @Published var isSpeaking = false
    var onSpeakingStateChanged: ((Bool) -> Void)?
    
    override init() {
        super.init()
        synthesizer.delegate = self
    }
    
    func speak(_ text: String) {
        // Stop any current speech
        stop()
        
        let utterance = AVSpeechUtterance(string: text)
        // Try to find a high-quality Siri voice, otherwise fallback to default
        if let siriVoice = AVSpeechSynthesisVoice(language: "en-US") {
            utterance.voice = siriVoice
        }
        utterance.rate = 0.52 // Balanced reading speed
        utterance.pitchMultiplier = 1.0
        utterance.volume = 1.0
        
        synthesizer.speak(utterance)
    }
    
    func stop() {
        synthesizer.stopSpeaking(at: .immediate)
    }
    
    // Delegate methods
    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didStart utterance: AVSpeechUtterance) {
        DispatchQueue.main.async {
            self.isSpeaking = true
            self.onSpeakingStateChanged?(true)
        }
    }
    
    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        DispatchQueue.main.async {
            self.isSpeaking = false
            self.onSpeakingStateChanged?(false)
        }
    }
    
    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        DispatchQueue.main.async {
            self.isSpeaking = false
            self.onSpeakingStateChanged?(false)
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
                    SiriOrbView(state: currentState)
                }
                .buttonStyle(PlainButtonStyle())
                
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
    
    @State private var rotateAngle: Double = 0
    @State private var offset1 = CGSize.zero
    @State private var offset2 = CGSize.zero
    @State private var offset3 = CGSize.zero
    @State private var offset4 = CGSize.zero
    
    var body: some View {
        ZStack {
            // Ripple Background effects for listening/speaking states
            if state == .listening || state == .speaking {
                Circle()
                    .stroke(LinearGradient(colors: [Color.pink.opacity(0.3), Color.blue.opacity(0.1)], startPoint: .topLeading, endPoint: .bottomTrailing), lineWidth: 2)
                    .scaleEffect(state == .listening ? 1.5 : 1.3)
                    .opacity(0.0)
                    .animateRipple(duration: state == .listening ? 1.2 : 1.8)
                
                Circle()
                    .stroke(LinearGradient(colors: [Color.purple.opacity(0.2), Color.cyan.opacity(0.2)], startPoint: .topLeading, endPoint: .bottomTrailing), lineWidth: 1.5)
                    .scaleEffect(state == .listening ? 1.8 : 1.5)
                    .opacity(0.0)
                    .animateRipple(duration: state == .listening ? 1.5 : 2.2, delay: 0.4)
            }
            
            // Primary Glowing Orb Blur
            ZStack {
                // Blob 1: Pink/Magenta
                Circle()
                    .fill(Color(red: 1.0, green: 0.1, blue: 0.6))
                    .frame(width: 42, height: 42)
                    .offset(offset1)
                    
                // Blob 2: Cyan/Blue
                Circle()
                    .fill(Color(red: 0.0, green: 0.8, blue: 1.0))
                    .frame(width: 44, height: 44)
                    .offset(offset2)
                    
                // Blob 3: Royal Blue
                Circle()
                    .fill(Color(red: 0.1, green: 0.3, blue: 1.0))
                    .frame(width: 40, height: 40)
                    .offset(offset3)
                    
                // Blob 4: Bright Purple
                Circle()
                    .fill(Color(red: 0.6, green: 0.1, blue: 1.0))
                    .frame(width: 38, height: 38)
                    .offset(offset4)
            }
            .blendMode(.screen)
            .filterBlur(radius: 12)
            .rotationEffect(.degrees(rotateAngle))
            .scaleEffect(scaleFactor)
            .animation(.spring(response: 0.5, dampingFraction: 0.6), value: state)
            
            // Core Highlight (a bright central sphere to add depth)
            Circle()
                .fill(RadialGradient(
                    gradient: Gradient(colors: [.white.opacity(0.8), .clear]),
                    center: .center,
                    startRadius: 0,
                    endRadius: 20
                ))
                .frame(width: 45, height: 45)
                .blendMode(.plusLighter)
        }
        .frame(width: 70, height: 70)
        .background(
            Circle()
                .fill(Color.black.opacity(0.45))
                .shadow(color: shadowColor.opacity(0.4), radius: 8, x: 0, y: 4)
        )
        .onAppear {
            startLoopingAnimations()
        }
    }
    
    // Scale factor depending on Assistant State
    private var scaleFactor: CGFloat {
        switch state {
        case .idle:
            return 1.0
        case .listening:
            return 1.25
        case .thinking:
            return 1.12
        case .speaking:
            return 1.18
        }
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
