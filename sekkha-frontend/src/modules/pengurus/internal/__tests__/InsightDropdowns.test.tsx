import { describe, it, expect, vi, afterEach } from "vitest"
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react"
import { InsightPage } from "../components/InsightPage"
import * as insightApi from "../api/insightApi"

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/pengurus/insight" }),
}))

vi.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children }: any) => <div>{children}</div>,
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}))

vi.mock("recharts", () => ({
  CartesianGrid: () => null,
  Dot: () => null,
  Line: () => null,
  LineChart: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const mockMetrics: insightApi.InsightMetricsResponse = {
  timeUnit: "year",
  isComparisonEnabled: false,
  segmentFilter: "all",
  eventCategoryFilter: "all",
  periodLabel: "2026",
  previousPeriodLabel: "2025",
  categoryLabel: "All",
  summary: {
    totalActiveMembers: { value: 42, deltaText: "+5%", isPositive: true, description: "vs last" },
    avgAttendanceRate: { value: "80%", deltaText: "+2%", isPositive: true, description: "vs last" },
    retentionRate: { value: "90%", deltaText: "+1%", isPositive: true, description: "vs last" },
    totalSevaSessions: { value: 12, deltaText: "+1", isPositive: true, description: "vs last" },
  },
  trendChartData: [],
  roleComparison: {
    umat: { totalCount: 30, avgAttendancePercent: 75, avgMonthlyEvents: 3, topStreak: 4, avgAbsenceRate: "10%" },
    aktivis: { totalCount: 8, avgAttendancePercent: 85, avgMonthlyEvents: 4, topStreak: 6, avgAbsenceRate: "5%" },
    pengurus: { totalCount: 4, avgAttendancePercent: 95, avgMonthlyEvents: 4, topStreak: 8, avgAbsenceRate: "2%" },
  },
  eventCategories: [],
  tenureBreakdown: [],
}

describe("InsightPage Dropdowns — Initial 5 + Infinite Scroll", () => {
  it("shows initial 5 options in Category dropdown and loads the 6th option on scroll", async () => {
    vi.spyOn(insightApi, "fetchInsightMetricsParams").mockResolvedValue(mockMetrics)

    render(<InsightPage />)

    await waitFor(() => {
      expect(insightApi.fetchInsightMetricsParams).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByRole("button", { name: /Category:/i }))

    const categoryList = screen.getByTestId("insight-category-scroll-list")
    expect(within(categoryList).getByText("Social Service / Care")).toBeDefined()
    expect(within(categoryList).queryByText("Sunday School / Youth")).toBeNull()

    Object.defineProperty(categoryList, "scrollHeight", { value: 260, configurable: true })
    Object.defineProperty(categoryList, "clientHeight", { value: 168, configurable: true })
    Object.defineProperty(categoryList, "scrollTop", { value: 85, configurable: true })
    fireEvent.scroll(categoryList)

    await waitFor(() => {
      expect(within(categoryList).getByText("Sunday School / Youth")).toBeDefined()
    })
  })
})

