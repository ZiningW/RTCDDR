import React, {Component} from 'react';
import OTChat from './components/OTChat';
import TFPoseNet from './components/TFPoseNet';
import { w3cwebsocket as W3CWebSocket } from "websocket";
import './App.css';
import { Container, Row, Col } from 'reactstrap';

const client = new W3CWebSocket('ws://127.0.0.1:8000');

class App extends Component {

  constructor(props){
    super(props)
    this.state = {
        // this should be a mediaStream
        videoSource: null,
        poseNetVideoSource: null,
        poseKeyPointSent: null,
        poseKeyPointReceived: null,

        // for websocket
        currentUsers: [],
        userActivity: [],
        username: null,
        text: '',
        // check if the user wants to be Simon (person that dictate poses)
        role: null,
        simonAvailable: null
    }
  }

  setVideoSource = (videoSource) => {
    console.log("triggered", videoSource)
    this.setState({ videoSource });
  }

  setPoseNetVideoSource = (videoSource) => {
    this.setState({
      poseNetVideoSource: videoSource
    });
  }

  getPoseKeyPoints = (keyPoint) => {
    this.setState({
      poseKeyPointSent: keyPoint
    })

    // if the user is SIMON, send this to the server and broadcast to rest of room
    if (this.state.role === "simon"){
      client.send(JSON.stringify({
                        type: "keypoint",
                        payload: keyPoint
                      }));
    }
  }

  logInUser = (role) => {
    const username = this.username.value;

    console.log("role", role)
    this.setState({
      role: role
    });

    if (username.trim()) {
      const data = {
        username
      };
      this.setState({
        ...data
      }, () => {
        client.send(JSON.stringify({
          ...data,
          type: "userevent",
          role: role
        }));
      });
    }
  }

  /* When content changes, we send the current content of the editor to the server. */
  onEditorStateChange = (text) => {
    client.send(JSON.stringify({
      type: "contentchange",
      username: this.state.username,
      content: text
    }));
  };

  componentWillMount() {
    client.onopen = () => {
      console.log('WebSocket Client Connected');
    };

    client.onmessage = (message) => {

      // console.log("message", message)

      if (message.data === "SIMON AVAILABLE") {
        this.setState({
          simonAvailable: true
        });
      } else if (message.data === "SIMON UNAVAILABLE"){
        this.setState({
          simonAvailable: false
        });
      } else {
        const dataFromServer = JSON.parse(message.data);
        const stateToChange = {};
        if (dataFromServer.type === "userevent") {
          stateToChange.currentUsers = Object.values(dataFromServer.data.users);
        } else if (dataFromServer.type === "keypoint"){
          // console.log("received keypoint", dataFromServer.data.dataFromClient.payload)
          this.setState({
            poseKeyPointReceived: dataFromServer.data.dataFromClient.payload
          })
        }
      }
    };
  }

  showLoginSection = () => (
    <div className="account">
      <div className="account__wrapper">
        <div className="account__card">
          <div className="account__profile">
            <p className="account__name">Hello, user!</p>
            <p className="account__sub">Join Game</p>
          </div>
          <input name="username" ref={(input) => { this.username = input; }} className="form-control" />
          <button type="button" onClick={() => this.logInUser("follower")} className="btn btn-primary account__btn">Join</button>
          {this.state.simonAvailable &&
            <div>
              <button type="button" onClick={() => this.logInUser("simon")} className="btn btn-primary account__btn">Join as SIMON</button>
            </div>
          }
        </div>
      </div>
    </div>
  )

  showVideoChat = () => (
    // <div className="App">
      <Container>
        <Row>
          <Col>User Role: {this.state.role}</Col>
          <Col>Username: {this.state.username}</Col>
        </Row>
        
        <TFPoseNet videoSourced = {this.setVideoSource}
                    poseKeyPoints = {this.getPoseKeyPoints}
                    poseKeyPointsReceived = {this.state.poseKeyPointReceived}
                    poseNetVideoSource = {this.state.poseNetVideoSource}
        />        
        <OTChat poseNetVideoSourced={this.setPoseNetVideoSource}
              credentials = {this.props.credentials} 
              videoSource = {this.state.videoSource} 
              changedMediaSource = {this.setUserMediaSource}/>
      </Container>
    // </div>
  )

  render() {
    const {
      username
    } = this.state;

    return (

      <React.Fragment>
        {/* <Navbar color="light" light>
          <NavbarBrand href="/">Vonage Video PoserNet</NavbarBrand>
        </Navbar> */}

      <div className="container-fluid">
        {username ? this.showVideoChat() : this.showLoginSection()}
      </div>
      </React.Fragment>
    );
  }
}

export default App;

