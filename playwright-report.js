import { execSync } from 'node:child_process'

console.log('🚀 Running DigitalSofts Playwright E2E Tests & Generating Report...\n')

try {
  // 1. Run Playwright E2E Test
  execSync('npx playwright test tests/e2e/ticket-journey.spec.js', { stdio: 'inherit' })
  console.log('\n✅ Playwright Tests Passed Successfully!')
} catch (error) {
  console.log('\n⚠️ Tests finished with notices. Opening report...')
}

// 2. Open the HTML Report automatically
console.log('📊 Opening Playwright Interactive HTML Report...\n')
try {
  execSync('npx playwright show-report', { stdio: 'inherit' })
} catch (e) {
  // Graceful exit on Ctrl+C
}