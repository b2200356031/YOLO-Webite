import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

function Home() {
  const [file, setFile] = useState(null);
  const [file1, setFile1] = useState(null);
  const [message, setMessage] = useState('');
  const [messageV, setMessageV] = useState('');
  const navigate = useNavigate();

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

    const handleFileChange1 = (event) => {
    setFile1(event.target.files[0]);
  };

  const handlePlayVideo = () => {
    navigate('/play-video');

  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);



    try {
      const response = await axios.post('http://192.168.1.155:5000/upload_model', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setMessage(response.data);
    } catch (error) {
      setMessage('Failed to upload the file.');
    }
  };

  const handleUploadVideo = async () => {
    if (!file1) {
      setMessageV('Please select a video file first.');
      return;
    }

    const formData1 = new FormData();
    formData1.append('file1', file1);

    try {
      const response = await axios.post('http://192.168.1.155:5000/upload_video', formData1, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setMessageV(response.data);
    } catch (error) {
      setMessageV('Failed to upload the video file.');
    }
  };

  return (
      <div>
          <h1>Welcome to YOLOv8 Video Stream Processing</h1>
          <Link to="/camera">
              <button>Start Webcam</button>
          </Link>
          <Link to="/upload_path">
              <button>Video Processing</button>
          </Link>

          <div>
              <button onClick={handlePlayVideo}>Play Video</button>
          </div>
          <div>
              <h2>Upload Your Model (.pt)</h2>
              <input type="file" onChange={handleFileChange} accept=".pt"/>
              <button onClick={handleUpload}>Upload Model</button>
              {message && <p>{message}</p>}
          </div>

          <div>
              <h2>Upload Your Video File</h2>
              <input type="file" onChange={handleFileChange1} accept=".mp4"/>
              <button onClick={handleUploadVideo}>Upload Video</button>
              {messageV && <p>{messageV}</p>}
          </div>

      </div>
  );
}

export default Home;