import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload as UploadIcon, FileVideo, X, Loader2, Play, Image, Sparkles } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// Auto-capture a frame from video at ~1 second and return a Blob
const generateThumbnailFromVideo = (file) => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.muted = true;

    video.onloadedmetadata = () => {
      // Seek to 1 second (or 10% of duration if shorter)
      video.currentTime = Math.min(1, video.duration * 0.1);
    };

    video.onseeked = () => {
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(video.src);
          resolve(blob);
        },
        'image/jpeg',
        0.85
      );
    };

    video.onerror = () => resolve(null);
  });
};

const Upload = () => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Entertainment');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [thumbnail, setThumbnail] = useState(null);       // Blob for auto-generated
  const [thumbPreview, setThumbPreview] = useState(null); // URL for preview
  const [customThumb, setCustomThumb] = useState(null);   // File for custom upload
  const thumbInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile || !selectedFile.type.startsWith('video/')) {
      toast.error('Please select a valid video file');
      return;
    }
    setFile(selectedFile);
    if (!title) setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));

    // Auto-generate thumbnail
    toast.loading('Generating thumbnail...', { id: 'thumb' });
    const blob = await generateThumbnailFromVideo(selectedFile);
    if (blob) {
      setThumbnail(blob);
      setThumbPreview(URL.createObjectURL(blob));
      toast.success('Thumbnail generated!', { id: 'thumb' });
    } else {
      toast.dismiss('thumb');
    }
  };

  const handleCustomThumb = (e) => {
    const img = e.target.files[0];
    if (!img || !img.type.startsWith('image/')) {
      toast.error('Please select a valid image');
      return;
    }
    setCustomThumb(img);
    setThumbPreview(URL.createObjectURL(img));
    setThumbnail(null); // use custom instead
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Please select a video');

    setUploading(true);
    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);

    // Attach thumbnail — custom takes priority, else auto-generated blob
    if (customThumb) {
      formData.append('thumbnail', customThumb, 'thumbnail.jpg');
    } else if (thumbnail) {
      formData.append('thumbnail', thumbnail, 'thumbnail.jpg');
    }

    try {
      const { data } = await api.post('/videos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(pct);
        },
      });

      if (data.success) {
        toast.success('Video uploaded successfully!');
        navigate('/');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="pt-24 px-6 md:px-12 max-w-5xl mx-auto mb-20">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-purple-600/20 rounded-2xl text-purple-500">
          <UploadIcon size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Upload Video</h1>
          <p className="text-gray-400">Share your content with the PRISM community</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left — File + Thumbnail */}
        <div className="space-y-6">
          {/* Video Dropzone */}
          {!file ? (
            <label className="border-2 border-dashed border-white/10 hover:border-purple-500/50 hover:bg-white/5 transition-all rounded-3xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer min-h-[240px]">
              <input type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-gray-500">
                <FileVideo size={40} />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold">Click to select a video</p>
                <p className="text-gray-500 text-sm mt-1">MP4, WebM or Ogg (Max 500MB)</p>
              </div>
            </label>
          ) : (
            <div className="border border-white/10 bg-white/5 rounded-3xl p-5 relative">
              <button
                onClick={() => { setFile(null); setThumbnail(null); setThumbPreview(null); setCustomThumb(null); }}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-gray-400"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-purple-600/20 rounded-2xl flex items-center justify-center text-purple-500 flex-shrink-0">
                  <Play size={22} fill="currentColor" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-white font-medium truncate">{file.name}</p>
                  <p className="text-gray-500 text-sm">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>
            </div>
          )}

          {/* Thumbnail Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400 font-medium">Thumbnail</p>
              {thumbPreview && (
                <button
                  type="button"
                  onClick={() => thumbInputRef.current?.click()}
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
                >
                  <Image size={12} /> Change
                </button>
              )}
            </div>

            {thumbPreview ? (
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10">
                <img src={thumbPreview} alt="thumbnail preview" className="w-full h-full object-cover" />
                {!customThumb && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-purple-600/80 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                    <Sparkles size={10} /> Auto-generated
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => thumbInputRef.current?.click()}
                    className="bg-black/70 hover:bg-black/90 text-white text-[10px] px-2 py-1 rounded-full transition-all"
                  >
                    Upload custom
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => thumbInputRef.current?.click()}
                className="w-full aspect-video rounded-2xl border-2 border-dashed border-white/10 hover:border-purple-500/40 hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-2 text-gray-500"
              >
                <Image size={28} />
                <span className="text-sm">Upload a thumbnail image</span>
                <span className="text-xs">Select a video first for auto-generation</span>
              </button>
            )}
            <input
              ref={thumbInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleCustomThumb}
            />
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Uploading...</span>
                <span className="text-purple-400 font-bold">{progress}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-600 to-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right — Details Form */}
        <form onSubmit={handleUpload} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm text-gray-400 ml-1">Video Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-purple-500/50 transition-all"
              placeholder="e.g. My Awesome Video"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400 ml-1">Description</label>
            <textarea
              rows="4"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-purple-500/50 transition-all resize-none"
              placeholder="What's your video about?"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400 ml-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-purple-500/50 transition-all"
            >
              <option>Entertainment</option>
              <option>Gaming</option>
              <option>Education</option>
              <option>Music</option>
              <option>Tech</option>
              <option>Vlogs</option>
              <option>Other</option>
            </select>
          </div>

          <button
            disabled={uploading || !file}
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Uploading to Drive... {progress}%
              </>
            ) : (
              'Publish Video'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Upload;
