import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function EnergyChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    // In a real application, you would fetch this from /api/metrics
    // For now, we'll provide some dummy data to render the chart
    setData([
      { timestamp: "12 AM", power_kw: 1.2 },
      { timestamp: "4 AM", power_kw: 0.8 },
      { timestamp: "8 AM", power_kw: 3.4 },
      { timestamp: "12 PM", power_kw: 4.1 },
      { timestamp: "4 PM", power_kw: 2.5 },
      { timestamp: "8 PM", power_kw: 5.2 },
      { timestamp: "11 PM", power_kw: 2.1 },
    ] as any);
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Energy Usage (Last 24 Hours)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Line type="monotone" dataKey="power_kw" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
