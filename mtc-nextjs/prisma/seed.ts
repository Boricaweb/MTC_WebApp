import prisma from '../src/lib/prisma'
import fs from 'fs'
import path from 'path'

async function main() {
  console.log('Start seeding...')

  // Read data.json
  const dataPath = path.join(process.cwd(), 'public', 'data.json')
  
  if (!fs.existsSync(dataPath)) {
    console.log('No data.json found, skipping seed.')
    return
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8')
  const data = JSON.parse(rawData)

  // Seed Repairs
  if (data.repairs && Array.isArray(data.repairs)) {
    console.log(`Seeding ${data.repairs.length} repairs...`)
    // Delete existing to avoid duplicates on re-seed
    await prisma.repair.deleteMany()
    
    for (const repair of data.repairs) {
      await prisma.repair.create({
        data: {
          order: repair.order || '',
          reporter: repair.reporter || '',
          department: repair.department || '',
          channel: repair.channel || '',
          subject: repair.subject || '',
          floor: repair.floor || '',
          type: repair.type || '',
          dateReported: repair.dateReported || '',
          location: repair.location || '',
          status: repair.status || '',
          dateFixed: repair.dateFixed || '',
          photos: repair.photos || []
        }
      })
    }
  }

  // Seed WeeklyData
  if (data.weekly && Array.isArray(data.weekly)) {
    console.log(`Seeding ${data.weekly.length} weekly records...`)
    await prisma.weeklyData.deleteMany()
    
    for (const weekData of data.weekly) {
      await prisma.weeklyData.create({
        data: {
          month: weekData.month,
          weeks: weekData.weeks || [],
          cumulative: weekData.cumulative || {}
        }
      })
    }
  }

  // Seed AnalysisData
  if (data.analysis && Array.isArray(data.analysis)) {
    console.log(`Seeding ${data.analysis.length} analysis records...`)
    await prisma.analysisData.deleteMany()
    
    for (const analysis of data.analysis) {
      await prisma.analysisData.create({
        data: {
          month: analysis.month,
          departments: analysis.departments || [],
          repairTypes: analysis.repairTypes || [],
          totals: analysis.totals || {}
        }
      })
    }
  }

  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
