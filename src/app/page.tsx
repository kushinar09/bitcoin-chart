import { Header } from "@/components/header"
import { InfoSection } from "@/components/detail"
import { Chart } from "@/components/chart"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 p-4 md:p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-7">
          <div className="order-2 lg:order-1 lg:col-span-2">
            <InfoSection />
          </div>
          <div className="order-1 lg:order-2 lg:col-span-5">
            <div className="rounded-lg border bg-card p-4 md:p-6">
              <Chart />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
