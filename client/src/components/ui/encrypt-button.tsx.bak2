"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const TARGET_TEXT = "Storarc";
const CYCLES_PER_LETTER = 2;
const SHUFFLE_TIME = 50;

const CHARS = "!@#$%^&*():{};|,.<>/?";

interface EncryptButtonProps {
  children: string;
  onClick?: () => void;
  className?: string;
}

export function EncryptButton({
  children,
  onClick,
  className = "",
}: EncryptButtonProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [text, setText] = useState(children);
  const [isHovered, setIsHovered] = useState(false);

  const scramble = () => {
    let pos = 0;

    intervalRef.current = setInterval(() => {
      const scrambled = children
        .split("")
        .map((char, index) => {
          if (pos / CYCLES_PER_LETTER > index) {
            return char;
          }

          const randomCharIndex = Math.floor(Math.random() * CHARS.length);
          const randomChar = CHARS[randomCharIndex];

          return randomChar;
        })
        .join("");

      setText(scrambled);
      pos++;

      if (pos >= children.length * CYCLES_PER_LETTER) {
        stopScramble();
      }
    }, SHUFFLE_TIME);
  };

  const stopScramble = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setText(children);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <motion.button
      whileHover={{ scale: 1.025 }}
      whileTap={{ scale: 0.975 }}
      onMouseEnter={() => {
        setIsHovered(true);
        scramble();
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        stopScramble();
      }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-lg ${className}`}
    >
      <span className="relative z-10 font-medium">{text}</span>
    </motion.button>
  );
}
