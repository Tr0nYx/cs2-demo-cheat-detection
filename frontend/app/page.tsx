'use client'

import React from 'react'
import { HeroSection } from '@/components/LandingPage/HeroSection'
import { FeaturesSection } from '@/components/LandingPage/FeaturesSection'
import { PublicMetricsSection } from '@/components/LandingPage/PublicMetricsSection'
import { Footer } from '@/components/LandingPage/Footer'

export default function LandingPage() {
  return (
    <div className="flex flex-col w-full min-h-screen bg-white dark:bg-gray-950">
      <HeroSection />
      <FeaturesSection />
      <PublicMetricsSection />
      <Footer />
    </div>
  )
}
