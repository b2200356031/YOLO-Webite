import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './components/Home';
import WebSocketComponent from './components/WebSocketComponent';
import HTTPComponent from './components/HTTPComponent';
import HTTPPathComponent from './components/HTTPPathComponent';
import PlayVideo from "./components/PlayVideo";
import './App.css'
function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/camera" element={<WebSocketComponent />} />
            <Route path="/upload" element={<HTTPComponent />} />
            <Route path="/upload_path" element={<HTTPPathComponent />} />
            <Route path="/play-video" element={<PlayVideo/>} />
          </Routes>
        </header>
      </div>
    </Router>
  );
}
export default App;