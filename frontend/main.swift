import SwiftUI
import AppKit
@preconcurrency import AVFoundation
import Combine
import Speech

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

// MARK: - Speech Recognition Manager (STT with Auto-Send)

@MainActor
class SpeechRecognitionManager: ObservableObject {
    @Published var transcript: String = ""
    @Published var isRecording: Bool = false
    @Published var isAvailable: Bool = false
    
    var onAutoSend: ((String) -> Void)?
    
    private let speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()
    
    private var silenceTimer: Timer?
    private let silenceTimeout: TimeInterval = 1.5
    private var lastTranscriptUpdate: Date = Date()
    
    init() {
        requestAuthorization()
    }
    
    private func requestAuthorization() {
        SFSpeechRecognizer.requestAuthorization { [weak self] status in
            DispatchQueue.main.async {
                switch status {
                case .authorized:
                    self?.isAvailable = true
                case .denied, .restricted, .notDetermined:
                    self?.isAvailable = false
                @unknown default:
                    self?.isAvailable = false
                }
            }
        }
    }
    
    func startRecording() {
        // Cancel any existing task
        stopRecording(sendMessage: false)
        
        guard let speechRecognizer = speechRecognizer, speechRecognizer.isAvailable else {
            print("Speech recognizer not available")
            return
        }
        
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else { return }
        
        recognitionRequest.shouldReportPartialResults = true
        
        // Use on-device recognition if available
        if speechRecognizer.supportsOnDeviceRecognition {
            recognitionRequest.requiresOnDeviceRecognition = true
        }
        
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
            self?.recognitionRequest?.append(buffer)
        }
        
        recognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            guard let self = self else { return }
            
            Task { @MainActor in
                if let result = result {
                    self.transcript = result.bestTranscription.formattedString
                    self.lastTranscriptUpdate = Date()
                    self.resetSilenceTimer()
                }
                
                if error != nil || (result?.isFinal ?? false) {
                    if result?.isFinal == true && !self.transcript.isEmpty {
                        self.stopRecording(sendMessage: true)
                    } else if error != nil {
                        self.stopRecording(sendMessage: false)
                    }
                }
            }
        }
        
        audioEngine.prepare()
        do {
            try audioEngine.start()
            isRecording = true
            transcript = ""
            startSilenceTimer()
        } catch {
            print("Audio engine failed to start: \(error.localizedDescription)")
            stopRecording(sendMessage: false)
        }
    }
    
    func stopRecording(sendMessage: Bool) {
        silenceTimer?.invalidate()
        silenceTimer = nil
        
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        
        recognitionRequest?.endAudio()
        recognitionRequest = nil
        
        recognitionTask?.cancel()
        recognitionTask = nil
        
        let finalText = transcript.trimmingCharacters(in: .whitespacesAndNewlines)
        
        isRecording = false
        
        if sendMessage && !finalText.isEmpty {
            onAutoSend?(finalText)
            transcript = ""
        }
    }
    
    private func startSilenceTimer() {
        silenceTimer?.invalidate()
        silenceTimer = Timer.scheduledTimer(withTimeInterval: 0.3, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            Task { @MainActor in
                guard self.isRecording else {
                    self.silenceTimer?.invalidate()
                    return
                }
                
                let elapsed = Date().timeIntervalSince(self.lastTranscriptUpdate)
                if elapsed >= self.silenceTimeout && !self.transcript.isEmpty {
                    self.stopRecording(sendMessage: true)
                }
            }
        }
    }
    
    private func resetSilenceTimer() {
        lastTranscriptUpdate = Date()
    }
}

// MARK: - Wake Word Listener ("Friday")

@MainActor
class WakeWordListener: ObservableObject {
    @Published var isListening: Bool = false
    
    var onWakeWordDetected: (() -> Void)?
    
    private let speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()
    
    private var restartTimer: Timer?
    private var isPaused: Bool = false
    
    func startListening() {
        guard !isPaused else { return }
        guard let speechRecognizer = speechRecognizer, speechRecognizer.isAvailable else {
            // Retry after a delay
            DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) { [weak self] in
                self?.startListening()
            }
            return
        }
        
        stopListening()
        
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else { return }
        
