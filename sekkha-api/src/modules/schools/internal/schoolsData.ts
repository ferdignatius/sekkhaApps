export interface MasterSchoolItem {
  name: string
  type: "SMP" | "SMA/SMK" | "Universitas" | "Umum"
}

export const SEED_SCHOOLS: MasterSchoolItem[] = [
  { name: "SMP Strada Bakti Mulia", type: "SMP" },
  { name: "SMP Negeri 1", type: "SMP" },
  { name: "SMK Bina Mandiri", type: "SMA/SMK" },
  { name: "Umum", type: "Umum" },
  { name: "Universitas Bunda Mulia", type: "Universitas" },
  { name: "Universitas Bina Nusantara", type: "Universitas" },
  { name: "Universitas Buddhi Dharma", type: "Universitas" },
]
