import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { PrivacyPolicyPage } from "./PrivacyPolicyPage"
import { PrivacyPolicyDocument } from "./PrivacyPolicyDocument"

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    className,
  }: {
    children: React.ReactNode
    to: string
    className?: string
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  useRouter: () => ({ navigate: vi.fn() }),
}))

describe("PrivacyPolicyDocument", () => {
  it("renders Indonesian headings by default and displays UU PDP reference", () => {
    render(<PrivacyPolicyDocument />)

    expect(screen.getByText("Status Dokumen Resmi")).toBeDefined()
    expect(
      screen.getByText(/Kepatuhan Regulasi Perlindungan Data Pribadi/i)
    ).toBeDefined()
    expect(
      screen.getByText("1. Pendahuluan & Identitas Pengendali Data")
    ).toBeDefined()
    expect(
      screen.getByText("2. Data Pribadi yang Kami Kumpulkan")
    ).toBeDefined()
  })

  it("switches to English when English toggle button is clicked", () => {
    render(<PrivacyPolicyDocument />)

    const enButton = screen.getByRole("button", { name: /^english$/i })
    fireEvent.click(enButton)

    expect(screen.getByText("Official Legal Document")).toBeDefined()
    expect(
      screen.getByText(
        /Regulatory Compliance \(Indonesian PDP Law No\. 27\/2022\)/i
      )
    ).toBeDefined()
    expect(
      screen.getByText("1. Introduction & Data Controller Identity")
    ).toBeDefined()
    expect(screen.getByText("2. Personal Data We Collect")).toBeDefined()
  })
})

describe("PrivacyPolicyPage", () => {
  it("renders header, main title, table of contents, and footer", () => {
    render(<PrivacyPolicyPage />)

    expect(screen.getByRole("heading", { level: 1 })).toBeDefined()
    expect(screen.getByText("Daftar Isi")).toBeDefined()
    expect(
      screen.getByText("Sekretariat Pengendali Data Pribadi")
    ).toBeDefined()
    expect(
      screen.getAllByText("privacy@sekkha.local").length
    ).toBeGreaterThanOrEqual(1)
  })

  it("allows switching language between Bahasa Indonesia and English", () => {
    render(<PrivacyPolicyPage />)

    const enButton = screen.getByRole("button", { name: /🇬🇧 English/i })
    fireEvent.click(enButton)

    expect(screen.getByText("Table of Contents")).toBeDefined()
    expect(screen.getByText("Data Controller Secretariat")).toBeDefined()
  })
})
