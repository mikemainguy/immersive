import RecordRTC from 'recordrtc';

export class VoiceManager {
    private socket: WebSocket;
    private token: string;
    private recorder: RecordRTC;
    private data: any[] = [];

    constructor() {

    }

    public async setupConnection() {
        const response = await fetch('/api/voice/token');
        const data = await response.json();
        this.token = data.token;
        if (!this.socket) {
            this.socket = new WebSocket(`wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${this.token}`);
            this.socket.onmessage = (message) => {
                const res = JSON.parse(message.data);
                if (this.data) {
                    this.data.push(res);
                    //this.target.emit('transcriptiondata', {data: res});
                }
            }
            this.socket.onopen = this.socketOpen;
        } else {
            switch (this.socket.readyState) {
                case 0:
                    console.log('socket opening');
                    break;
                case 1:
                    console.log('socket already open');
                    break;
                case 2:
                    console.log('dang, socket is closing');
                    this.socket = null;
                    break;
                case 3:
                    console.log('Socket is closed');
                    this.socket = null;
                    break
                default:
                    console.log(`socket state is unknown: ${this.socket.readyState}`);
            }

        }
    }

    private async socketOpen() {
        if (!this.recorder) {
            const stream = await navigator.mediaDevices.getUserMedia({audio: true});
            this.recorder = new RecordRTC(stream, {
                type: 'audio', mimeType: 'audio/webm;codecs=pcm', // endpoint requires 16bit PCM audio
                recorderType: RecordRTC.StereoAudioRecorder, timeSlice: 300, // set 250 ms intervals of data that sends to AAI
                desiredSampRate: 16000, numberOfAudioChannels: 1, // real-time requires only one channel
                bufferSize: 4096, audioBitsPerSecond: 128000, ondataavailable: (blob) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const base64data: string = (reader.result as string);
                        // audio data must be sent as a base64 encoded string
                        if (this.socket && (this.socket.readyState === 1)) {
                            this.socket.send(JSON.stringify({audio_data: base64data.split('base64,')[1]}));
                        } else {
                            console.log('no socket available');
                        }
                    };
                    reader.readAsDataURL(blob);
                },
            });
        }
    }
}