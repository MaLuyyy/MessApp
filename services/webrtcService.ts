// services/webrtcService.ts - FIXED VERSION
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import { db } from '@/lib/firebaseConfig';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  getDoc,
} from 'firebase/firestore';
import InCallManager from 'react-native-incall-manager';

export interface CallData {
  id?: string;
  callerId: string;
  calleeId: string;
  type: 'audio' | 'video';
  status: 'calling' | 'accepted' | 'rejected' | 'ended';
  createdAt?: any;
  callerName?: string;
  callerPhoto?: string;   
  calleeName?: string;   
  calleePhoto?: string;  
  offer?: any;
  answer?: any;
}

class WebRTCService {
  private peerConnection: any = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private callId: string | null = null;
  private isInitiator: boolean = false;
  private isCallActive: boolean = false; // ✅ Add flag to prevent multiple calls

  public onLocalStream: ((stream: MediaStream) => void) | null = null;
  public onRemoteStream: ((stream: MediaStream) => void) | null = null;
  public onCallEnded: (() => void) | null = null;
  public onIncomingCall: ((callData: CallData) => void) | null = null;
  public onCallAccepted: (() => void) | null = null;
  public onCallRejected: (() => void) | null = null;

  private configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
    iceCandidatePoolSize: 10,
  };

  private unsubscribeListeners: (() => void)[] = [];
  private incomingCallsListener: (() => void) | null = null; // ✅ Track incoming calls listener

  constructor() {
    InCallManager.setKeepScreenOn(true);
    InCallManager.setForceSpeakerphoneOn(false);
  }

  // --- Peer Connection ---
  private createPeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    const pc: any = new RTCPeerConnection(this.configuration);

    pc.onicecandidate = (event: any) => {
      if (event.candidate && this.callId) {
        this.addIceCandidate(event.candidate);
      }
    };

    pc.ontrack = (event: any) => {
      console.log('📺 ontrack event received:', event.streams?.length);
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.onRemoteStream?.(this.remoteStream!);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('🔗 Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        console.log('✅ Call connected successfully');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        console.log('❌ Call disconnected or failed');
        this.endCall();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state:', pc.iceConnectionState);
    };

    return pc;
  }

  private async getUserMedia(isVideo: boolean): Promise<MediaStream> {
    const constraints = { 
      audio: true, 
      video: isVideo ? { 
        width: 1280, 
        height: 720, 
        facingMode: 'user' 
      } 
      : false, 
      }; 
      try { 
        const stream = await mediaDevices.getUserMedia(constraints); 
        console.log('🎥 Local media obtained'); 
        return stream; 
      } catch (error) { 
        console.error('❌ Error getting user media:', error); 
        throw new Error('Không thể truy cập camera/microphone'); 
      } 
    }

  // --- Start Call ---
  public async startCall(
    calleeId: string,
    callerId: string,
    callerName: string,
    type: "audio" | "video"
  ): Promise<CallData> {
    if (this.isCallActive) throw new Error("Cuộc gọi đang được thực hiện");
  
    try {
      const callRef = await addDoc(collection(db, "calls"), {
        callerId,
        callerName,
        calleeId,
        type,
        status: "calling",
        createdAt: serverTimestamp(),
      });
  
      this.callId = callRef.id;
      this.isInitiator = true;

    this.peerConnection = this.createPeerConnection();
    this.localStream = await this.getUserMedia(type === 'video');

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        console.log('➕ Adding track:', track.kind, track.id);
        this.peerConnection?.addTrack(track, this.localStream!);
      });
      this.onLocalStream?.(this.localStream);
    }

    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: type === 'video',
    });
    await this.peerConnection.setLocalDescription(offer);

    await updateDoc(doc(db, 'calls', this.callId), {
      offer: { type: offer.type, sdp: offer.sdp },
    });

    this.listenForAnswer();
    this.listenForIceCandidates('callee');

    setTimeout(() => {
      if (this.callId && this.peerConnection?.connectionState !== 'connected') {
        console.log('⏰ Call timeout - ending call');
        this.endCall();
      }
    }, 30000);

    InCallManager.start({ media: type === 'video' ? 'video' : 'audio' });

    // ✅ Trả về CallData thay vì string
    return {
      id: this.callId,
      callerId,
      calleeId,
      type,
      status: 'calling',
      callerName,
    } as CallData;
  } catch (error) {
    console.error('❌ Error starting call:', error);
    this.isCallActive = false;
    this.cleanup();
    throw error;
  }
}


  // --- Accept Call ---
  public async acceptCall(callId: string) {
    if (this.isCallActive) {
      console.log('⚠️ Call already active, cannot accept new call');
      return;
    }

    try {
      console.log('✅ Accepting call:', callId);
      this.isCallActive = true;
      this.callId = callId;
      this.isInitiator = false;

      // ✅ Get call data properly
      const callDocRef = doc(db, 'calls', callId);
      const callDocSnap = await getDoc(callDocRef);
      
      if (!callDocSnap.exists()) {
        throw new Error('Call not found');
      }
      
      const callData = callDocSnap.data() as CallData;
      console.log('📋 Call data retrieved:', { type: callData.type, status: callData.status });

      this.peerConnection = this.createPeerConnection();
      this.localStream = await this.getUserMedia(callData.type === 'video');

      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          console.log('➕ Adding track (callee):', track.kind, track.id);
          this.peerConnection?.addTrack(track, this.localStream!);
        });
        this.onLocalStream?.(this.localStream);
      }

      if (callData.offer) {
        console.log('📥 Setting remote description');
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(callData.offer)
        );
      }

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      console.log('📤 Answer created and set');

      await updateDoc(callDocRef, {
        status: 'accepted',
        answer: { type: answer.type, sdp: answer.sdp },
      });

      this.listenForIceCandidates('caller');
      InCallManager.start({ media: callData.type === 'video' ? 'video' : 'audio' });
      this.onCallAccepted?.();
    } catch (error) {
      console.error('❌ Error accepting call:', error);
      this.isCallActive = false;
      this.rejectCall(callId);
      throw error;
    }
  }

  // --- Reject / End Call ---
  public async rejectCall(callId: string) {
    if (!this.isCallActive) {
      console.log("⚠️ rejectCall called but no active call");
    }
  
    console.log("❌ Rejecting call:", callId);
  
    try {
      const callRef = doc(db, "calls", callId);
      await updateDoc(callRef, { status: "rejected" });
    } catch (e) {
      console.error("Failed to reject call:", e);
    }
  
    this.isCallActive = false;
    this.callId = null;
    this.cleanup();
  }
  
  

  public endCall() {
    if (!this.isCallActive || !this.callId) {
      console.log("⚠️ endCall called but no active call");
      return;
    }
  
    console.log("📞 Ending call:", this.callId);
  
    try {
      const callRef = doc(db, "calls", this.callId);
      updateDoc(callRef, { status: "ended" }).catch((e) =>
        console.error("Failed to update call status:", e)
      );
    } catch (e) {
      console.error("Error updating call status:", e);
    }
  
    // 🔥 Đặt false ngay lập tức, tránh loop
    this.isCallActive = false;
    this.callId = null;
    this.cleanup();
  }
  
  

  // --- Listen Answer / ICE ---
  private listenForAnswer() {
    if (!this.callId) return;
    
    console.log('👂 Listening for answer...');
    const unsubscribe = onSnapshot(doc(db, 'calls', this.callId), async (snapshot) => {
      const data = snapshot.data() as CallData;
      console.log('📡 Call status update:', data?.status);
      
      if (data?.answer && this.peerConnection && this.isInitiator) {
        try {
          console.log('📥 Setting remote description (answer)');
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
          this.onCallAccepted?.();
        } catch (error) {
          console.error('Error setting remote description:', error);
        }
      }
      
      if ((data?.status === "rejected" || data?.status === "ended") && this.isCallActive) {
        console.log("📡 Call status update:", data.status);
        
        if (data?.status === "rejected") {
          this.onCallRejected?.();
        } else {
          this.onCallEnded?.();
        }
      
        this.isCallActive = false;
        this.callId = null;
        this.cleanup();
      }
      
    });
    
    this.unsubscribeListeners.push(unsubscribe);
  }

  private listenForIceCandidates(type: 'caller' | 'callee') {
    if (!this.callId) return;
  
    const path = `calls/${this.callId}/${type}Candidates`;
    console.log('🧊 Listening for ICE candidates:', path);
  
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added' && this.peerConnection) {
          const { candidate, sdpMid, sdpMLineIndex } = change.doc.data();
          try {
            console.log('🧊 Adding ICE candidate');
            await this.peerConnection.addIceCandidate(
              new RTCIceCandidate({ candidate, sdpMid, sdpMLineIndex })
            );
          } catch (error) {
            console.error('Error adding ICE candidate:', error);
          }
        }
      });
    });
  
    this.unsubscribeListeners.push(unsubscribe);
  }
  

  private async addIceCandidate(candidate: RTCIceCandidate) {
    if (!this.callId) return;
    
    const path = `calls/${this.callId}/${this.isInitiator ? 'caller' : 'callee'}Candidates`;
    try {
      await addDoc(collection(db, path), {
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex,
      });
      console.log('🧊 ICE candidate added to Firestore');
    } catch (error) {
      console.error('Error adding ICE candidate to Firestore:', error);
    }
  }

  // --- Incoming calls ---
  public listenForIncomingCalls(userId: string) {
    // ✅ Clean up existing listener first
    if (this.incomingCallsListener) {
      this.incomingCallsListener();
    }

    console.log('👂 Listening for incoming calls for user:', userId);
    
    const q = query(
      collection(db, 'calls'),
      where('calleeId', '==', userId),
      where('status', '==', 'calling')
    );
    
    this.incomingCallsListener = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const callData: CallData = { id: change.doc.id, ...change.doc.data() } as CallData;
          
          // ✅ Only show incoming call if not already in a call
          if (!this.isCallActive) {
            console.log('📞 New incoming call:', callData.id);
            this.onIncomingCall?.(callData);
          } else {
            console.log('⚠️ Incoming call ignored - already in call');
            // Auto reject if already in call
            this.rejectCall(callData.id!);
          }
        }
      });
    });
  }

  // --- Utilities ---
  public toggleCamera() {
    const videoTrack = this.localStream?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      console.log('📹 Camera toggled:', videoTrack.enabled);
    }
  }

  public toggleMicrophone() {
    const audioTrack = this.localStream?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      console.log('🎤 Microphone toggled:', audioTrack.enabled);
    }
  }

  public switchCamera() {
    const videoTrack = this.localStream?.getVideoTracks()[0];
    if (videoTrack) {
      // @ts-ignore
      videoTrack._switchCamera();
      console.log('🔄 Camera switched');
    }
  }

  public toggleSpeaker(on: boolean) {
    InCallManager.setForceSpeakerphoneOn(on);
    console.log('🔊 Speaker toggled:', on);
  }

  private cleanup(resetCallActive: boolean = true) {
    console.log('🧹 Cleaning up WebRTC resources');
    
    InCallManager.stop();
    
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
        console.log('⏹️ Track stopped:', track.kind);
      });
      this.localStream = null;
    }

    this.remoteStream = null;

    this.unsubscribeListeners.forEach((fn) => fn());
    this.unsubscribeListeners = [];

    this.callId = null;
    this.isInitiator = false;
    
    if (resetCallActive) {
      this.isCallActive = false;
    }
  }

  // ✅ Add method to stop listening for incoming calls
  public stopListeningForIncomingCalls() {
    if (this.incomingCallsListener) {
      this.incomingCallsListener();
      this.incomingCallsListener = null;
      console.log('🔇 Stopped listening for incoming calls');
    }
  }

  public getLocalStream() {
    return this.localStream;
  }

  public getRemoteStream() {
    return this.remoteStream;
  }

  public getConnectionState() {
    return this.peerConnection?.connectionState || 'closed';
  }

  public isInCall() {
    return this.isCallActive;
  }
}

export const webrtcService = new WebRTCService();
export default webrtcService;