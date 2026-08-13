import styles from './App.module.css'

export default function App() {
  return (
    <div className={styles.app}>
      <main className={styles.card}>
        <h1 className={styles.title}>
          <span className={styles.accent}>CV</span> Builder
        </h1>
        <p className={styles.lead}>
          Toolchain scaffold. The multi-step form, skill manager and PDF template
          land in the phases described in docs/PLAN.md.
        </p>
      </main>
    </div>
  )
}
