import { motion } from 'motion/react'

export default function PlaceholderPage({ title, note }: { title: string; note: string }) {
  return (
    <section className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-5 pt-24 text-center">
      <motion.div
        className="glass p-10"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
      >
        <h1 className="text-4xl font-extrabold text-flame">{title}</h1>
        <p className="mt-3 text-muted">{note}</p>
      </motion.div>
    </section>
  )
}