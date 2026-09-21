/**
 * ═══════════════════════════════════════════════════════════════
 * ARENA VOICE CHAT — WebRTC P2P Voice Manager
 * ═══════════════════════════════════════════════════════════════
 * Low-latency peer-to-peer voice chat for 1v1 multiplayer rooms.
 * Uses WebRTC with STUN/TURN ICE servers and Supabase/Socket signaling.
 *
 * Full W3C Perfect Negotiation, mobile Safari/Chrome compatibility,
 * secure context verification, and defense against malformed SDP payloads.
 * ═══════════════════════════════════════════════════════════════
 */

export type VoiceState = "idle" | "connecting" | "connected" | "failed" | "no-mic";

export interface VoiceSignaler {
  emit: (event: string, data: any) => void;
  on: (event: string, handler: (data: any) => void) => void;
  off?: (event: string, handler?: (data: any) => void) => void;
}

export interface VoiceChatCallbacks {
  onStateChange: (state: VoiceState) => void;
  onMuteChange: (muted: boolean) => void;
  onRemoteAudioStart: () => void;
  onError: (message: string) => void;
}

/**
 * ICE server configuration — Multiple public STUN servers for robust
 * mobile/cellular NAT traversal, plus optional custom TURN servers.
 */
function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ];

  // Optional TURN fallback (configured via environment variables)
  const turnUrl =
    typeof window !== "undefined"
      ? (window as unknown as Record<string, string>).__NEXT_PUBLIC_TURN_URL ||
        process.env.NEXT_PUBLIC_TURN_URL
      : process.env.NEXT_PUBLIC_TURN_URL;

  const turnUsername =
    typeof window !== "undefined"
      ? (window as unknown as Record<string, string>).__NEXT_PUBLIC_TURN_USERNAME ||
        process.env.NEXT_PUBLIC_TURN_USERNAME
      : process.env.NEXT_PUBLIC_TURN_USERNAME;

  const turnCredential =
    typeof window !== "undefined"
      ? (window as unknown as Record<string, string>).__NEXT_PUBLIC_TURN_CREDENTIAL ||
        process.env.NEXT_PUBLIC_TURN_CREDENTIAL
      : process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    servers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return servers;
}

/**
 * Safely extracts a valid RTCSessionDescriptionInit { type, sdp } from any payload
 * format, whether it was double-wrapped by signaling or sent raw.
 */
export function extractSdp(raw: any): RTCSessionDescriptionInit | null {
  if (!raw) return null;

  // 1. Direct RTCSessionDescriptionInit: { type: "offer" | "answer", sdp: "..." }
  if (
    typeof raw.type === "string" &&
    typeof raw.sdp === "string" &&
    (raw.type === "offer" || raw.type === "answer" || raw.type === "pranswer" || raw.type === "rollback")
  ) {
    return { type: raw.type, sdp: raw.sdp };
  }

  // 2. Nested under .sdp property: { sdp: { type: "...", sdp: "..." } }
  if (raw.sdp && typeof raw.sdp === "object") {
    return extractSdp(raw.sdp);
  }

  // 3. RTCSessionDescription instance with .toJSON()
  if (typeof raw.type === "string" && typeof raw.toJSON === "function") {
    try {
      const json = raw.toJSON();
      if (json && typeof json.type === "string" && typeof json.sdp === "string") {
        return { type: json.type, sdp: json.sdp };
      }
    } catch {}
  }

  return null;
}

/**
 * Safely extracts a valid RTCIceCandidateInit from any candidate signal payload.
 */
