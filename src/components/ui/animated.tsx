import * as React from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

// Predefined animation variants
const variants = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  },
  fadeUp: {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
  },
  fadeDown: {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
  },
  slideRight: {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
  },
  slideLeft: {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
  },
  pop: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      transition: { type: "spring", stiffness: 400, damping: 25 } 
    },
  },
} as const;

type AnimationType = keyof typeof variants;

interface AnimatedProps {
  children: React.ReactNode;
  className?: string;
  animation?: AnimationType;
  delay?: number;
  duration?: number;
  custom?: Variants;
}

// Animated wrapper component
export const Animated = ({
  children,
  className,
  animation = "fadeUp",
  delay = 0,
  duration,
  custom,
}: AnimatedProps) => {
  const selectedVariant = custom || variants[animation];
  
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={selectedVariant}
      transition={{ delay, ...(duration && { duration }) }}
    >
      {children}
    </motion.div>
  );
};

// Stagger container for lists
interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  delayChildren?: number;
}

export const StaggerContainer = ({
  children,
  className,
  staggerDelay = 0.05,
  delayChildren = 0.1,
}: StaggerContainerProps) => {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: staggerDelay, delayChildren },
        },
      }}
    >
      {children}
    </motion.div>
  );
};

// Stagger item
interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
}

export const StaggerItem = ({ children, className }: StaggerItemProps) => {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
      }}
    >
      {children}
    </motion.div>
  );
};

// Page transition wrapper
interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export const PageTransition = ({ children, className }: PageTransitionProps) => {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
};

// Hover card wrapper with lift effect
interface HoverCardWrapperProps {
  children: React.ReactNode;
  className?: string;
  liftAmount?: number;
}

export const HoverCardWrapper = ({
  children,
  className,
  liftAmount = 4,
}: HoverCardWrapperProps) => {
  return (
    <motion.div
      className={cn("cursor-pointer", className)}
      whileHover={{
        y: -liftAmount,
        boxShadow: "0 10px 20px -5px hsl(220 14% 10% / 0.1)",
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
};

// Animated presence wrapper for conditional rendering
interface AnimatedPresenceWrapperProps {
  children: React.ReactNode;
  isVisible: boolean;
  animation?: AnimationType;
}

export const AnimatedPresenceWrapper = ({
  children,
  isVisible,
  animation = "fadeUp",
}: AnimatedPresenceWrapperProps) => {
  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="animated-content"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={variants[animation]}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Animated counter
interface AnimatedCounterProps {
  value: number;
  className?: string;
  duration?: number;
}

export const AnimatedCounter = ({
  value,
  className,
  duration = 1,
}: AnimatedCounterProps) => {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      key={value}
      transition={{ duration: 0.3 }}
    >
      {value}
    </motion.span>
  );
};

// Pulse animation wrapper
interface PulseWrapperProps {
  children: React.ReactNode;
  className?: string;
  isActive?: boolean;
}

export const PulseWrapper = ({
  children,
  className,
  isActive = true,
}: PulseWrapperProps) => {
  return (
    <motion.div
      className={className}
      animate={
        isActive
          ? {
              boxShadow: [
                "0 0 0 0 hsl(270 70% 55% / 0.4)",
                "0 0 20px 4px hsl(270 70% 55% / 0.2)",
                "0 0 0 0 hsl(270 70% 55% / 0)",
              ],
            }
          : {}
      }
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
};

// Skeleton with shimmer
interface ShimmerProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export const Shimmer = ({ className, width, height }: ShimmerProps) => {
  return (
    <motion.div
      className={cn("rounded-md bg-muted", className)}
      style={{ width, height }}
      animate={{
        backgroundPosition: ["200% 0", "-200% 0"],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "linear",
      }}
      initial={{
        background: "linear-gradient(90deg, hsl(var(--muted)) 0%, hsl(var(--muted) / 0.5) 50%, hsl(var(--muted)) 100%)",
        backgroundSize: "200% 100%",
      }}
    />
  );
};

export { AnimatePresence };