        recognitionRequest.shouldReportPartialResults = true
        if speechRecognizer.supportsOnDeviceRecognition {
            recognitionRequest.requiresOnDeviceRecognition = true
        }
        
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
            self?.recognitionRequest?.append(buffer)
        }
        
        recognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            guard let self = self else { return }
            
            Task { @MainActor in
                if let result = result {
                    let spokenText = result.bestTranscription.formattedString.lowercased()
                    if spokenText.contains("friday") {
                        self.stopListening()
                        self.onWakeWordDetected?()
                        return
                    }
                }
                
                if error != nil {
                    // Recognition session ended, restart after a short delay
                    self.stopListening()
                    if !self.isPaused {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
                            self?.startListening()
                        }
                    }
                }
            }
        }
        
        audioEngine.prepare()
        do {
            try audioEngine.start()
            isListening = true
        } catch {
            print("Wake word audio engine failed: \(error.localizedDescription)")
            // Retry
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { [weak self] in
                self?.startListening()
            }
        }
        
        // Restart recognition every 15 seconds to keep it fresh
        // (Apple's recognizer can time out on long sessions)
        restartTimer = Timer.scheduledTimer(withTimeInterval: 15.0, repeats: false) { [weak self] _ in
            guard let self = self else { return }
            Task { @MainActor in
                if !self.isPaused {
                    self.stopListening()
                    self.startListening()
                }
            }
        }
    }
    
    func stopListening() {
        restartTimer?.invalidate()
        restartTimer = nil
        
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        
        recognitionRequest?.endAudio()
        recognitionRequest = nil
        
        recognitionTask?.cancel()
        recognitionTask = nil
        
        isListening = false
    }
    
    func pause() {
        isPaused = true
        stopListening()
    }
    
    func resume() {
        isPaused = false
        startListening()
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
    @StateObject private var speechRecognizer = SpeechRecognitionManager()
    @StateObject private var wakeWordListener = WakeWordListener()
    
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
                    speechRecognizer: speechRecognizer,
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
                        // Resume wake word listening when idle
                        wakeWordListener.resume()
                    }
                }
            }
            
            // Wire up speech recognition auto-send
            speechRecognizer.onAutoSend = { text in
                Task {
                    await sendMessageToBackend(text)
                }
            }
            
            // Wire up wake word detection
            wakeWordListener.onWakeWordDetected = {
                withAnimation(.spring(response: 0.4, dampingFraction: 0.75)) {
                    appState.isChatOpen = true
                }
                // Start listening for the user's command
                wakeWordListener.pause()
                speechRecognizer.startRecording()
                currentState = .listening
                statusMessage = "Listening..."
            }
            
            // Start wake word listener
            wakeWordListener.startListening()
        }
        .onChange(of: speechRecognizer.isRecording) {
            if speechRecognizer.isRecording {
                currentState = .listening
                statusMessage = "Listening..."
                wakeWordListener.pause()
            } else {
                if currentState == .listening {
                    currentState = .idle
                    statusMessage = "Ready"
                }
            }
        }
        .onChange(of: speechRecognizer.transcript) {
            promptText = speechRecognizer.transcript
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
            
            let (bytes, response) = try await URLSession.shared.bytes(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                throw NSError(domain: "Server Error", code: 500, userInfo: nil)
            }
            
            var reply = ""
            
            struct SSEMessage: Codable {
                let type: String
                let content: String
            }
            
            for try await line in bytes.lines {
                guard line.hasPrefix("data: ") else { continue }
                let rawJson = String(line.dropFirst(6)) // strip "data: "
                
                if let data = rawJson.data(using: .utf8),
                   let sseMsg = try? JSONDecoder().decode(SSEMessage.self, from: data) {
                    await MainActor.run {
                        if sseMsg.type == "status" {
                            self.statusMessage = sseMsg.content
                        } else if sseMsg.type == "result" {
                            reply = sseMsg.content
                        } else if sseMsg.type == "error" {
                            reply = "Error: \(sseMsg.content)"
                        }
                    }
                }
            }
            
            // Clean up backslash escapes from JSON serialization if they slipped through
            reply = reply
                .replacingOccurrences(of: "\\n", with: "\n")
                .replacingOccurrences(of: "\\\"", with: "\"")
            
            let finalReply = reply
            await MainActor.run {
                self.chatHistory.append(ChatMessage(sender: .assistant, text: finalReply))
                self.currentState = .speaking
                self.statusMessage = "Speaking..."
                
                if isSpeechEnabled {
                    speechManager.speak(finalReply)
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

// MARK: - Simple Orb Button (Placeholder for 3D Model)

struct SiriOrbView: View {
    let state: AssistantState
    let audioLevel: CGFloat
    
    // Button color based on state
    private var buttonColor: Color {
        switch state {
        case .idle: return Color(red: 0.35, green: 0.4, blue: 0.95)     // calm blue-purple
        case .listening: return Color(red: 0.2, green: 0.85, blue: 0.7) // teal/green
        case .thinking: return Color(red: 0.9, green: 0.6, blue: 0.2)   // warm amber
        case .speaking: return Color(red: 0.5, green: 0.3, blue: 0.95)  // vibrant purple
        }
    }
    
    var body: some View {
        Circle()
            .fill(buttonColor)
            .frame(width: 60, height: 60)
            .shadow(color: buttonColor.opacity(0.5), radius: 8, x: 0, y: 4)
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
    @ObservedObject var speechRecognizer: SpeechRecognitionManager
    var onSendMessage: (String) -> Void
    
    @State private var micPulse: Bool = false
    
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
                    // Adjust assistant state based on typing (only when not voice recording)
                    if !speechRecognizer.isRecording {
                        if currentState == .idle && !promptText.isEmpty {
                            currentState = .listening
                            statusMessage = "Typing..."
                        } else if currentState == .listening && promptText.isEmpty {
                            currentState = .idle
                            statusMessage = "Ready"
                        }
                    }
                }
                
                // Microphone Button
                Button(action: {
                    if speechRecognizer.isRecording {
                        speechRecognizer.stopRecording(sendMessage: false)
                    } else {
                        speechRecognizer.startRecording()
                    }
                }) {
                    ZStack {
                        if speechRecognizer.isRecording {
                            // Pulsing red background
                            Circle()
                                .fill(Color.red.opacity(0.3))
                                .frame(width: 32, height: 32)
                                .scaleEffect(micPulse ? 1.3 : 1.0)
                                .opacity(micPulse ? 0.0 : 0.6)
                                .animation(.easeInOut(duration: 0.8).repeatForever(autoreverses: false), value: micPulse)
                        }
                        
                        Image(systemName: speechRecognizer.isRecording ? "mic.fill" : "mic")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundColor(speechRecognizer.isRecording ? .red : (speechRecognizer.isAvailable ? .white.opacity(0.6) : .white.opacity(0.2)))
                            .frame(width: 32, height: 32)
                    }
                }
                .buttonStyle(PlainButtonStyle())
                .disabled(!speechRecognizer.isAvailable || currentState == .thinking || currentState == .speaking)
                .help(speechRecognizer.isRecording ? "Stop Recording" : (speechRecognizer.isAvailable ? "Voice Input" : "Speech Recognition Unavailable"))
                .onChange(of: speechRecognizer.isRecording) {
                    micPulse = speechRecognizer.isRecording
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