export function extractIceCandidate(raw: any): RTCIceCandidateInit | null {
  if (!raw) return null;

  if (raw.candidate && typeof raw.candidate === "object") {
    return extractIceCandidate(raw.candidate);
  }

  const candidateStr = typeof raw.candidate === "string" ? raw.candidate : undefined;
  const sdpMid = raw.sdpMid !== undefined && raw.sdpMid !== null ? String(raw.sdpMid) : null;
  const sdpMLineIndex = typeof raw.sdpMLineIndex === "number" ? raw.sdpMLineIndex : null;
  const usernameFragment = typeof raw.usernameFragment === "string" ? raw.usernameFragment : undefined;

  if (candidateStr !== undefined || sdpMid !== null || sdpMLineIndex !== null) {
    const res: RTCIceCandidateInit = {};
    if (candidateStr !== undefined) res.candidate = candidateStr;
    if (sdpMid !== null) res.sdpMid = sdpMid;
    if (sdpMLineIndex !== null) res.sdpMLineIndex = sdpMLineIndex;
    if (usernameFragment !== undefined) res.usernameFragment = usernameFragment;
    return res;
  }

  return null;
}

/**
 * Universal Mobile & Desktop microphone acquisition.
 * Handles iOS Safari WebKit quirks, Android Chrome, and insecure HTTP origins.
 */
export async function requestUserAudioStream(): Promise<MediaStream> {
  if (typeof window === "undefined") {
    throw new Error("Window environment is required for microphone access");
  }

  // 1. Detect Insecure Context (e.g. mobile testing on local LAN IP http://192.168.x.x:3000)
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "[::1]";

  if (!window.isSecureContext && !isLocalhost) {
    throw new Error(
      "INSECURE_CONTEXT: Mobile browsers (Safari/Chrome) strictly block microphone access over plain HTTP. To speak on mobile, please open via HTTPS (e.g. your Vercel deployment https://... or ngrok tunnel) or enable Chrome insecure flags."
    );
  }

  // 2. Modern navigator.mediaDevices.getUserMedia
  if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function") {
    // Attempt 1: Standard mobile-safe audio constraints.
    // NOTE: NEVER specify `sampleRate` or `channelCount` here because iOS Safari WebKit
    // throws OverconstrainedError when hardware sample rates are fixed!
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
    } catch (err: any) {
      console.warn("[VoiceChat] High-fidelity constraints failed, trying universal audio: true", err);
      // If user explicitly denied permission, re-throw immediately
      if (
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError" ||
        err?.name === "SecurityError"
      ) {
        throw err;
      }
    }

    // Attempt 2: Minimal fallback constraint (widest mobile device compatibility)
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
    } catch (err: any) {
      console.warn("[VoiceChat] Basic audio constraint failed:", err);
      throw err;
    }
  }

  // 3. Legacy WebKit / Moz getUserMedia for older mobile webviews
  const legacyGetUserMedia =
    (navigator as any).getUserMedia ||
    (navigator as any).webkitGetUserMedia ||
    (navigator as any).mozGetUserMedia;

  if (legacyGetUserMedia) {
    return new Promise<MediaStream>((resolve, reject) => {
      legacyGetUserMedia.call(
        navigator,
        { audio: true, video: false },
        resolve,
        reject
      );
    });
  }

  throw new Error("MEDIA_UNSUPPORTED: Microphone API is not supported or accessible on this browser.");
}

