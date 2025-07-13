import React from 'react';
import { ArrowLeft } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';

export default function AnimatedBackButton({ onClick, disabled = false }) {
  return (
    <motion.button 
      onClick={onClick}
      className="back-button"
      disabled={disabled}
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <ArrowLeft size={20} color="white" />
    </motion.button>
  );
}