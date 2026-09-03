export async function register() {
  // Only run on server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeScheduler } = await import('@/lib/scheduler/engine')
    await initializeScheduler()
  }
}
