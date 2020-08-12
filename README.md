# Multiplayer Posing game using Vonage Video and TensorFlow PoseNet

Using combination of TensorFlow PoseNet, Vonage Video API, and Websockets to create a multiplayer "Simon Says" posing game

## Setting your OpenTok apiKey, sessionId and token

Before you can run this application you need to modify make a copy of [config.js.template](src/config.js.template), rename it config.js and include your OpenTok API Key, Session ID and a valid token or set your server URL. For more details on how to get these values see [Token creation
overview](https://tokbox.com/opentok/tutorials/create-token/).

## Running the App

Create a copy of `config.js.template` file and fill with your Vonage Video credentials

Rename as config.js

Run `npm install` to install required modules
Run `npm start` to start the application

