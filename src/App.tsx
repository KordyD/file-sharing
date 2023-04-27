import './App.css';

import { initializeApp } from 'firebase/app';
import {
  DocumentData,
  DocumentReference,
  addDoc,
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { useState } from 'react';

function App() {
  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: 'AIzaSyA9vR1umGuZtLUffcQ2MtsHdztewJcinqc',
    authDomain: 'file-sharing-67c5c.firebaseapp.com',
    projectId: 'file-sharing-67c5c',
    storageBucket: 'file-sharing-67c5c.appspot.com',
    messagingSenderId: '765913523704',
    appId: '1:765913523704:web:c62150c3985e9c18e0620d',
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const servers = {
    iceServers: [
      {
        urls: [
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302',
        ],
      },
    ],
  };

  const pc = new RTCPeerConnection(servers);
  const [callerID, setCallerID] = useState('');

  const createConnection = async () => {
    const callDoc = doc(collection(db, 'calls'));
    const offerCandidates = collection(callDoc, 'offerCandidates');
    const answerCandidates = collection(callDoc, 'answerCandidates');
    setCallerID(callDoc.id);

    pc.onicecandidate = (event) => {
      event.candidate && addDoc(offerCandidates, event.candidate.toJSON());
    };

    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);
    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await setDoc(callDoc, { offer });
    onSnapshot(callDoc, (snapshot) => {
      const data = snapshot.data();
      if (!pc.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        pc.setRemoteDescription(answerDescription);
      }
    });
    onSnapshot(answerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.addIceCandidate(candidate);
        }
      });
    });
  };

  const [ansID, setAnsID] = useState('');

  const answerConnection = async () => {
    const callDoc: DocumentReference<DocumentData> = doc(
      collection(db, 'calls'),
      ansID
    );
    const offerCandidates = collection(callDoc, 'offerCandidates');

    const answerCandidates = collection(callDoc, 'answerCandidates');

    pc.onicecandidate = (event) => {
      event.candidate && addDoc(answerCandidates, event.candidate.toJSON());
    };

    const callData = (await getDoc(callDoc)).data();

    const offerDescription = callData!.offer;
    await pc.setLocalDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    const answer = {
      sdp: answerDescription.sdp,
      type: answerDescription.type,
    };

    await updateDoc(callDoc, { answer });

    onSnapshot(offerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          pc.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });
  };

  const [message, setMessage] = useState('');
  const [answer, setAnswer] = useState('');

  const dc = pc.createDataChannel('Channel');
  dc.onmessage = (event) => setAnswer(event.data);

  const sendMessage = () => {
    dc.send(message);
  };

  dc.onopen = () => console.log('connection opened!');

  return (
    <>
      <div>
        <button onClick={createConnection}>Offer connection</button>
        <p>Your ID: {callerID}</p>
        <button onClick={answerConnection}>Answer connection</button>
        <input
          placeholder='Input caller ID'
          onChange={(event) => setAnsID(event.target.value)}
        />
        <input
          placeholder='Your message'
          onChange={(event) => setMessage(event.target.value)}
        />
        <button onClick={sendMessage}>Send</button>
        <p>Answer: {answer}</p>
      </div>
    </>
  );
}

export default App;
