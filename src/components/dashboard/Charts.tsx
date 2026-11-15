import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import type { Experiment, SeriesPoint } from '../../lib/api'
import { UNITS } from '../../lib/api'
import {
  average,
  colorOf,
  fmt,
  labelOf,
  labelWithUnit,
  numOf,
  numericKeys,
  unitOf,
  uniqueValues,
  valueOf,
} from '../../lib/dashboard'
import { AXIS, BLUE, FLAME, GRID, TICK, TOOLTIP, axisLabel } from './chartTheme'
import ChartCard, { EmptyNote } from './ChartCard'
import Select from './Select'

// ---------- flame size + temperature over time (also used by the drawer) ----------
export function SeriesChart({ series }: { series?: SeriesPoint[] }) {
  if (!series || series.length === 0) return <EmptyNote text="No time-series for this experiment." />
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={series} margin={{ top: 8, right: 8, bottom: 22, left: 4 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
        <XAxis dataKey="time" tick={TICK} stroke={AXIS} label={axisLabel(labelWithUnit('time'), 'bottom')} />
        <YAxis
          yAxisId="size"
          tick={TICK}
          stroke={AXIS}
          width={48}
          label={axisLabel(labelWithUnit('flameSize'), 'left', FLAME)}
        />
        <YAxis
          yAxisId="temp"
          orientation="right"
          tick={TICK}
          stroke={AXIS}
          width={52}
          label={axisLabel(labelWithUnit('temperature'), 'right', BLUE)}
        />
        <Tooltip
          contentStyle={TOOLTIP}
          labelStyle={{ color: '#E8ECF4' }}
          labelFormatter={(v) => 't = ' + v + ' ' + UNITS.time}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
        <Line
          yAxisId="size"
          type="monotone"
          dataKey="flameSize"
          name={labelOf('flameSize')}
          stroke={FLAME}
          strokeWidth={2}
          dot={false}
        />
        <Line
          yAxisId="temp"
          type="monotone"
          dataKey="temperature"
          name={labelOf('temperature')}
          stroke={BLUE}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function LineChartCard({ experiments }: { experiments: Experiment[] }) {
  const [id, setId] = useState('')
  const current =
    experiments.find((e) => e.id === id) ?? experiments.find((e) => e.series?.length) ?? experiments[0]

  return (
    <ChartCard
      title="Flame over time"
      controls={
        <Select
          label="Experiment"
          value={current?.id ?? ''}
          onChange={setId}
          options={experiments.map((e) => ({ value: e.id, label: e.id + ' - ' + e.title }))}
          className="w-56 max-w-full"
        />
      }
    >
      <SeriesChart series={current?.series} />
    </ChartCard>
  )
}

// ---------- bar chart: average metric grouped by a field ----------
const GROUPS = ['gravityLevel', 'fuel', 'flameType']

export function BarChartCard({ experiments }: { experiments: Experiment[] }) {
  const metrics = numericKeys(experiments)
  const [metricState, setMetric] = useState('spreadRate')
  const [group, setGroup] = useState('gravityLevel')
  const metric = metrics.includes(metricState) ? metricState : metrics[0]

  const data = metric
    ? uniqueValues(experiments, group)
        .map((g) => ({
          group: g,
          value: average(experiments.filter((e) => valueOf(e, group) === g).map((e) => numOf(e, metric))),
        }))
        .filter((d): d is { group: string; value: number } => d.value !== undefined)
    : []

  return (
    <ChartCard
      title="Average by group"
      controls={
        <>
          <Select
            label="Metric"
            value={metric ?? ''}
            onChange={setMetric}
            options={metrics.map((k) => ({ value: k, label: labelOf(k) }))}
            className="w-40"
          />
          <Select
            label="Group by"
            value={group}
            onChange={setGroup}
            options={GROUPS.map((k) => ({ value: k, label: labelOf(k) }))}
            className="w-36"
          />
        </>
      }
    >
      {data.length === 0 ? (
        <EmptyNote text="No data for this metric in the current selection." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 22, left: 4 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="group" tick={TICK} stroke={AXIS} label={axisLabel(labelOf(group), 'bottom')} />
            <YAxis
              tick={TICK}
              stroke={AXIS}
              width={52}
              label={axisLabel(labelWithUnit(metric), 'left')}
            />
            <Tooltip
              contentStyle={TOOLTIP}
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              formatter={(v) => [fmt(Number(v), 2) + ' ' + unitOf(metric), 'Average']}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.group} fill={colorOf(d.group)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}

// ---------- scatter chart: any numeric field vs any other ----------
interface Point {
  x: number
  y: number
  id: string
  title: string
  gravity: string
}

function ScatterTip({
  active,
  payload,
  xKey,
  yKey,
}: {
  active?: boolean
  payload?: { payload: Point }[]
  xKey: string
  yKey: string
}) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div style={TOOLTIP} className="px-3 py-2">
      <div className="font-mono text-[11px] text-flame">{p.id}</div>
      <div>{p.title}</div>
      <div className="mt-1 text-muted">
        {labelOf(xKey)}: {fmt(p.x, 2)} {unitOf(xKey)}
      </div>
      <div className="text-muted">
        {labelOf(yKey)}: {fmt(p.y, 2)} {unitOf(yKey)}
      </div>
    </div>
  )
}

function pointId(p: unknown): string | undefined {
  const o = p as { id?: string; payload?: { id?: string } }
  return o.id ?? o.payload?.id
}

export function ScatterChartCard({
  experiments,
  onOpen,
  className = '',
}: {
  experiments: Experiment[]
  onOpen: (id: string) => void
  className?: string
}) {
  const keys = numericKeys(experiments)
  const [xState, setX] = useState('oxygenPercent')
  const [yState, setY] = useState('spreadRate')
  const xKey = keys.includes(xState) ? xState : keys[0]
  const yKey = keys.includes(yState) ? yState : (keys[1] ?? keys[0])

  const points: Point[] = []
  if (xKey && yKey) {
    for (const e of experiments) {
      const x = numOf(e, xKey)
      const y = numOf(e, yKey)
      if (x !== undefined && y !== undefined) {
        points.push({ x, y, id: e.id, title: e.title, gravity: e.gravityLevel })
      }
    }
  }
  const groups = [...new Set(points.map((p) => p.gravity))].sort()
  const options = keys.map((k) => ({ value: k, label: labelOf(k) }))

  return (
    <ChartCard
      className={className}
      title="Compare two measurements"
      controls={
        <>
          <Select label="X axis" value={xKey ?? ''} onChange={setX} options={options} className="w-40" />
          <Select label="Y axis" value={yKey ?? ''} onChange={setY} options={options} className="w-40" />
        </>
      }
    >
      {points.length === 0 ? (
        <EmptyNote text="Not enough numeric data to plot." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 16, bottom: 22, left: 4 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name={labelOf(xKey)}
              domain={['auto', 'auto']}
              tick={TICK}
              stroke={AXIS}
              label={axisLabel(labelWithUnit(xKey), 'bottom')}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={labelOf(yKey)}
              domain={['auto', 'auto']}
              tick={TICK}
              stroke={AXIS}
              width={52}
              label={axisLabel(labelWithUnit(yKey), 'left')}
            />
            <ZAxis range={[90, 90]} />
            <Tooltip content={<ScatterTip xKey={xKey} yKey={yKey} />} cursor={{ strokeDasharray: '3 3' }} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
            {groups.map((g) => (
              <Scatter
                key={g}
                name={g}
                data={points.filter((p) => p.gravity === g)}
                fill={colorOf(g)}
                onClick={(p: unknown) => {
                  const id = pointId(p)
                  if (id) onOpen(id)
                }}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}