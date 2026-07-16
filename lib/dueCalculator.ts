import { Prisma } from "@prisma/client"

type FeeSetup = Prisma.FeeSetupGetPayload<{}>

// Helper to strip time and timezone, comparing strictly by Calendar Days
function stripTime(date: Date): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export function calculateDues(joinDate: Date, setups: FeeSetup[], payments: any[]) {
  let totalExpected = 0
  let totalFines = 0
  let totalPaid = 0
  
  // Strip time from 'now' to prevent UTC offset issues
  const now = stripTime(new Date())

  // 1. Sum up all payments made by the member
  const paymentsByType: Record<string, number> = {}
  for (const p of payments) {
    paymentsByType[p.type] = (paymentsByType[p.type] || 0) + Number(p.amount)
  }

  // 2. Group setups by Charge Type
  const setupsByType: Record<string, FeeSetup[]> = {}
  for (const s of setups) {
    if (!setupsByType[s.name]) setupsByType[s.name] = []
    setupsByType[s.name].push(s)
  }

  // 3. Calculate Expected Amount and Fines for each Charge Type
  for (const type in setupsByType) {
    totalPaid += paymentsByType[type] || 0
    
    // Sort setups chronologically
    const typeSetups = setupsByType[type].sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime())

    for (let i = 0; i < typeSetups.length; i++) {
      const setup = typeSetups[i]
      const nextSetup = typeSetups[i + 1]
      
      // Define the active period for this specific setup
      let periodStart = stripTime(new Date(Math.max(setup.effectiveDate.getTime(), joinDate.getTime())))
      let periodEnd = nextSetup ? stripTime(new Date(Math.min(nextSetup.effectiveDate.getTime(), now.getTime()))) : now

      if (periodStart > periodEnd) continue

      let currentCycle = new Date(periodStart.getTime())
      
      // Safety counter to prevent infinite loops
      let safetyCounter = 0 
      
      while (currentCycle <= periodEnd && safetyCounter < 500) {
        safetyCounter++
        
        totalExpected += Number(setup.amount)
        
        // Determine the Due Date for this specific cycle
        let dueDate = new Date(currentCycle.getTime())
        const dueDay = Number(setup.dueDay)
        
        if (setup.frequency === "WEEKLY") {
          const dayDiff = (dueDay - dueDate.getDay() + 7) % 7
          dueDate.setDate(dueDate.getDate() + dayDiff)
        } 
        else if (setup.frequency === "MONTHLY") {
          const daysInMonth = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate()
          dueDate.setDate(Math.min(dueDay, daysInMonth))
        } 
        else {
          dueDate.setDate(dueDate.getDate() + dueDay)
        }

        // Strip time from dueDate before comparing
        const cleanDueDate = stripTime(dueDate)

        // If current date is past the due date, apply the fine
        if (setup.hasFine && now > cleanDueDate) {
          totalFines += Number(setup.fineAmount || 0)
        }

        // Increment to the next cycle
        if (setup.frequency === "WEEKLY") currentCycle.setDate(currentCycle.getDate() + 7)
        else if (setup.frequency === "MONTHLY") currentCycle.setMonth(currentCycle.getMonth() + 1)
        else if (setup.frequency === "QUARTERLY") currentCycle.setMonth(currentCycle.getMonth() + 3)
        else if (setup.frequency === "HALF_YEARLY") currentCycle.setMonth(currentCycle.getMonth() + 6)
        else if (setup.frequency === "YEARLY") currentCycle.setFullYear(currentCycle.getFullYear() + 1)
        else break // "NA" is one-time, break after first iteration
      }
    }
  }

  const totalDue = (totalExpected + totalFines) - totalPaid
  
  return {
    totalExpected,
    totalFines,
    totalPaid,
    totalDue: totalDue > 0 ? totalDue : 0 
  }
}