import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';

const WebSocketComponent = () => {
  const webcamRef = useRef(null);
  const ws = useRef(null);
  const [processedImageSrc, setProcessedImageSrc] = useState(null);

  useEffect(() => {
    const wsUrl = 'ws://192.168.1.131:5000/ws'; // Yerel IP adresinizi buraya yazın
    ws.current = new WebSocket(wsUrl);
    ws.current.onopen = () => {
      console.log('WebSocket connection opened');
    };
    ws.current.onmessage = (event) => {
      const blob = new Blob([event.data], { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      setProcessedImageSrc(url);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.current.onclose = () => {
      console.log('WebSocket connection closed');
    };

    return () => {
      ws.current.close();
    };
  }, []);

  const captureFrame = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      fetch(imageSrc)
        .then((res) => res.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.readAsArrayBuffer(blob);
          reader.onloadend = () => {
            ws.current.send(reader.result);
          };
        });
    }
  };

  useEffect(() => {
    const interval = setInterval(captureFrame, 100); //Her 100ms'de frame yakala
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width={640}
        height={480}
      />
      <div>
        {processedImageSrc && <img src={processedImageSrc} alt="Processed" />}
      </div>
    </div>
  );
};

export default WebSocketComponent;