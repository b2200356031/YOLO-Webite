import React, { useEffect, useState } from 'react';
import axios from 'axios';

function PlayVideo() {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState('');

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await axios.get('http://192.168.1.155:5000/list_videos');
        setVideos(response.data);
      } catch (error) {
        console.error('Error fetching video list:', error);
      }
    };

    fetchVideos();
  }, []);

  const handleVideoChange = (event) => {
    setSelectedVideo(event.target.value);
  };

  return (
    <div>
      <h1>Play Video</h1>
      {videos.length > 0 ? (
        <>
          <select onChange={handleVideoChange} value={selectedVideo}>
            <option value="" disabled>Select a video</option>
            {videos.map((video, index) => (
              <option key={index} value={video}>{video}</option>
            ))}
          </select>
          {selectedVideo && (
            <div>
              <video controls width="600">
                <source src={`http://192.168.1.155:5000${selectedVideo}`} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          )}
        </>
      ) : (
        <p>No videos available.</p>
      )}
    </div>
  );
}

export default PlayVideo;
