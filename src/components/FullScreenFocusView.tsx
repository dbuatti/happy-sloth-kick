import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface FullScreenFocusViewProps {
  taskDescription: string;
  onClose: () => void;
}

const FullScreenFocusView: React.FC<FullScreenFocusViewProps> = ({ taskDescription, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-accent"
      onClick={onClose}
    >
      <h1 className="text-5xl md:text-7xl font-extrabold text-accent-foreground text-center">
        {taskDescription}
      </h1>
    </motion.div>
  );
};

export default FullScreenFocusView;