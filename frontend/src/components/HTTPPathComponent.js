import React, { useState, useEffect } from 'react';
import axios from 'axios';

const HTTPPathComponent = () => {
    const [message, setMessage] = useState('');
    const [models, setModels] = useState([]);
    const [videos, setVideos] = useState([]);
    const [selectedModel, setSelectedModel] = useState('');
    const [selectedVideo, setSelectedVideo] = useState('');
    const [selectedoutputName, setSelectoutputName] =useState('');
    useEffect(() => {
        const fetchModelsAndVideos = async () => {
            try {
                const modelsResponse = await axios.get('http://192.168.1.155:5000/models');
                setModels(modelsResponse.data);

                const videosResponse = await axios.get('http://192.168.1.155:5000/list_uploaded_videos');
                setVideos(videosResponse.data);
            } catch (error) {
                console.error('Failed to fetch data:', error);
            }
        };

        fetchModelsAndVideos();
    }, []);

    const uploadFilePath = async () => {
        if (!selectedVideo) {
            setMessage('Please select a video.');
            return;
        }

        if (!selectedModel) {
            setMessage('Please select a model.');
            return;
        }

        // İşleme başladığını kullanıcıya bildirin
        setMessage('Video is processing...');

        try {
            const response = await fetch('http://192.168.1.155:5000/upload_path', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ file_path: `videos/${selectedVideo}`, model: selectedModel, output: selectedoutputName }),
            });

            const result = await response.text();
            setMessage(result);  // İşlem sonucu mesajını gösterin
        } catch (error) {
            setMessage('An error occurred during the processing.');
            console.error('Error during video processing:', error);
        }
    };

    return (
        <div>
            <select value={selectedVideo} onChange={(e) => setSelectedVideo(e.target.value)}>
                <option value="" disabled>Select a video</option>
                {videos.map((video) => (
                    <option key={video} value={video}>{video}</option>
                ))}
            </select>
            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
                <option value="" disabled>Select a model</option>
                {models.map((model) => (
                    <option key={model} value={model}>{model}</option>
                ))}
            </select>
            <input
                type="text"
                value={selectedoutputName}
                onChange={(e) => setSelectoutputName(e.target.value)}
            />

            <button onClick={uploadFilePath}>Process Video</button>
            {message && <p>{message}</p>}
        </div>
    );
};

export default HTTPPathComponent;