export class VoiceChatManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteAudio: HTMLAudioElement | null = null;
  private signaler: VoiceSignaler;
  private roomCode: string;
  private playerToken: string;
  private isInitiator: boolean;
  private isMuted = true; // Start muted by default
  private state: VoiceState = "idle";
  private callbacks: VoiceChatCallbacks;
  private makingOffer = false;
  private ignoreOffer = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private candidateQueue: RTCIceCandidateInit[] = [];
  private destroyed = false;

  constructor(
    signaler: VoiceSignaler,
    roomCode: string,
    playerToken: string,
    isInitiator: boolean,
    callbacks: VoiceChatCallbacks,
    initialStream?: MediaStream | null
  ) {
    this.signaler = signaler;
    this.roomCode = roomCode;
    this.playerToken = playerToken;
    this.isInitiator = isInitiator;
    this.callbacks = callbacks;

    if (initialStream) {
      this.localStream = initialStream;
      this.isMuted = false;
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
      this.callbacks.onMuteChange(false);
    }

    this.bindSocketListeners();
  }

  /** Initialize WebRTC connection and optionally request mic */
  async initialize(): Promise<void> {
    if (this.destroyed) return;

    this.setState("connecting");

    // Always create peer connection with audio transceiver first so remote audio can still be received
    this.createPeerConnection();

    // Check if mic permission was already granted previously; if so, attach stream.
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === "function" &&
        navigator.permissions &&
        typeof navigator.permissions.query === "function"
      ) {
        const perm = await navigator.permissions
          .query({ name: "microphone" as PermissionName })
          .catch(() => null);

        if (perm && perm.state === "granted" && !this.localStream) {
          this.localStream = await requestUserAudioStream();

          this.localStream.getAudioTracks().forEach((track) => {
            track.enabled = !this.isMuted;
          });

          if (this.pc && this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
              const transceiver = this.pc.getTransceivers().find(
                (t) => t.receiver?.track?.kind === "audio" || t.sender?.track?.kind === "audio"
              );
              if (transceiver && transceiver.sender) {
                await transceiver.sender.replaceTrack(audioTrack);
                transceiver.direction = "sendrecv";
              } else {
                this.pc.addTrack(audioTrack, this.localStream);
              }
            }
          }
        }
      }
    } catch {
      // Non-blocking, mic will be requested on user's explicit Unmute click
    }

    // If initiator (host), send SDP offer
    if (this.isInitiator) {
      await this.createOffer();
    }
  }

  /** Create RTCPeerConnection with ICE servers */
  private createPeerConnection(): void {
    if (this.pc) {
      this.pc.close();
    }

    this.pc = new RTCPeerConnection({
      iceServers: getIceServers(),
      iceCandidatePoolSize: 2,
    });

    // Ensure audio transceiver is configured on connection setup
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        this.pc.addTrack(audioTrack, this.localStream);
      }
    } else {
      try {
        this.pc.addTransceiver("audio", { direction: "sendrecv" });
      } catch (e) {
        console.warn("[VoiceChat] addTransceiver note:", e);
      }
    }

    // Handle incoming remote audio stream
    this.pc.ontrack = (event) => {
      console.log("[VoiceChat] Remote track received:", event.track.id, "kind:", event.track.kind);

      let audioEl = this.remoteAudio;
      if (!audioEl) {
        if (typeof document !== "undefined") {
          let existing = document.getElementById("arena-remote-voice-audio") as HTMLAudioElement | null;
          if (!existing) {
            existing = document.createElement("audio");
            existing.id = "arena-remote-voice-audio";
            existing.autoplay = true;
            existing.setAttribute("playsinline", "true");
            existing.setAttribute("webkit-playsinline", "true");
            // Do NOT use display: none on iOS Safari as WebKit throttles hidden audio elements
            existing.style.position = "fixed";
            existing.style.top = "-9999px";
            existing.style.left = "-9999px";
            existing.style.width = "1px";
            existing.style.height = "1px";
            existing.style.opacity = "0";
            existing.style.pointerEvents = "none";
            document.body.appendChild(existing);
          }
          audioEl = existing;
        } else {
          audioEl = new Audio();
        }
        this.remoteAudio = audioEl;
      }

      audioEl.volume = 1.0;
      audioEl.muted = false;

      if (event.streams && event.streams[0]) {
        audioEl.srcObject = event.streams[0];
      } else {
        const stream = new MediaStream([event.track]);
        audioEl.srcObject = stream;
      }

      const tryPlay = () => {
        if (this.remoteAudio) {
          this.remoteAudio.play().catch((e) => {
            console.warn("[VoiceChat] Remote audio play waiting for user interaction:", e);
          });
        }
      };

      tryPlay();

      // Mobile touch interaction unlocks iOS Safari audio playback
      if (typeof window !== "undefined") {
        const unlockAudio = () => {
          tryPlay();
          window.removeEventListener("touchstart", unlockAudio);
          window.removeEventListener("touchend", unlockAudio);
          window.removeEventListener("click", unlockAudio);
        };
        window.addEventListener("touchstart", unlockAudio, { passive: true });
        window.addEventListener("touchend", unlockAudio, { passive: true });
        window.addEventListener("click", unlockAudio, { passive: true });
      }

      this.callbacks.onRemoteAudioStart();
    };

    // ICE candidate trickle — send to remote peer via signaler
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaler.emit("webrtc_ice_candidate", {
          roomCode: this.roomCode,
          playerToken: this.playerToken,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Connection state changes
    this.pc.onconnectionstatechange = () => {
      const connState = this.pc?.connectionState;
      console.log(`[VoiceChat] Connection state: ${connState}`);

      switch (connState) {
        case "connected":
          this.setState("connected");
          this.reconnectAttempts = 0;
          break;
        case "disconnected":
          console.warn("[VoiceChat] Peer disconnected, waiting for recovery...");
          break;
        case "failed":
          this.handleConnectionFailure();
          break;
        case "closed":
          if (!this.destroyed) {
            this.setState("idle");
          }
          break;
      }
    };

    // ICE connection state for more granular tracking
    this.pc.oniceconnectionstatechange = () => {
      const iceState = this.pc?.iceConnectionState;
      console.log(`[VoiceChat] ICE state: ${iceState}`);

      if (iceState === "failed") {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          console.log("[VoiceChat] Attempting ICE restart...");
          this.reconnectAttempts++;
          this.pc?.restartIce();
          this.createOffer().catch(console.error);
        }
      }
    };

    // Negotiation needed: allow renegotiation when tracks are added
    this.pc.onnegotiationneeded = async () => {
      try {
        if (this.pc?.signalingState === "stable") {
          await this.createOffer();
        }
      } catch (err) {
        console.warn("[VoiceChat] Negotiation error:", err);
      }
    };
  }

  /** Create and send SDP offer */
  private async createOffer(): Promise<void> {
    if (!this.pc || this.makingOffer || this.destroyed) return;

    try {
      this.makingOffer = true;
      const offer = await this.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });

      if (this.pc.signalingState !== "stable") return;

      await this.pc.setLocalDescription(offer);

      this.signaler.emit("webrtc_offer", {
        roomCode: this.roomCode,
        playerToken: this.playerToken,
        sdp: this.pc.localDescription?.toJSON(),
      });
    } catch (err) {
      console.error("[VoiceChat] Create offer error:", err);
    } finally {
      this.makingOffer = false;
    }
  }

  /** Drain any ICE candidates received before remote description was set */
  private async flushCandidateQueue(): Promise<void> {
    if (!this.pc || !this.pc.remoteDescription) return;

    while (this.candidateQueue.length > 0) {
      const cand = this.candidateQueue.shift();
      if (cand) {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (err) {
          console.warn("[VoiceChat] Error draining queued candidate:", err);
        }
      }
    }
  }

  /** Handle incoming SDP offer from remote peer */
  private async handleOffer(rawData: any): Promise<void> {
    if (!this.pc || this.destroyed) return;

    const sdp = extractSdp(rawData);
    if (!sdp) {
      console.warn("[VoiceChat] Invalid SDP offer received:", rawData);
      return;
    }

    // W3C Perfect Negotiation:
    // Host (isInitiator) is impolite and ignores colliding offers.
    // Guest (!isInitiator) is polite, rolls back local offer, and accepts host offer.
    const isCollision = this.makingOffer || this.pc.signalingState !== "stable";
    this.ignoreOffer = this.isInitiator && isCollision;

    if (this.ignoreOffer) {
      console.log("[VoiceChat] Host ignoring colliding offer from guest");
      return;
    }

    if (isCollision && !this.isInitiator) {
      console.log("[VoiceChat] Polite peer rolling back to accept remote offer");
      await this.pc.setLocalDescription({ type: "rollback" } as RTCSessionDescriptionInit).catch(() => {});
    }

    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
      await this.flushCandidateQueue();

      // Ensure local audio transceiver is explicitly configured as 'sendrecv'
      const audioTransceiver = this.pc.getTransceivers().find(
        (t) => t.receiver?.track?.kind === "audio" || t.sender?.track?.kind === "audio"
      );
      if (audioTransceiver) {
        audioTransceiver.direction = "sendrecv";
      }

      // If peer already has a local stream, attach it so answer includes local audio
      if (this.localStream) {
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
          if (audioTransceiver && audioTransceiver.sender) {
            await audioTransceiver.sender.replaceTrack(audioTrack);
          } else {
            this.pc.addTrack(audioTrack, this.localStream);
          }
        }
      }

      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);

      this.signaler.emit("webrtc_answer", {
        roomCode: this.roomCode,
        playerToken: this.playerToken,
        sdp: this.pc.localDescription?.toJSON(),
      });
    } catch (err) {
      console.error("[VoiceChat] Handle offer error:", err);
    }
  }

  /** Handle incoming SDP answer from remote peer */
  private async handleAnswer(rawData: any): Promise<void> {
    if (!this.pc || this.destroyed) return;

    const sdp = extractSdp(rawData);
    if (!sdp) {
      console.warn("[VoiceChat] Invalid SDP answer received:", rawData);
      return;
    }

    try {
      if (this.pc.signalingState === "have-local-offer") {
        await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await this.flushCandidateQueue();
        console.log("[VoiceChat] Remote answer accepted successfully!");
      }
    } catch (err) {
      console.error("[VoiceChat] Handle answer error:", err);
    }
  }

  /** Handle incoming ICE candidate from remote peer */
  private async handleIceCandidate(rawData: any): Promise<void> {
    if (!this.pc || this.destroyed) return;

    const candidate = extractIceCandidate(rawData);
    if (!candidate) {
      return;
    }

    // If remote description isn't set yet, queue the candidate to prevent drop
    if (!this.pc.remoteDescription || !this.pc.remoteDescription.type) {
      this.candidateQueue.push(candidate);
      return;
    }

    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "InvalidStateError")) {
        console.warn("[VoiceChat] Add ICE candidate error:", err);
      }
    }
  }

  /** Handle connection failure with retry logic */
  private handleConnectionFailure(): void {
    if (this.destroyed) return;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[VoiceChat] Connection failed, retrying (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      this.setState("connecting");

      // Recreate peer connection and retry
      setTimeout(() => {
        if (!this.destroyed) {
          this.createPeerConnection();
          if (this.isInitiator) {
            this.createOffer().catch(console.error);
          }
        }
      }, 1000 * this.reconnectAttempts);
    } else {
      console.error("[VoiceChat] Max reconnect attempts reached");
      this.setState("failed");
      this.callbacks.onError("Voice connection failed. Game continues without voice.");
    }
  }

  /** Bind listeners for WebRTC signaling */
  private bindSocketListeners(): void {
    this.signaler.on("webrtc_offer", (data: any) => {
      const from = data?.from || data?.playerToken;
      if (from && from === this.playerToken) return;
      this.handleOffer(data);
    });

    this.signaler.on("webrtc_answer", (data: any) => {
      const from = data?.from || data?.playerToken;
      if (from && from === this.playerToken) return;
      this.handleAnswer(data);
    });

    this.signaler.on("webrtc_ice_candidate", (data: any) => {
      const from = data?.from || data?.playerToken;
      if (from && from === this.playerToken) return;
      this.handleIceCandidate(data);
    });
  }

  /** Remove listeners */
  private unbindSocketListeners(): void {
    if (this.signaler.off) {
      this.signaler.off("webrtc_offer");
      this.signaler.off("webrtc_answer");
      this.signaler.off("webrtc_ice_candidate");
    }
  }

  /** Toggle mute/unmute */
  async toggleMute(): Promise<boolean> {
    if (this.destroyed) return this.isMuted;

    // Toggling to unmuted
    if (this.isMuted) {
      if (!this.localStream) {
        try {
          this.localStream = await requestUserAudioStream();

          if (this.pc && this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
              const transceiver = this.pc.getTransceivers().find(
                (t) => t.receiver?.track?.kind === "audio" || t.sender?.track?.kind === "audio"
              );
              if (transceiver && transceiver.sender) {
                await transceiver.sender.replaceTrack(audioTrack);
                transceiver.direction = "sendrecv";
              } else {
                this.pc.addTrack(audioTrack, this.localStream);
              }

              if (this.pc.signalingState === "stable") {
                await this.createOffer();
              }
            }
          }
        } catch (err: any) {
          const error = err as Error;
          console.warn("[VoiceChat] Mic acquisition on unmute failed:", error);
          this.isMuted = true;
          this.callbacks.onMuteChange(true);

          if (error.message?.includes("INSECURE_CONTEXT")) {
            this.callbacks.onError(
              "Mobile browsers block mic on plain HTTP! Please open via HTTPS (e.g. your Vercel link) or enable Chrome insecure flags."
            );
          } else if (
            error.name === "NotAllowedError" ||
            error.name === "PermissionDeniedError"
          ) {
            this.callbacks.onError(
              "Microphone permission denied. Tap browser URL bar/settings icon to Allow microphone."
            );
          } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
            this.callbacks.onError("No microphone hardware found on this device.");
          } else {
            this.callbacks.onError(`Mic error: ${error.message || "Failed to open mic"}`);
          }
          return true;
        }
      }

      this.isMuted = false;
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });

        // Ensure track is attached to sender and transceiver is active
        if (this.pc) {
          const audioTrack = this.localStream.getAudioTracks()[0];
          const transceiver = this.pc.getTransceivers().find(
            (t) => t.receiver?.track?.kind === "audio" || t.sender?.track?.kind === "audio"
          );
          if (transceiver && transceiver.sender && audioTrack) {
            await transceiver.sender.replaceTrack(audioTrack);
          }
          if (this.pc.signalingState === "stable") {
            await this.createOffer();
          }
        }
      }
    } else {
      // Toggling to muted
      this.isMuted = true;
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }
    }

    this.callbacks.onMuteChange(this.isMuted);
    return this.isMuted;
  }

  /** Set mute state explicitly */
  setMuted(muted: boolean): void {
    this.isMuted = muted;

    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !this.isMuted;
      });
    }

    this.callbacks.onMuteChange(this.isMuted);
  }

  /** Get current mute state */
  getMuted(): boolean {
    return this.isMuted;
  }

  /** Get current voice state */
  getState(): VoiceState {
    return this.state;
  }

  /** Update state and notify callback */
  private setState(state: VoiceState): void {
    this.state = state;
    this.callbacks.onStateChange(state);
  }

  /** Attach a freshly acquired stream to existing connection */
  async attachLocalStream(stream: MediaStream): Promise<void> {
    this.localStream = stream;
    this.isMuted = false;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = true;
    });

    if (this.pc) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        const transceiver = this.pc.getTransceivers().find(
          (t) => t.receiver?.track?.kind === "audio" || t.sender?.track?.kind === "audio"
        );
        if (transceiver && transceiver.sender) {
          await transceiver.sender.replaceTrack(audioTrack);
          transceiver.direction = "sendrecv";
        } else {
          this.pc.addTrack(audioTrack, this.localStream);
        }

        if (this.pc.signalingState === "stable") {
          await this.createOffer();
        }
      }
    }
    this.callbacks.onMuteChange(false);
  }

  /** Clean up all resources */
  destroy(): void {
    this.destroyed = true;
    this.unbindSocketListeners();
    this.candidateQueue = [];

    // Stop all local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Close peer connection
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    // Clean up remote audio element
    if (this.remoteAudio) {
      this.remoteAudio.srcObject = null;
      if (this.remoteAudio.parentNode) {
        this.remoteAudio.parentNode.removeChild(this.remoteAudio);
      }
      this.remoteAudio = null;
    }

    this.setState("idle");
  }
}
