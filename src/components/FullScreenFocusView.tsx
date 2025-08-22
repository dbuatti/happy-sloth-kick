import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { CheckCircle2 } from 'lucide-react';

interface FullScreenFocusViewProps {
  taskDescription: string;
  onClose: () => void;
  onMarkDone: () => void;
}

const FullScreenFocusView: React.FC<FullScreenFocusViewProps> = ({ taskDescription, onClose, onMarkDone }) => {
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

  const handleMarkDoneClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the background onClick from firing
    onMarkDone();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-8 bg-accent"
      onClick={onClose}
    >
      <div className="flex-grow flex items-center justify-center">
        <h1 className="text-5xl md:text-7xl font-extrabold text-accent-foreground text-center">
          {taskDescription}
        </h1>
      </div>
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <Button
          size="lg"
          onClick={handleMarkDoneClick}
          className="h-14 px-8 text-lg bg-primary/80 hover:bg-primary text-primary-foreground backdrop-blur-sm"
        >
          <CheckCircle2 className="mr-2 h-6 w-6" />
          Mark Done
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default FullScreenFocusView;