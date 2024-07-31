"use client"

import React, { useState } from "react"
import { togetherApi } from "./together-api"

const Page: React.FC = () => {
  const [loading, setLoading] = useState(false)
  

  const fetchData = async () => {
    setLoading(true)
    await togetherApi({ message: "Hello" })
    setLoading(false)
  }

  return (
    <div>
      <button onClick={fetchData} disabled={loading}>
        {loading ? "Loading..." : "Fetch Data"}
      </button>
      <div>Test page</div>
    </div>
  )
}

export default Page
