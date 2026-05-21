import { motion } from 'framer-motion'
import { type ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
}

const variants = {
  initial: { opacity: 0, y: 20, filter: 'blur(8px)' },
  enter: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    y: -10,
    filter: 'blur(8px)',
    transition: { duration: 0.35, ease: [0.65, 0, 0.35, 1] },
  },
}

export default function PageTransition({ children, className = '' }: Props) {
  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  )
}
