import { describe, it, expect } from "vitest"
import { getInitials } from "../initials"

describe("getInitials unified 2-character name initials", () => {
  it("formats multi-word and single-word names consistently into 2 uppercase initials", () => {
    expect(getInitials("Admin Sekkha")).toBe("AS")
    expect(getInitials("Suki")).toBe("SU")
    expect(getInitials("ferdinand")).toBe("FE")
    expect(getInitials("X")).toBe("X")
    expect(getInitials("Budi Santoso (Aktivis)")).toBe("BS")
    expect(getInitials("(Pengurus) Budi")).toBe("PB")
    expect(getInitials("")).toBe("U")
    expect(getInitials("   ", "MB")).toBe("MB")
    expect(getInitials("()", "MB")).toBe("MB")
    expect(getInitials(null, "M")).toBe("M")
    expect(getInitials(null, "MB")).toBe("MB")
  })
})
