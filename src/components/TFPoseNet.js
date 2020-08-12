import React, { Component } from 'react';
import * as posenet from '@tensorflow-models/posenet';
import {drawKeypoints, drawSkeleton, checkToleranceAndDrawSkeleton} from './pose_util';

export default class TFPoseNet extends Component {

  constructor(props) {
    super(props);
    this.state = {
      video: null,
      videoSource: null,
      stream: null,
      net: null,
      videoConstraints: {},
      canvas: null,
      userMediaSource: null,
      poseTracking: false,
      poseKeyPointsReceived: null,
      highRes: 'false',
      changeArchitecture: false
    };
    this.poseDetectionFrame = this.poseDetectionFrame.bind(this);
  }

  async setupCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(
          'Browser API navigator.mediaDevices.getUserMedia not available');
    }
  
    const videoElement = document.getElementById('video');
    
    videoElement.srcObject = this.state.videoSource;
  
    return new Promise((resolve) => {
      videoElement.onloadedmetadata = () => {
        videoElement.width = videoElement.videoWidth;
        videoElement.height = videoElement.videoHeight;
        resolve(videoElement);
      };
    });
  }
  
  async loadVideo() {

    this.setState({
      video: await this.setupCamera()
    })
    this.state.video.play();
  }

  guiState = {
    algorithm: 'single-pose',

    input: {
      architecture: 'MobileNetV1',
      outputStride: 16,
      inputResolution: 500,
      multiplier: 0.75,
      quantBytes: 2
    },
    inputHighRes:{
      architecture: 'ResNet50',
      outputStride: 32,
      inputResolution: 250,
      multiplier: 1.0,
      quantBytes: 2
    },
    singlePoseDetection: {
      minPoseConfidence: 0.1,
      minPartConfidence: 0.5,
    },
    output: {
      showVideo: true,
      showSkeleton: true,
      showPoints: true,
      showBoundingBox: false,
    },
    net: null,
  };

  async poseDetectionFrame() {

    const ctx = this.state.canvas.getContext('2d');   

    if (this.state.changeArchitecture === true){

      if (this.state.highRes === true) {
        // Important to purge variables and free up GPU memory
        this.guiState.net.dispose();
        console.log("switch to high res")
        this.guiState.net = await posenet.load({
          architecture: this.guiState.inputHighRes.architecture,
          outputStride: this.guiState.inputHighRes.outputStride,
          inputResolution: this.guiState.inputHighRes.inputResolution,
          multiplier: this.guiState.inputHighRes.multiplier,
          quantBytes: this.guiState.inputHighRes.quantBytes
        });
      } else {
        this.guiState.net.dispose();
        this.guiState.net = await posenet.load({
          architecture: this.guiState.input.architecture,
          outputStride: this.guiState.input.outputStride,
          inputResolution: this.guiState.input.inputResolution,
          multiplier: this.guiState.input.multiplier,
          quantBytes: this.guiState.input.quantBytes
        });
      }
      this.setState({
        changeArchitecture: false
      })
    }

    let minPoseConfidence;
    let minPartConfidence;

    const pose = await this.guiState.net.estimatePoses(this.state.video, {
      flipHorizontal: true,
      decodingMethod: 'single-person'
    });

    minPoseConfidence = +this.guiState.singlePoseDetection.minPoseConfidence;
    minPartConfidence = +this.guiState.singlePoseDetection.minPartConfidence;

    const videoWidth = this.state.video.width
    const videoHeight = this.state.video.height
    this.state.canvas.width = videoWidth;
    this.state.canvas.height = videoHeight;

    ctx.clearRect(0, 0, videoWidth, videoHeight);

    if (this.guiState.output.showVideo) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-videoWidth, 0);
      ctx.drawImage(this.state.video, 0, 0, videoWidth, videoHeight);
      ctx.restore();
    }
 
    if (pose[0].score >= minPoseConfidence) {
      // Send over pose keypoint to other connected users
      this.props.poseKeyPoints(pose[0].keypoints)

      // Draw received keypoints from SIMON
      let keyPointsReceived = this.state.poseKeyPointsReceived
      if (keyPointsReceived !== null){
        checkToleranceAndDrawSkeleton(pose[0].keypoints, keyPointsReceived, minPartConfidence, ctx);
      } else {
        // If we didn't receive anything from SIMON, just draw our own
        drawKeypoints(pose[0].keypoints, minPartConfidence, ctx);
        drawSkeleton(pose[0].keypoints, minPartConfidence, ctx);
      }
    }

    requestAnimationFrame(this.poseDetectionFrame);
  }

  detectPoseInRealTime() {
    this.setState({
      canvas: document.getElementById('output')
    })
    this.setState({
      stream: this.state.canvas.captureStream().getVideoTracks()[0]
    })
    this.poseDetectionFrame();
  }


  async bindPage() {

    this.guiState.net = await posenet.load({
      architecture: this.guiState.input.architecture,
      outputStride: this.guiState.input.outputStride,
      inputResolution: this.guiState.input.inputResolution,
      multiplier: this.guiState.input.multiplier,
      quantBytes: this.guiState.input.quantBytes
    });

    // Set up user webcam to start capturing
    await this.loadVideo(null);

    // Attach segmentation analysis to webcam stream
    this.detectPoseInRealTime();

  };

  componentDidUpdate(prevProps) {

    if (this.props.poseNetVideoSource !== null){
      if (this.props.poseNetVideoSource !== prevProps.poseNetVideoSource) {

        this.setState({
          videoSource: this.props.poseNetVideoSource
        });
        // Starts Posenet tracking if we're receiving video from publisher
        this.bindPage()

      }
    }

    if (this.props.poseKeyPointsReceived !== null &&
      this.props.poseKeyPointsReceived !== prevProps.poseKeyPointsReceived){

      this.setState({
        poseKeyPointsReceived: this.props.poseKeyPointsReceived
      })

    }
  }

  togglePose = () => {

    this.setState({
      poseTracking: !this.state.poseTracking,
    });

    if (this.state.stream !== true) {
      this.setState({
        stream: true
      });
    } else {
      this.detectPoseInRealTime()
    }
  };

  toggleQuality = () => {
    console.log("change quality")

    if (this.state.highRes !== true){
      this.setState({
        highRes: true
      });     
    } else {
      this.setState({
        highRes: false
      })
    }

    this.setState({
      changeArchitecture: true
    })
  }

  render() {
    return (
      <div>
        <div>
        {/* onMouseMove={this.onMouseClick} */}
          <video id="video" style={{display: "none" }} ></video>
          <canvas id="output" style={{display: "none" }} ></canvas>
          {this.state.videoSource !== null && 
            <div>
              <button 
                onClick = {() => {this.togglePose() ; this.props.videoSourced(this.state.stream) }}>
                {this.state.stream === true ? 'Disable' : 'Enable'} Pose Tracking
              </button>
              <button 
                onClick = {() => {this.toggleQuality()}}>
                {this.state.highRes=== true ? 'Disable' : 'Enable'} High Res Tracking
              </button>
            </div>
          }
        </div>
      </div>
    );  
  }
}
