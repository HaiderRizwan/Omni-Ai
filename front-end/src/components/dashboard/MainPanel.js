import React from 'react';
import FormattedMessage from './ui/FormattedMessage';
import { motion, AnimatePresence } from 'framer-motion';
import ChatCreator from './tools/ChatCreator';
import ImageCreator from './tools/ImageCreator';
import VideoCreator from './tools/VideoCreator';
import AvatarCreator from './tools/AvatarCreator';
import AvatarVideoCreator from './tools/AvatarVideoCreator';
import APITest from './tools/APITest';
import Gallery from './tools/Gallery';
import ExploreGallery from './tools/exploregallery';
import AvatarGallery from './tools/Avatarsgallery';

const MainPanel = ({ 
  activeTool, 
  currentChat, 
  onChatUpdate, 
  onNewChat,
  avatarCollection,
  setAvatarCollection 
}) => {
  const toolComponents = {
    chat: ChatCreator,
    image: ImageCreator,
    video: VideoCreator,
    avatar: AvatarCreator,
    avatarVideo: AvatarVideoCreator,
    apiTest: APITest,
    gallery: Gallery,
    explore: ExploreGallery,
    avatarsGallery: AvatarGallery
  };

  const toolVariants = {
    initial: { opacity: 0, x: 20, scale: 0.95 },
    animate: { 
      opacity: 1, 
      x: 0, 
      scale: 1,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1]
      }
    },
    exit: { 
      opacity: 0, 
      x: -20, 
      scale: 0.95,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  };

  const ActiveComponent = toolComponents[activeTool];

  return (
    <div className="flex-1 bg-[#0b0b0f] relative overflow-hidden min-h-0">
      <AnimatePresence mode="wait">
        {ActiveComponent && (
          <motion.div
            key={activeTool}
            variants={toolVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="h-full flex flex-col min-h-0"
          >
            <ActiveComponent
              currentChat={currentChat}
              onChatUpdate={onChatUpdate}
              onNewChat={onNewChat}
              {...(activeTool === 'avatar' && { avatarCollection, onAddToCollection: (imageData, isAdded) => {
                // Handle adding to collection from avatar creator
                if (isAdded) {
                  setAvatarCollection(prev => [...prev, imageData]);
                } else {
                  setAvatarCollection(prev => prev.filter(item => item._id !== imageData._id));
                }
              }})}
              {...(activeTool === 'video' && { avatars: avatarCollection })}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-red-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-red-600/5 to-transparent rounded-full blur-3xl" />
      </div>
    </div>
  );
};

export default MainPanel;
